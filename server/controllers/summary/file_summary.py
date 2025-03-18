import requests
from PyPDF2 import PdfReader  # type: ignore
from PIL import Image, ImageOps
import mimetypes
from langchain.schema import Document
from langchain.prompts import PromptTemplate
from langchain.chains.summarize import load_summarize_chain
from dotenv import load_dotenv
from utils.websocket_manager import manager
from controllers.db.prompt import get_prompt_by_user
from controllers.db.summary import save_summary_to_mongo , fetch_existing_summary
from io import BytesIO
from controllers.db.conn import fs
from utils.llm import llm
import os
from utils.common import split_content
import tempfile
from dotenv import load_dotenv
from google.genai import types
import cv2
import fitz  # PyMuPDF

from google import genai

import time

load_dotenv()

ocrspace_api_key = os.getenv("ocrspace_api_key")

API_KEY=os.getenv("GOOGLE_API_KEY")
if API_KEY:
    client = genai.Client(api_key=API_KEY)

def extract_text_with_ocrspace(image_path: str) -> str:
    """Extract text from an image using OCR.space API."""
    url = "https://api.ocr.space/parse/image"
    with open(image_path, "rb") as image_file:
        response = requests.post(
            url,
            files={"file": image_file},
            data={"apikey": ocrspace_api_key, "language": "eng"},
        )
    if response.status_code != 200:
        raise ValueError(f"OCR.space API request failed with status {response.status_code}")
    result = response.json()
    if result.get("IsErroredOnProcessing"):
        raise ValueError(f"OCR.space error: {result.get('ErrorMessage', ['Unknown error'])[0]}")
    return result.get("ParsedResults", [{}])[0].get("ParsedText", "").strip()

def correct_summary(summary: str, lang: str) -> str:
    correction_prompt = PromptTemplate(
        template="""
        Clean and refine the following text:
        {summary}

        Instructions:
        1. Remove advertisements, social media links, copyright notices, and unrelated sections.
        2. Preserve only the core content, ensuring the language is clear, concise, and professional.
        3. Eliminate unnecessary metadata, headings, or repetitive content.
        4. Maintain the logical structure and flow of the article.
        5. Output the cleaned and polished text strictly in {language}.
        """,
        input_variables=["summary", "language"],
    )
    try:
        llm_input = correction_prompt.format(summary=summary, language=lang)
        corrected_summary = llm.predict(llm_input)
        return corrected_summary
    except Exception as e:
        raise ValueError(f"Failed to correct summary: {str(e)}")

async def get_file_summary(url ,file, lang: str, format: str, title: str, current_user: dict):
    try:
        await manager.send_message({"progress": 10, "message": "Processing started"})
        user_id = str(current_user["user_id"])

        if not file or not hasattr(file, "read"):
            raise ValueError("Invalid file instance provided.")

        if not file.filename:
            raise ValueError("File must have a valid filename.")

        mime_type = mimetypes.guess_type(file.filename)[0]

        result = await fetch_existing_summary(user_id, file.filename, manager)
        if result:
            return result

        file_stream = file.file
        extracted_text = ""
        if mime_type.startswith("video"):
            type = "Video"

            with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_video:
                temp_video.write(file_stream.read())  
                video_path = temp_video.name  

            cap = cv2.VideoCapture(video_path)
            success, frame = cap.read()
            cap.release()

            if success:
                thumbnail_path = video_path.replace('.mp4', '.jpg')
                cv2.imwrite(thumbnail_path, frame)  
                os.remove(video_path)  

                thumbnail_file = client.files.upload(file=thumbnail_path)
                video_file = client.files.upload(file=video_path)
            else:
                raise ValueError("Failed to extract thumbnail.")

            while True:
                thumbnail_file = client.files.get(name=video_file.name)
                if thumbnail_file.state.name == "ACTIVE":
                    break
                elif thumbnail_file.state.name == "FAILED":
                    raise ValueError("File processing failed.")
                time.sleep(2)

            model = "gemini-1.5-pro"
            response = client.models.generate_content(
                model=f"models/{model}",
                contents=[
                    "Summarize the key events and main points from this video.",
                    video_file
                ],
            )
            main_part = response.text
            with open(thumbnail_path, "rb") as f:
                file_id = fs.put(f, filename=thumbnail_file.name)
                
            file_url = f"files/?id={file_id}" 

                    
        elif mime_type.startswith("image"):
            type = "Image"
            file_stream.seek(0)
            image = Image.open(file_stream)
            if image.mode == "RGBA":
                image = image.convert("RGB")
            max_size = (1024, 1024)
            image = ImageOps.contain(image, max_size)
            img_byte_arr = BytesIO()
            image.save(img_byte_arr, format="JPEG")

            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=["What is this image?", image])

            main_part = response.text

            img_byte_arr.seek(0)  
            gridfs_file = fs.put(img_byte_arr, filename=file.filename, content_type="image/jpeg")

            file_url = f'files/?id={gridfs_file}'

        elif mime_type == "application/pdf":
            type = "PDF"
            prompt = "Summarize this document"
            doc_data = await file.read()

            temp_pdf_fd, temp_pdf_path = tempfile.mkstemp(suffix=".pdf")
            os.close(temp_pdf_fd)  

            with open(temp_pdf_path, "wb") as temp_pdf:
                temp_pdf.write(doc_data)  

            doc = fitz.open(temp_pdf_path)
            pix = doc[0].get_pixmap()

            temp_img_path = temp_pdf_path.replace(".pdf", ".jpg")
            pix.save(temp_img_path)

            with open(temp_img_path, "rb") as f:
                thumbnail_id = fs.put(f, filename=file.filename.replace(".pdf", ".jpg"))

            file_url = f'files/?id={thumbnail_id}'

            response = client.models.generate_content(
                model="gemini-1.5-flash",
                contents=[
                    types.Part.from_bytes(
                        data=doc_data,
                        mime_type="application/pdf",
                    ),
                    prompt
                ]
            )

            main_part = response.text

        else:
            raise ValueError("Unsupported file type.")

        if not main_part:
            raise ValueError("No text extracted from the file.")

        think_part = ""
        save_result = save_summary_to_mongo(user_id,file_url,url,main_part,think_part, extracted_text,title , type)
        return save_result

    except Exception as e:
        await manager.send_message({"progress": 100, "message": f"Error: {str(e)}"})
        raise ValueError(f"An error occurred: {e}")
