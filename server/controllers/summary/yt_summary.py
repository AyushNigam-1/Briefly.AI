from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
import subprocess
import uuid
from youtube_transcript_api import (
    YouTubeTranscriptApi,
    TranscriptsDisabled,
    _api,
)
from urllib.parse import urlparse, parse_qs
from io import BytesIO
from datetime import datetime
import requests
import os
from PIL import Image
from controllers.db.summary import save_summary_to_mongo, fetch_existing_summary
from controllers.db.prompt import get_prompt_by_user
from controllers.db.conn import fs
from utils.websocket_manager import manager
from utils.llm import llm , whisper
from utils.common import split_content
from agent.recommendation_agent import create_summary_agent


# ------------------------------------------------------------------
# YouTube Transcript API session patch
# ------------------------------------------------------------------

session = requests.Session()


def session_request(method, url, *args, **kwargs):
    response = session.request(method, url, *args, **kwargs)
    response.raise_for_status()
    return response.json()


_api.request = session_request


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def extract_video_id(url: str) -> str | None:
    parsed_url = urlparse(url)

    if parsed_url.hostname in ("www.youtube.com", "youtube.com"):
        return parse_qs(parsed_url.query).get("v", [None])[0]
    if parsed_url.hostname == "youtu.be":
        return parsed_url.path.lstrip("/")

    return None


# def _get_transcript_text(video_id: str, languages: list[str]) -> str:
#     transcript = YouTubeTranscriptApi.get_transcript(video_id)
#     print("tran",transcript)
#     return " ".join(entry["text"] for entry in transcript)

def download_youtube_audio(url: str) -> str:
    output = f"/tmp/{uuid.uuid4()}.mp3"
    subprocess.run(
        [
            "yt-dlp",
            "-x",
            "--audio-format",
            "mp3",
            "-o",
            output,
            url,
        ],
        check=True,
    )
    return output

def correct_subtitles(raw_subtitles: str, language: str) -> str:
    prompt = PromptTemplate(
        template=(
            "The following text is a transcript.\n"
            "Fix grammar, incomplete words, and clarity.\n"
            "Do NOT summarize or change sentence order.\n\n"
            "Language: {language}\n\n"
            "Transcript:\n{text}"
        ),
        input_variables=["text", "language"],
    )

    chain = prompt | llm | StrOutputParser()

    return chain.invoke({
        "text": raw_subtitles,
        "language": language,
    })

from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled


def get_subtitles(video_id: str, video_url: str, lang="en") -> str:
    # ---------- Tier 1: YouTube captions ----------
    try:
        transcripts = YouTubeTranscriptApi.list_transcripts(video_id)

        try:
            t = transcripts.find_manually_created_transcript([lang])
        except:
            try:
                t = transcripts.find_generated_transcript([lang])
            except:
                t = next(iter(transcripts))

        data = t.fetch()
        return " ".join(x["text"] for x in data)

    except TranscriptsDisabled:
        pass
    except Exception:
        pass

    # ---------- Tier 2: Groq Whisper ----------
    print("Falling back to Whisper...")

    audio = download_youtube_audio(video_url)
    text = whisper(audio)

    return text


async def get_youtube_summary(
    url: str,
    lang: str,
    format: str,
    title: str,
    icon: str,
    current_user: dict,
) -> dict:
    video_id = extract_video_id(url)
    print(video_id)
    if not video_id:
        await manager.send_message({
            "progress": 0,
            "message": "Invalid YouTube URL."
        })
        return {"error": "Invalid YouTube URL."}

    user_id = str(current_user["user_id"])

    cached = await fetch_existing_summary(user_id, title, manager)
    if cached:
        print("cached")
        return cached

    await manager.send_message({"progress": 10, "message": "Extracting transcript..."})
    transcript = get_subtitles(video_id, url ,lang)
    print("transcript",transcript)

    if transcript in (
        "Subtitles not available.",
        "Transcripts are disabled for this video.",
    ):
        return {"error": transcript}
    print("transcript",transcript)

    await manager.send_message({"progress": 20, "message": "Extracting thumbnail..."})

    try:
        response = requests.get(icon, stream=True)
        response.raise_for_status()

        image = Image.open(BytesIO(response.content))
        img_bytes = BytesIO()
        image.save(img_bytes, format="JPEG")
        img_bytes.seek(0)

        gridfs_file = fs.put(
            img_bytes,
            filename=f"{video_id}_{datetime.utcnow()}.jpg",
            content_type="image/jpeg",
        )

        file_url = f"files/?id={gridfs_file}"

    except Exception as e:
        return {"error": f"Thumbnail extraction failed: {str(e)}"}


    await manager.send_message({"progress": 50, "message": "Correcting subtitles..."})
    cleaned_transcript = correct_subtitles(transcript, lang)

    prompt_template = (
        "Convert the following YouTube transcript into a refined output.\n\n"
        "Action: {format}\n"
        "- shorten → essentials only\n"
        "- extend → add explanations\n"
        "- summarize → concise overview\n"
        "- key points → bullet list\n\n"
        "Language: {language}\n\n"
        "Transcript:\n{text}"
    )

    if format == "Custom":
        user_prompt_data = get_prompt_by_user(user_id)
        user_prompt = None if "error" in user_prompt_data else user_prompt_data.get("prompt")
        if user_prompt:
            prompt_template = (
                user_prompt +
                "\n\nTranscript:\n{text}\nLanguage: {language}"
            )

    prompt = PromptTemplate(
        template=prompt_template,
        input_variables=["text", "language", "format"],
    )

    chain = prompt | llm | StrOutputParser()

    await manager.send_message({"progress": 90, "message": "Generating summary..."})

    summary = chain.invoke({
        "text": cleaned_transcript,
        "language": lang,
        "format": format,
    })

    think_part, main_part = split_content(summary)

    await manager.send_message({
        "progress": 100,
        "message": "Summary generation completed."
    })

    save_result = save_summary_to_mongo(
        user_id,
        file_url,
        url,
        main_part,
        think_part,
        transcript,
        title,
        type="Video",
    )

    # --------------------------------------------------------------
    # Recommendation agent (unchanged)
    # --------------------------------------------------------------

    agent_prompt = (
        f"Summarize the YouTube video at {url} "
        f"in {lang} language using {format} format."
    )

    summary_agent = create_summary_agent()
    agent_res = summary_agent.run(agent_prompt)
    print(agent_res.content)

    return save_result

