from fastapi import APIRouter , HTTPException
from controllers.metadata.web_metadata import get_website_metadata
from controllers.metadata.yt_metadata import get_youtube_metadata
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


