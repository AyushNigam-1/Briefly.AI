import os
import tempfile
import time
import mimetypes
from markitdown import MarkItDown
from google import genai

client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
md = MarkItDown()

EXTRACTION_PROMPT = """
You are a data extraction tool feeding a text-only AI agent. 
Do NOT summarize. 
- For images: Extract all visible text (OCR) and describe the scene/charts in exhaustive detail.
- For audio/video: Provide a full transcript of what is spoken. Describe key visual events or slide text if visible.
Leave nothing out.
"""

async def process_files(files):
    if not files:
        return "", []

    full_context = ""
    uploaded_metadata = []

    for file in files:
        mime_type = mimetypes.guess_type(file.filename)[0] or "application/octet-stream"
        file_bytes = await file.read()
        
        extracted_text = ""

        if mime_type == "application/pdf" or "text" in mime_type or "csv" in mime_type:
            fd, tmp_path = tempfile.mkstemp(suffix=f"_{file.filename}")
            os.close(fd)
            with open(tmp_path, "wb") as f:
                f.write(file_bytes)
            
            try:
                result = md.convert(tmp_path)
                extracted_text = result.text_content
            except Exception as e:
                print(f"MarkItDown failed for {file.filename}: {e}")
                extracted_text = "[Failed to extract document text]"
            finally:
                os.remove(tmp_path)

        elif mime_type.startswith(("image/", "video/", "audio/")):
            ext = os.path.splitext(file.filename)[1]
            fd, tmp_path = tempfile.mkstemp(suffix=ext)
            os.close(fd)
            with open(tmp_path, "wb") as f:
                f.write(file_bytes)

            try:
                gemini_file = client.files.upload(file=tmp_path)
                
                while gemini_file.state.name == "PROCESSING":
                    print(".", end="", flush=True)
                    time.sleep(2)
                    gemini_file = client.files.get(name=gemini_file.name)

                if gemini_file.state.name == "FAILED":
                    raise Exception("Gemini video processing failed.")

                response = client.models.generate_content(
                    model="gemini-3-flash-preview", 
                    contents=[gemini_file, EXTRACTION_PROMPT]
                )
                extracted_text = response.text
                
                client.files.delete(name=gemini_file.name)

            except Exception as e:
                print(f"Gemini Media Extraction failed for {file.filename}: {e}")
                extracted_text = "[Failed to process media]"
            finally:
                os.remove(tmp_path)

        full_context += f"\n\n--- START OF FILE: {file.filename} ---\n{extracted_text}\n--- END OF FILE {file.filename} ---\n"

        uploaded_metadata.append({
            "name": file.filename,
            "type": file.content_type,
            "size": file.size,
        })

    return full_context, uploaded_metadata