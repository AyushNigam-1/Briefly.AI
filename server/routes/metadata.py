from fastapi import APIRouter
from utils.web_metadata import get_website_metadata
from utils.yt_metadata import get_youtube_metadata

router = APIRouter()

@router.get("/metadata/")
def read_metadata(url: str):
    if "youtube.com" in url or "youtu.be" in url:
        return get_youtube_metadata(url)
    else:
        return get_website_metadata(url)


