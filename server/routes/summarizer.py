from fastapi import APIRouter, HTTPException
from utils.summary.yt_summary import get_youtube_summary
from utils.summary.web_summary import get_web_summary
import validators

router = APIRouter()

@router.get("/summarize/")
def summarize_content(url: str):
    if not validators.url(url):
        raise HTTPException(status_code=400, detail="Invalid URL")
    try:
        if "youtu.be" in url or "youtube.com" in url:
            summary = get_youtube_summary(url)
        else:
            summary = get_web_summary(url)
            
        return {"summary":summary}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
