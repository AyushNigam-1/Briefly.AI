import os
import time
import mimetypes
import tempfile
import requests

from io import BytesIO
from PIL import Image, ImageOps
import cv2
import fitz  # PyMuPDF

from dotenv import load_dotenv
from google import genai
from google.genai import types

from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from utils.websocket_manager import manager
from controllers.db.prompt import get_prompt_by_user
from controllers.db.summary import save_summary_to_mongo, fetch_existing_summary
from controllers.db.conn import fs
from utils.llm import llm
from utils.common import split_content

load_dotenv()

# ------------------------------------------------------------------
# ENV
# ------------------------------------------------------------------

OCRSPACE_API_KEY = os.getenv("ocrspace_api_key")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if GOOGLE_API_KEY:
    client = genai.Client(api_key=GOOGLE_API_KEY)

# ------------------------------------------------------------------
# OCR (image fallback)
# ------------------------------------------------------------------

def extract_text_with_ocrspace(image_path: str) -> str:
    url = "https://api.ocr.space/parse/image"
    with open(image_path, "rb") as image_file:
        response = requests.post(
            url,
            files={"file": image_file},
            data={"apikey": OCRSPACE_API_KEY, "language": "eng"},
        )

    response.raise_for_status()
    result = response.json()

    if result.get("IsErroredOnProcessing"):
        raise ValueError(result.get("ErrorMessage", ["OCR failed"])[0])

    return result.get("ParsedResults", [{}])[0].get("ParsedText", "").strip()

# ------------------------------------------------------------------
# Text cleanup (LCEL, no legacy chains)
# ------------------------------------------------------------------

def correct_summary(summary: str, lang: str) -> str:
    prompt = PromptTemplate(
        template=(
            "Clean and refine the following text:\n\n"
            "{summary}\n\n"
            "Rules:\n"
            "1. Remove ads, links, metadata, noise\n"
            "2. Preserve only core content\n"
            "3. Improve clarity and flow\n"
            "4. Output strictly in {language}"
        ),
        input_variables=["summary", "language"],
    )

    chain = prompt | llm | StrOutputParser()

    return chain.invoke({
        "summary": summary,
        "language": lang,
    })

# ------------------------------------------------------------------
# Main
# ------------------------------------------------------------------

async def get_file_summary(
    url,
    file,
    lang: str,
    format: str,
    title: str,
    current_user: dict,
):
    try:
        await manager.send_message({"progress": 10, "message": "Processing started"})
        user_id = str(current_user["user_id"])

        if not file or not hasattr(file, "read"):
            raise ValueError("Invalid file instance")

        mime_type = mimetypes.guess_type(file.filename)[0]

        cached = await fetch_existing_summary(user_id, file.filename, manager)
        if cached:
            return cached

        file_stream = file.file
        extracted_text = ""
        think_part = ""

        # --------------------------------------------------------------
        # VIDEO
        # --------------------------------------------------------------

        if mime_type and mime_type.startswith("video"):
            type = "Video"

            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_video:
                temp_video.write(file_stream.read())
                video_path = temp_video.name

            cap = cv2.VideoCapture(video_path)
            success, frame = cap.read()
            cap.release()

            if not success:
                raise ValueError("Failed to extract video frame")

            thumbnail_path = video_path.replace(".mp4", ".jpg")
            cv2.imwrite(thumbnail_path, frame)

            video_file = client.files.upload(file=video_path)
            thumbnail_file = client.files.upload(file=thumbnail_path)

            while True:
                status = client.files.get(name=video_file.name)
                if status.state.name == "ACTIVE":
                    break
                if status.state.name == "FAILED":
                    raise ValueError("Video processing failed")
                time.sleep(2)

            response = client.models.generate_content(
                model="models/gemini-1.5-pro",
                contents=[
                    "Summarize the key events and main points from this video.",
                    video_file,
                ],
            )

            main_part = response.text

            with open(thumbnail_path, "rb") as f:
                file_id = fs.put(f, filename=os.path.basename(thumbnail_path))

            file_url = f"files/?id={file_id}"

        # --------------------------------------------------------------
        # IMAGE
        # --------------------------------------------------------------

        elif mime_type and mime_type.startswith("image"):
            type = "Image"

            file_stream.seek(0)
            image = Image.open(file_stream)

            if image.mode == "RGBA":
                image = image.convert("RGB")

            image = ImageOps.contain(image, (1024, 1024))

            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=["Describe this image.", image],
            )

            main_part = response.text

            img_bytes = BytesIO()
            image.save(img_bytes, format="JPEG")
            img_bytes.seek(0)

            gridfs_file = fs.put(img_bytes, filename=file.filename)
            file_url = f"files/?id={gridfs_file}"

        # --------------------------------------------------------------
        # PDF
        # --------------------------------------------------------------

        elif mime_type == "application/pdf":
            type = "PDF"

            pdf_bytes = await file.read()

            fd, temp_pdf_path = tempfile.mkstemp(suffix=".pdf")
            os.close(fd)

            with open(temp_pdf_path, "wb") as f:
                f.write(pdf_bytes)

            doc = fitz.open(temp_pdf_path)
            pix = doc[0].get_pixmap()

            temp_img_path = temp_pdf_path.replace(".pdf", ".jpg")
            pix.save(temp_img_path)

            with open(temp_img_path, "rb") as f:
                thumb_id = fs.put(f, filename=file.filename.replace(".pdf", ".jpg"))

            file_url = f"files/?id={thumb_id}"

            response = client.models.generate_content(
                model="gemini-1.5-flash",
                contents=[
                    types.Part.from_bytes(
                        data=pdf_bytes,
                        mime_type="application/pdf",
                    ),
                    "Summarize this document.",
                ],
            )

            main_part = response.text

        else:
            raise ValueError("Unsupported file type")

        if not main_part:
            raise ValueError("No content generated")

        save_result = save_summary_to_mongo(
            user_id,
            file_url,
            url,
            main_part,
            think_part,
            extracted_text,
            title,
            type,
        )

        return save_result

    except Exception as e:
        await manager.send_message({
            "progress": 100,
            "message": f"Error: {str(e)}"
        })
        raise
