from PyPDF2 import PdfReader  # type: ignore
from PIL import Image
from paddleocr import PaddleOCR
import mimetypes

# Initialize PaddleOCR with the lightest model
ocr = PaddleOCR(
    use_angle_cls=True,  # Enable angle classification
    lang='en',           # Language model for English
    det_model_dir=None,  # Use default lightweight detection model
    rec_model_dir=None,  # Use default lightweight recognition model
    cls_model_dir=None,  # Use default lightweight classification model
    use_gpu=False        # Set to True if GPU is available and desired
)

def get_file_summary(file):
    try:
        if not file or not hasattr(file, "read"):
            raise ValueError("Invalid file instance provided. File must have a 'read' method.")

        if not hasattr(file, "filename") or not file.filename:
            raise ValueError("File instance must have a 'filename' attribute.")

        mime_type = mimetypes.guess_type(file.filename)[0]
        if not mime_type:
            raise ValueError("Unsupported file type. Please provide an image or a PDF.")

        file_stream = file.file

        if mime_type.startswith("image"):
            file_stream.seek(0)  # Reset the file pointer
            image = Image.open(file_stream)
            image.save("temp_image.jpg")  # Save the image temporarily for PaddleOCR processing
            results = ocr.ocr("temp_image.jpg", cls=True)
            extracted_text = [line[1][0] for line in results[0]]  # Extract the detected text
            return " ".join(extracted_text).strip()

        elif mime_type == "application/pdf":
            file_stream.seek(0)  # Reset the file pointer
            pdf_reader = PdfReader(file_stream)
            extracted_text = " ".join(page.extract_text() or "" for page in pdf_reader.pages)
            return extracted_text.strip()

        else:
            raise ValueError("Unsupported file type. Please provide an image or a PDF.")

    except Exception as e:
        print(f"Error in get_file_summary: {e}")
        raise ValueError(f"An unexpected error occurred: {e}")
