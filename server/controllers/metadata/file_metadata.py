import os
import mimetypes

def get_file_metadata(file):
    try:
        if not file or not hasattr(file, "name") or not hasattr(file, "read"):
            raise ValueError("Invalid file instance provided.")
        
        file_name = os.path.basename(file.name)
        
        file.seek(0, os.SEEK_END) 
        file_size = file.tell()   
        file.seek(0)  
        
        mime_type, _ = mimetypes.guess_type(file_name)
        if mime_type:
            if mime_type.startswith("image"):
                file_type = "Image"
            elif mime_type == "application/pdf":
                file_type = "PDF"
            else:
                file_type = "Other"
        else:
            file_type = "Unknown"
        
        return {
            "file_name": file_name,
            "file_size": f"{file_size} bytes",
            "file_type": file_type
        }
    except ValueError as ve:
        raise ve
    except Exception as e:
        raise ValueError(f"An error occurred while processing the file: {e}")

