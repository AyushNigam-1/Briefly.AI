import requests
from urllib.parse import urlparse, parse_qs
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled
from fastapi import HTTPException


# --------------------------------------------------
# Extract video ID safely
# --------------------------------------------------

def extract_video_id(url: str) -> str:
    parsed = urlparse(url)

    if parsed.hostname in ("www.youtube.com", "youtube.com"):
        return parse_qs(parsed.query).get("v", [None])[0]

    if parsed.hostname == "youtu.be":
        return parsed.path.lstrip("/")

    if "/shorts/" in parsed.path:
        return parsed.path.split("/shorts/")[-1].split("/")[0]

    raise ValueError("Invalid YouTube URL")


# --------------------------------------------------
# Metadata + transcript availability
# --------------------------------------------------

def get_youtube_metadata(video_url: str):
    try:
        video_id = extract_video_id(video_url)
        print(video_id , video_url)

        if not video_id:
            raise HTTPException(status_code=400, detail="Invalid YouTube link")

        # ---------- Metadata via oEmbed ----------
        oembed_url = (
            "https://www.youtube.com/oembed"
            f"?url=https://www.youtube.com/watch?v={video_id}&format=json"
        )

        res = requests.get(oembed_url, timeout=10)

        if res.status_code != 200:
            raise HTTPException(status_code=404, detail="Video not found or private")

        data = res.json()

        # ---------- Transcript availability ----------
        try:
            YouTubeTranscriptApi.list_transcripts(video_id)
            transcript_available = True
        except TranscriptsDisabled:
            transcript_available = False
        except Exception:
            transcript_available = False

        return {
            "type": "video",
            "video_id": video_id,
            "title": data.get("title", ""),
            "thumbnail": data.get("thumbnail_url", ""),
            "metadata": data.get("author_name", ""),
            "transcript_available": transcript_available,
        }

    except HTTPException:
        raise

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")

    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="YouTube request timed out")

    except Exception:
        raise HTTPException(status_code=500, detail="Failed to fetch YouTube metadata")
