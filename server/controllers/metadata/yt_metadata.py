from youtube_transcript_api import YouTubeTranscriptApi
import requests
from fastapi import HTTPException

def extract_video_id(url: str) -> str:
    """Extract video ID from a YouTube URL."""
    if "v=" in url:
        video_id = url.split("v=")[-1]
    elif "youtu.be/" in url:
        video_id = url.split("/")[-1]
    else:
        raise ValueError("Invalid YouTube URL")
    
    return video_id.split("&")[0].split("?")[0]

def get_youtube_metadata(video_url: str):
    try:
        
        video_id = extract_video_id(video_url)
        metadata_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
        response = requests.get(metadata_url)
        response.raise_for_status()
        metadata = response.json()
        print(metadata)

        try:
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            transcript_available = transcript_list is not None
        except Exception as transcript_error:
            print(f"Transcript error: {transcript_error}")
            transcript_available = False

        return {
            "type": "video",
            "title": metadata["title"],
            "icon": metadata["thumbnail_url"],
            "metadata": metadata["author_name"],
            "transcript_available": transcript_available
        }

    except Exception as e:
        print(e)
        raise HTTPException(status_code=400, detail=f"Error: {str(e)}")


