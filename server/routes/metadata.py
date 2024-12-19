from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import Dict
from controllers.metadata.web_metadata import get_website_metadata
from controllers.metadata.yt_metadata import get_youtube_metadata
from controllers.metadata.file_metadata import get_file_metadata
import validators

router = APIRouter()

@router.get("/metadata/")
def read_metadata(url: str):
    if not validators.url(url):
        raise HTTPException(status_code=400, detail="Invalid URL")
    try: 
        if "youtube.com" in url or "youtu.be" in url:
            return get_youtube_metadata(url)
        else:
            return get_website_metadata(url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/file-details/")
async def file_details(file: UploadFile = File(...)) -> Dict[str, str]:
    try:
        file_details = get_file_metadata(file.file)
        return {"status": "success", "data": file_details}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
