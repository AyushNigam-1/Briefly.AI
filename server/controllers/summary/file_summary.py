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
import google.generativeai as genai
import tempfile
import time

load_dotenv()

API_KEY=os.getenv("GOOGLE_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)

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

async def get_file_summary(url, file, lang: str, format: str, title: str, current_user: dict):
    try:
        await manager.send_message({"progress": 10, "message": "Processing started"})
        user_id = str(current_user["user_id"])

        if not file or not hasattr(file, "read"):
            raise ValueError("Invalid file instance provided.")

        if not file.filename:
            raise ValueError("File must have a valid filename.")

        mime_type = mimetypes.guess_type(file.filename)[0]
        if not mime_type:
            raise ValueError("Unsupported file type. Only videos, images, and PDFs are allowed.")

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
            
            await manager.send_message({"progress": 25, "message": "Uploading video to Gemini..."})
            processed_video = genai.upload_file(video_path)
            while processed_video.state.name == "PROCESSING":
                time.sleep(1)
                processed_video = genai.get_file(processed_video.name)
            
            analysis_prompt = f"""
                Summarize the uploaded video and extract key insights.
                Respond in {lang} and provide a structured summary.
                """
            
            model = genai.GenerativeModel("gemini-pro")
            response = model.generate_content(analysis_prompt, video=processed_video)
            extracted_text = response.text

        elif mime_type.startswith("image"):
            type = "Image"
            file_stream.seek(0)
            image = Image.open(file_stream)
            if image.mode == "RGBA":
                image = image.convert("RGB")
            max_size = (1024, 1024)
            image = ImageOps.contain(image, max_size)
            image.save("temp_image.jpg")
            model = genai.GenerativeModel("gemini-pro-vision")
            response = model.generate_content(["Extract text from this image:", Image.open("temp_image.jpg")])
            extracted_text = response.text

            img_byte_arr = BytesIO()
            image.save(img_byte_arr, format="JPEG")
            img_byte_arr.seek(0)
            gridfs_file = fs.put(img_byte_arr, filename=file.filename, content_type="image/jpeg")

            file_url = f'files/?id={gridfs_file}'

        elif mime_type == "application/pdf":
            type = "File"
            file_stream.seek(0)
            pdf_reader = PdfReader(file_stream)
            extracted_text = "\n".join([page.extract_text() or "" for page in pdf_reader.pages])
        
        else:
            raise ValueError("Unsupported file type.")

        if not extracted_text.strip():
            raise ValueError("No text extracted from the file.")

        await manager.send_message({"progress": 50, "message": "Text extracted. Refining..."})
        corrected_text = correct_summary(extracted_text, lang)

        await manager.send_message({"progress": 75, "message": "Generating summary..."})
        prompt_template = f"Summarize the following content in {lang}: {corrected_text}"
        
        if format == 'Custom':
            user_prompt_data = get_prompt_by_user(user_id)
            user_prompt = None if "error" in user_prompt_data else user_prompt_data.get("prompt")
            if user_prompt:
                prompt_template = f"{user_prompt}\n\nContent: {corrected_text}"
        
        response = genai.generate_text(prompt_template)
        summary = response.text
        think_part, main_part = split_content(summary)
        
        await manager.send_message({"progress": 100, "message": "Summary generation completed."})
        save_result = save_summary_to_mongo(user_id, file.filename, url, main_part, think_part, extracted_text, title, type)
        return save_result
    
    except Exception as e:
        await manager.send_message({"progress": 100, "message": f"Error: {str(e)}"})
        raise ValueError(f"An error occurred: {e}")
