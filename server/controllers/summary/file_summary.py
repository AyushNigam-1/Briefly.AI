from PyPDF2 import PdfReader # type: ignore
import pytesseract # type: ignore
from PIL import Image
import mimetypes

def get_file_summary(file):
    try:
        if not file or not hasattr(file, "name") or not hasattr(file, "read"):
            raise ValueError("Invalid file instance provided.")

        mime_type = mimetypes.guess_type(file.name)[0]

        if mime_type:
            if mime_type.startswith("image"):
                try:
                    image = Image.open(file)
                    extracted_text = pytesseract.image_to_string(image)
                    return extracted_text.strip()
                except Exception as img_err:
                    raise ValueError(f"Error processing image file: {img_err}")
            elif mime_type == "application/pdf":
                try:
                    pdf_reader = PdfReader(file)
                    extracted_text = " ".join(page.extract_text() for page in pdf_reader.pages if page.extract_text())
                    return extracted_text.strip()
                except Exception as pdf_err:
                    raise ValueError(f"Error processing PDF file: {pdf_err}")
        else:
            raise ValueError("Unsupported file type. Please provide an image or a PDF.")
    except ValueError as ve:
        raise ve
    except Exception as e:
        raise ValueError(f"An error occurred while processing the file: {e}")
