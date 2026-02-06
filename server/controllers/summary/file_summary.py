import os
import time
import mimetypes
import tempfile
from io import BytesIO
from PIL import Image, ImageOps
import cv2
import fitz
from dotenv import load_dotenv
from google import genai
from google.genai import types
from utils.websocket_manager import manager
from controllers.db.summary import save_summary_to_mongo, fetch_existing_summary
from controllers.db.conn import fs

load_dotenv()

# ------------------------------------------------------------------
# ENV
# ------------------------------------------------------------------

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if not GOOGLE_API_KEY:
    raise RuntimeError("GOOGLE_API_KEY missing")

client = genai.Client(api_key=GOOGLE_API_KEY)

# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def wait_for_file_active(file_obj, timeout=120):
    start = time.time()
    while True:
        status = client.files.get(name=file_obj.name)
        if status.state.name == "ACTIVE":
            return
        if status.state.name == "FAILED":
            raise RuntimeError("Gemini file processing failed")

        if time.time() - start > timeout:
            raise TimeoutError("Gemini file activation timeout")

        time.sleep(2)

def resize_image(img: Image.Image):
    if img.mode == "RGBA":
        img = img.convert("RGB")
    return ImageOps.contain(img, (1024, 1024))

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
        # Run this once to see the EXACT strings your key allows
        # print("--- Available Models for your Key ---")
        # for m in client.models.list():
        #     # Filter for models that support content generation
        #     if "generateContent" in m.supported_generation_methods:
        #         print(f"Model ID: {m.name.split('/')[-1]}") # This prints the ID you should use
        # await manager.send_message({"progress": 10, "message": "Processing started"})
        user_id = str(current_user["user_id"])

        mime_type = mimetypes.guess_type(file.filename)[0]

        cached = await fetch_existing_summary(user_id, file.filename, manager)
        if cached:
            return cached

        stream = file.file
        think_part = ""
        extracted_text = ""

        # --------------------------------------------------
        # VIDEO
        # --------------------------------------------------

        if mime_type and mime_type.startswith("video"):
            type = "Video"

            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
                tmp.write(stream.read())
                video_path = tmp.name

            cap = cv2.VideoCapture(video_path)
            ok, frame = cap.read()
            cap.release()

            if not ok:
                raise ValueError("Frame extraction failed")

            thumb_path = video_path.replace(".mp4", ".jpg")
            cv2.imwrite(thumb_path, frame)

            video_file = client.files.upload(file=video_path)
            wait_for_file_active(video_file)

            response = client.models.generate_content(
                model="gemini-1.5-pro",
                contents=[
                    "Summarize key events and main points from this video.",
                    video_file,
                ],
            )

            main_part = response.text

            with open(thumb_path, "rb") as f:
                fid = fs.put(f, filename=os.path.basename(thumb_path))
            file_url = f"files/?id={fid}"

        # --------------------------------------------------
        # IMAGE
        # --------------------------------------------------

        elif mime_type and mime_type.startswith("image"):
            print("this is triggering")
            type = "Image"

            stream.seek(0)
            image = resize_image(Image.open(stream))

            response = client.models.generate_content(
                model="gemini-3-flash-preview",
                contents=[
                    "Describe this image in detail.",
                    image,   # PIL Image is supported directly
                ],
            )

            main_part = response.text

            buf = BytesIO()
            image.save(buf, "JPEG")
            buf.seek(0)

            fid = fs.put(buf, filename=file.filename)
            file_url = f"files/?id={fid}"


        # --------------------------------------------------
        # PDF
        # --------------------------------------------------

        elif mime_type == "application/pdf":
            type = "PDF"

            pdf_bytes = await file.read()

            fd, pdf_path = tempfile.mkstemp(".pdf")
            os.close(fd)

            with open(pdf_path, "wb") as f:
                f.write(pdf_bytes)

            doc = fitz.open(pdf_path)
            pix = doc[0].get_pixmap()
            img_path = pdf_path.replace(".pdf", ".jpg")
            pix.save(img_path)

            with open(img_path, "rb") as f:
                fid = fs.put(f, filename=file.filename.replace(".pdf", ".jpg"))
            file_url = f"files/?id={fid}"

            response = client.models.generate_content(
                model="gemini-3-flash-preview",
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
            raise RuntimeError("Empty Gemini response")

        result = save_summary_to_mongo(
            user_id,
            file_url,
            url,
            main_part,
            think_part,
            extracted_text,
            title,
            type,
        )

        return result

    except Exception as e:
        print(e)
        await manager.send_message({
            "progress": 100,
            "message": str(e)
        })
        raise
