# from youtube_transcript_api import YouTubeTranscriptApi
# import requests
# from fastapi import HTTPException

# def extract_video_id(url: str) -> str:
#     """Extract video ID from a YouTube URL."""
#     if "v=" in url:
#         video_id = url.split("v=")[-1]
#     elif "youtu.be/" in url:
#         video_id = url.split("/")[-1]
#     else:
#         raise ValueError("Invalid YouTube URL")
    
#     return video_id.split("&")[0].split("?")[0]

# def get_youtube_metadata(video_url: str):
#     try:
        
#         video_id = extract_video_id(video_url)
#         metadata_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
#         response = requests.get(metadata_url)
#         response.raise_for_status()
#         metadata = response.json()

#         transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)

#         return {
#             "type": "video",
#             "title": metadata["title"],
#             "thumbnail_url": metadata["thumbnail_url"],
#             "channel_name": metadata["author_name"],
#             "transcript_available": transcript_list is not None,
#         }

#     except Exception as e:
#         raise HTTPException(status_code=400, detail=f"Error: {str(e)}")
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

