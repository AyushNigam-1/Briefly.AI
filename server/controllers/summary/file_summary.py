import requests
from PyPDF2 import PdfReader  # type: ignore
from PIL import Image, ImageOps
import mimetypes
from langchain.schema import Document
from langchain.prompts import PromptTemplate
from langchain.chains.summarize import load_summarize_chain
from langchain_groq import ChatGroq
from dotenv import load_dotenv
from utils.websocket_manager import manager
from controllers.db.conn import summary_collection
import os
from controllers.db.prompt import get_prompt_by_user
from controllers.db.summary import save_summary_to_mongo
from io import BytesIO
from controllers.db.conn import fs

load_dotenv()

api_key = os.getenv("groq_api_key")
ocrspace_api_key = os.getenv("ocrspace_api_key")
llm = ChatGroq(model="llama-3.3-70b-versatile", groq_api_key=api_key)

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

async def get_file_summary(file, lang: str, format: str, title: str, current_user: dict):
    try:
        await manager.send_message({"progress": 10, "message": "Processing started"})
        user_id = str(current_user["user_id"])

        if not file or not hasattr(file, "read"):
            raise ValueError("Invalid file instance provided.")

        if not file.filename:
            raise ValueError("File must have a valid filename.")

        mime_type = mimetypes.guess_type(file.filename)[0]
        if not mime_type:
            raise ValueError("Unsupported file type. Only images and PDFs are allowed.")

        existing_summary = summary_collection.find_one({"user_id": user_id, "title": file.filename})
        if existing_summary:
            summarized_summary = existing_summary.get("summarized_summary", "No summarized summary available.")
            summary_id = str(existing_summary["_id"])
            print("exisiting summary")
            queries = existing_summary.get("queries", "No queries available.")
            file_url = existing_summary.get("url",'unavailable')
            file_title = existing_summary.get('title',"not available")
            await manager.send_message({"progress": 100, "message": "Summary already exists in the database."})
            return {"summarized_summary": summarized_summary, "id": summary_id, "queries": queries ,"url":file_url , "title":file_title }

        file_stream = file.file
        extracted_text = ""

        # Handle image
        if mime_type.startswith("image"):
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
            file_stream.seek(0)
            pdf_reader = PdfReader(file_stream)
            extracted_text = " ".join(page.extract_text() or "" for page in pdf_reader.pages)

        else:
            raise ValueError("Unsupported file type.")

        if not extracted_text.strip():
            raise ValueError("No text extracted from the file.")

        await manager.send_message({"progress": 50, "message": "Text extracted. Refining..."})
        corrected_text = correct_summary(extracted_text, lang)

        await manager.send_message({"progress": 75, "message": "Generating summary..."})
        user_prompt_data = get_prompt_by_user(user_id)
        user_prompt = user_prompt_data.get("prompt") if user_prompt_data and "error" not in user_prompt_data else None

        if user_prompt:
            prompt_template = user_prompt + "\n\nThe subtitle is - {text} and the language should strictly be - {language}."
        else:
            prompt_template = (
                "Convert the following content into a refined and human-friendly output:"
                " Content: {text} Language: {language} Format: {output_format}"
            )

        prompt = PromptTemplate(template=prompt_template, input_variables=["text", "language", "output_format"])
        chain = load_summarize_chain(llm, chain_type="stuff", prompt=prompt)
        document = Document(page_content=corrected_text)
        summary = chain.run({"input_documents": [document], "language": lang, "output_format": format})

        await manager.send_message({"progress": 90, "message": "Saving summary..."})
        save_result = save_summary_to_mongo(user_id, file_url ,corrected_text, summary, title)

        await manager.send_message({"progress": 100, "message": "Summary generation completed."})
        return save_result

    except Exception as e:
        await manager.send_message({"progress": 100, "message": f"Error: {str(e)}"})
        raise ValueError(f"An error occurred: {e}")

