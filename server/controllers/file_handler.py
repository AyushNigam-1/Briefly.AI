# import os
# import mimetypes
# import tempfile
# from io import BytesIO
# from PIL import Image, ImageOps
# import fitz
# from dotenv import load_dotenv
# from google import genai
# from google.genai import types
# from utils.websocket_manager import manager
# from extra.summary import fetch_existing_summary
# from controllers.mongo import fs

# load_dotenv()

# # ------------------------------------------------------------------
# # ENV
# # ------------------------------------------------------------------

# GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# if not GOOGLE_API_KEY:
#     raise RuntimeError("GOOGLE_API_KEY missing")

# client = genai.Client(api_key=GOOGLE_API_KEY)

# def resize_image(img: Image.Image):
#     if img.mode == "RGBA":
#         img = img.convert("RGB")
#     return ImageOps.contain(img, (1024, 1024))

# # ------------------------------------------------------------------
# # Main
# # ------------------------------------------------------------------

# async def get_file_summary(file, current_user: dict):
#     try:
#         user_id = str(current_user["user_id"])
#         mime_type = mimetypes.guess_type(file.filename)[0]

#         cached = await fetch_existing_summary(user_id, file.filename, manager)
#         if cached:
#             return cached

#         stream = file.file
#         main_part = ""

#         # --------------------------------------------------
#         # IMAGE
#         # --------------------------------------------------
#         if mime_type and mime_type.startswith("image"):
#             stream.seek(0)
#             image = resize_image(Image.open(stream))

#             response = client.models.generate_content(
#                 model="gemini-3-flash-preview",
#                 contents=[
#                     "Describe this image in detail.",
#                     image,
#                 ],
#             )
#             main_part = response.text

#             # Save to GridFS
#             buf = BytesIO()
#             image.save(buf, "JPEG")
#             buf.seek(0)
#             fs.put(buf, filename=file.filename)

#         # --------------------------------------------------
#         # PDF
#         # --------------------------------------------------
#         elif mime_type == "application/pdf":
#             pdf_bytes = await file.read()

#             fd, pdf_path = tempfile.mkstemp(".pdf")
#             os.close(fd)

#             with open(pdf_path, "wb") as f:
#                 f.write(pdf_bytes)

#             # Generate Thumbnail
#             doc = fitz.open(pdf_path)
#             pix = doc[0].get_pixmap()
#             img_path = pdf_path.replace(".pdf", ".jpg")
#             pix.save(img_path)

#             # Save Thumbnail to GridFS
#             with open(img_path, "rb") as f:
#                 fs.put(f, filename=file.filename.replace(".pdf", ".jpg"))

#             # Ask Gemini
#             response = client.models.generate_content(
#                 model="gemini-3-flash-preview",
#                 contents=[
#                     types.Part.from_bytes(
#                         data=pdf_bytes,
#                         mime_type="application/pdf",
#                     ),
#                     "Summarize this document.",
#                 ],
#             )
#             main_part = response.text

#             os.remove(pdf_path)
#             os.remove(img_path)

#         else:
#             raise ValueError(f"Unsupported file type: {mime_type}")

#         if not main_part:
#             raise RuntimeError("Empty Gemini response")

#         return main_part

#     except Exception as e:
#         print(f"Error processing file: {e}")
#         await manager.send_message({
#             "progress": 100,
#             "message": str(e)
#         })
#         raise

# async def process_files(files, user_id):
#     context = ""
#     uploaded = []

#     if not files:
#         return context, uploaded

#     for file in files:
#         # Notice how much cleaner this call is now
#         summary = await get_file_summary(
#             file=file,
#             current_user={"user_id": user_id},
#         )

#         uploaded.append({
#             "name": file.filename,
#             "type": file.content_type,
#             "size": file.size,
#             "url": "", # Left blank as in your original code
#         })

#         context += f"\nFile ({file.filename}):\n{summary}\n"

#     return context, uploaded

import os
import tempfile
import time
import mimetypes
from io import BytesIO
from markitdown import MarkItDown
from google import genai
from google.genai import types

client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
md = MarkItDown()

EXTRACTION_PROMPT = """
You are a data extraction tool feeding a text-only AI agent. 
Do NOT summarize. 
- For images: Extract all visible text (OCR) and describe the scene/charts in exhaustive detail.
- For audio/video: Provide a full transcript of what is spoken. Describe key visual events or slide text if visible.
Leave nothing out.
"""

async def process_files(files, user_id):
    if not files:
        return "", []

    full_context = ""
    uploaded_metadata = []

    for file in files:
        mime_type = mimetypes.guess_type(file.filename)[0] or "application/octet-stream"
        file_bytes = await file.read()
        
        extracted_text = ""

        # --------------------------------------------------
        # 1. TEXT & DOCUMENTS (PDF, DOCX, CSV, HTML, etc.)
        # --------------------------------------------------
        if mime_type == "application/pdf" or "text" in mime_type or "csv" in mime_type:
            # Save temporarily for markitdown
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

        # --------------------------------------------------
        # 2. MEDIA (IMAGES, VIDEO, AUDIO) via GEMINI
        # --------------------------------------------------
        elif mime_type.startswith(("image/", "video/", "audio/")):
            # Save temporarily to upload to Google's File API
            ext = os.path.splitext(file.filename)[1]
            fd, tmp_path = tempfile.mkstemp(suffix=ext)
            os.close(fd)
            with open(tmp_path, "wb") as f:
                f.write(file_bytes)

            try:
                # Upload to Gemini File API (Required for video/audio)
                gemini_file = client.files.upload(file=tmp_path)
                
                # Wait for video processing to complete (Videos take a few seconds)
                while gemini_file.state.name == "PROCESSING":
                    print(".", end="", flush=True)
                    time.sleep(2)
                    gemini_file = client.files.get(name=gemini_file.name)

                if gemini_file.state.name == "FAILED":
                    raise Exception("Gemini video processing failed.")

                # Generate Content
                response = client.models.generate_content(
                    model="gemini-2.5-flash", # Use standard flash for fast multimodal tasks
                    contents=[gemini_file, EXTRACTION_PROMPT]
                )
                extracted_text = response.text
                
                # Cleanup Google Cloud File
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