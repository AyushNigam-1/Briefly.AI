from pytube import YouTube
from fastapi import HTTPException
def get_youtube_metadata(video_url: str):
    try:
        yt = YouTube(video_url)
        return {
            "type":"video",
            "title": yt.title,
            "thumbnail_url": yt.thumbnail_url,
            "channel_name": yt.author
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))