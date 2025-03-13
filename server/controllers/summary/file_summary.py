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
import google.generativeai as genai
from google.generativeai import upload_file,get_file

load_dotenv()

ocrspace_api_key = os.getenv("ocrspace_api_key")

API_KEY=os.getenv("GOOGLE_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)

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
        print(mime_type[0] , file.filename)
        print(mime_type.startswith("video"))
        # if not mime_type:
        #     raise ValueError("Unsupported file type. Only images and PDFs are allowed.")

        result = await fetch_existing_summary(user_id, file.filename, manager)
        if result:
            return result

        file_stream = file.file
        extracted_text = ""
        if mime_type.startswith("video"):
            type = "Video"
            with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_video:
                video_path = temp_video.name
                uploaded_video = upload_file(video_path)

                # Wait until processing is complete
                while uploaded_video.state.name == "PROCESSING":
                    uploaded_video = get_file(uploaded_video.name)

                # Generate the summary using Gemini model
                model = genai.GenerativeModel("gemini-1.5-pro")  # Use the latest available Gemini model

                # Generate summary
                response = model.generate_content([
                    "Summarize the key events and main points from this video.",
                    uploaded_video  # Directly pass the uploaded video object
                ])


                # Print the summary
                print(response.text)

                    
        elif mime_type.startswith("image"):
            type = "Image"
            file_stream.seek(0)
            image = Image.open(file_stream)
            if image.mode == "RGBA":
                image = image.convert("RGB")
            max_size = (1024, 1024)
            image = ImageOps.contain(image, max_size)
            image.save("temp_image.jpg")
            extracted_text = extract_text_with_ocrspace("temp_image.jpg")

            img_byte_arr = BytesIO()
            image.save(img_byte_arr, format="JPEG")
            img_byte_arr.seek(0)  # Rewind the file pointer to the beginning
            gridfs_file = fs.put(img_byte_arr, filename=file.filename, content_type="image/jpeg")

            file_url = f'files/?id={gridfs_file}'

        # Handle PDF
        elif mime_type == "application/pdf":
            page_summaries = []  # Array to store summaries for each page
            page_titles = []  # Array to store titles for each page
            type = "File"
            file_stream.seek(0)
            pdf_reader = PdfReader(file_stream)
            total_pages = len(pdf_reader.pages)
            for page_num, page in enumerate(pdf_reader.pages):
                # Extract text for the current page
                page_text = page.extract_text() or ""
                page_summaries.append(page_text)
                page_titles.append(f"Reading page {page_num + 1} and summarizing page {page_num + 1}")
                await manager.send_message({"progress": (10 + (80 / total_pages) * (page_num + 1)), 
                                            "message": page_titles[-1]})  # Progress and page title
                
                # Summarize the page text
                corrected_text = correct_summary(page_text, lang)
                document = Document(page_content=corrected_text)
                prompt = PromptTemplate(template="Summarize the following text succinctly and clearly.", input_variables=["text"])
                chain = load_summarize_chain(llm, chain_type="stuff", prompt=prompt)
                page_summary = chain.run({"input_documents": [document], "language": lang, "format": format})
                page_summaries[page_num] = page_summary

        else:
            raise ValueError("Unsupported file type.")

        if not extracted_text.strip():
            raise ValueError("No text extracted from the file.")

        await manager.send_message({"progress": 50, "message": "Text extracted. Refining..."})
        corrected_text = correct_summary(extracted_text, lang)

        await manager.send_message({"progress": 75, "message": "Generating summary..."})
        prompt_template = (
            "Convert the following YouTube transcript into a refined and human-friendly output based on the specified action."
            "1. Action: Perform the task specified below:{format}"
            "If shorten, reduce the transcript to its most essential points while maintaining clarity and meaning. Ensure brevity without losing important details."
            "If extend, expand the transcript by adding more details, explanations, and examples to make the content richer and more engaging."
            "    If summarize, condense the transcript into a concise overview by capturing only the main ideas and key points."
            "    If key points, extract the most important and actionable points from the transcript in bullet form, without additional explanations."
            "2. Language: Write the output in {language}."
            "3. Style: Write in a natural, polished, and human-friendly tone."
            "4. Enhancements: Ensure the content is clear, free of redundancy, and flows smoothly. Add transitions or structure (e.g., headings or bullet points) where necessary."
            "Transcript: {text}"
            )
        if format == 'Custom':
            user_prompt_data = get_prompt_by_user(user_id)
            user_prompt = None if "error" in user_prompt_data else user_prompt_data.get("prompt")
            if user_prompt:
                prompt_template = user_prompt + "\n\nThe subtitle is - {text} and the language should strictly be - {language}."
            
        prompt = PromptTemplate(template=prompt_template, input_variables=["text", "language", "format"])
        chain = load_summarize_chain(llm, chain_type="stuff", prompt=prompt)
        document = Document(page_content=corrected_text)
        summary = chain.run({"input_documents": [document], "language": lang, "format": format})
        think_part, main_part = split_content(summary)
        await manager.send_message({"progress": 100, "message": "Summary generation completed."})
        save_result = save_summary_to_mongo(user_id,file_url,url,main_part,think_part, extracted_text,title , type)
        return save_result

    except Exception as e:
        await manager.send_message({"progress": 100, "message": f"Error: {str(e)}"})
        raise ValueError(f"An error occurred: {e}")
