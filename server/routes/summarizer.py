from fastapi import APIRouter, HTTPException
from controllers.summary.yt_summary import get_youtube_summary
from controllers.summary.web_summary import get_web_summary
import validators

router = APIRouter()

@router.get("/summarize/")
def summarize_content(url: str,lang:str,tone:str):
    if not validators.url(url):
        raise HTTPException(status_code=400, detail="Invalid URL")
    try:
        if "youtu.be" in url or "youtube.com" in url:
            summary = get_youtube_summary(url,lang,tone)
        else:
            summary = get_web_summary(url,lang,tone)
            
        return {"summary":summary}

    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
