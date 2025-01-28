from langchain.prompts import PromptTemplate
from langchain.chains.summarize import load_summarize_chain
from langchain_groq import ChatGroq
from langchain.schema import Document
from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound, TranscriptsDisabled
import os
import requests
from urllib.parse import urlparse, parse_qs
from dotenv import load_dotenv
from youtube_transcript_api import _api
import os
from controllers.db.summary import save_summary_to_mongo , fetch_existing_summary
from controllers.db.prompt import get_prompt_by_user
from utils.websocket_manager import manager
from io import BytesIO
from PIL import Image
from controllers.db.conn import fs

load_dotenv()
api_key = os.getenv("groq_api_key")
WebSocket_uri = "ws://localhost:8080" 
session = requests.Session()
llm = ChatGroq(model="llama-3.3-70b-versatile", groq_api_key=api_key)

def session_request(method, url, *args, **kwargs):
    """Overrides the internal request function to use our session."""
    response = session.request(method, url, *args, **kwargs)
    response.raise_for_status()
    return response.json()

_api.request = session_request

def extract_video_id(url: str) -> str:
    """Extracts the video ID from various YouTube URL formats."""
    parsed_url = urlparse(url)
    if parsed_url.hostname in ["www.youtube.com", "youtube.com"]:
        return parse_qs(parsed_url.query).get("v", [None])[0]
    elif parsed_url.hostname in ["youtu.be"]:
        return parsed_url.path.lstrip("/")
    return None

def get_auto_subtitles(video_id: str, lang: str = 'en') -> str:
    """Fetch auto-generated or fallback subtitles using YouTube Transcript API."""
    try:
        return _get_transcript_text(video_id, [lang])
    except NoTranscriptFound:
        print(f"No {lang} transcript found. Attempting fallback to auto-generated transcript.")
        return _fetch_first_auto_generated_transcript(video_id)
    except TranscriptsDisabled:
        return "Transcripts are disabled for this video."
    except Exception as e:
        print(f"Error: {e}")
        return "Subtitles not available."

def _get_transcript_text(video_id: str, languages: list) -> str:
    """Helper function to get transcript text for specified languages."""
    transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=languages)
    return " ".join([entry['text'] for entry in transcript])

def _fetch_first_auto_generated_transcript(video_id: str) -> str:
    """Fetch the first available auto-generated transcript."""
    try:
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        auto_transcript = transcript_list.find_generated_transcript([lang for lang in transcript_list._generated_transcripts])
        return _get_transcript_text(video_id, [auto_transcript.language_code])
    except NoTranscriptFound:
        return "No auto-generated transcripts available."

def correct_subtitles(raw_subtitles: str, language: str = "en") -> str:
    """Corrects grammar, coherence, and clarity of extracted subtitles without altering the structure or summarizing."""
    
    
    correction_prompt_template = """
    The following text is a transcript. Your task is to correct grammatical errors, incomplete words, 
    and improve clarity while ensuring the structure remains unchanged. Do not summarize or change 
    any sentences. Maintain the original meaning and order of sentences.
    Corrected language: {language}.
    Transcript:
    {text}
    """
    correction_prompt = PromptTemplate(
        template=correction_prompt_template,
        input_variables=["text", "language"]
    )

    docs = [Document(page_content=raw_subtitles)]

    chain = load_summarize_chain(llm, chain_type="stuff", prompt=correction_prompt)

    input_data = {"input_documents": docs, "language": language}
    corrected_transcript = chain.run(input_data)

    return corrected_transcript


def save_subtitles_to_file(subtitles: str, file_name: str) -> None:
    """Saves subtitles to a local text file."""
    directory = "subtitles"
    os.makedirs(directory, exist_ok=True)  
    file_path = os.path.join(directory, file_name)
    with open(file_path, "w", encoding="utf-8") as file:
        file.write(subtitles)
    print(f"Saved subtitles to {file_path}")


async def get_youtube_summary(
    url: str, lang: str, format: str, title: str,icon:str, current_user
) -> str:
    video_id = extract_video_id(url)
    await manager.send_message({"progress": 10, "message": "Extracting transcript..."})

    if not video_id:
        await manager.send_message({"progress": 0, "message": "Invalid YouTube URL or video ID could not be extracted."})
        return "Invalid YouTube URL or video ID could not be extracted."

    user_id = str(current_user["user_id"])
    result = await fetch_existing_summary(user_id, title, manager)
    if result:
        return result

    # Send progress updates
    await manager.send_message({"progress": 10, "message": "Extracting transcript..."})
    transcript = get_auto_subtitles(video_id, lang)

    if transcript in ["Subtitles not available.", "Transcripts are disabled for this video."]:
        await manager.send_message({"progress": 0, "message": "Transcript extraction failed."})
        return transcript
    try:
        await manager.send_message({"progress": 20, "message": "Extracting video thumbnail..."})
        response = requests.get(icon, stream=True)
        response.raise_for_status()

        image = Image.open(BytesIO(response.content))
        img_byte_arr = BytesIO()
        image.save(img_byte_arr, format="JPEG")
        img_byte_arr.seek(0)  # Rewind the file pointer to the beginning

        gridfs_file = fs.put(img_byte_arr, filename=f"{video_id}_thumbnail.jpg", content_type="image/jpeg")
        file_url = f"files/?id={gridfs_file}"
    except Exception as e:
        await manager.send_message({"progress": 0, "message": f"Thumbnail extraction failed: {str(e)}"})
        return f"Thumbnail extraction failed: {str(e)}"
    await manager.send_message({"progress": 50, "message": "Correcting subtitles..."})
    corrected_transcript = correct_subtitles(transcript, language=lang)

    user_prompt_data = get_prompt_by_user(user_id)
    user_prompt = None if "error" in user_prompt_data else user_prompt_data.get("prompt")

    if user_prompt:
        prompt_template = user_prompt + "\n\nThe subtitle is - {text} and the language should strictly be - {language}."
    else:
        prompt_template = (
        "Convert the following YouTube transcript into a refined and human-friendly output based on the specified action."
        "1. Action: Perform the task specified below:{format}"
        "If shorten, reduce the transcript to its most essential points while maintaining clarity and meaning. Ensure brevity without losing important details."
        "If extend, expand the transcript by adding more details, explanations, and examples to make the content richer and more engaging."
        "    If summarize, condense the transcript into a concise overview by capturing only the main ideas and key points."
        "    If key points, extract the most important and actionable points from the transcript in bullet form, without additional explanations."
        "2. Language: Write the output in {language}."
        "3. Style: Write in a natural, polished, and human-friendly tone."
        "4. Enhancements: Ensure the content is clear, free of redundancy, and flows smoothly. Add transitions or structure (e.g., headings or bullet points) where necessary."
        "Transcript: {text}"
        )

    prompt = PromptTemplate(
        template=prompt_template,
        input_variables=["text", "language" , "format"]
    )

    docs = [Document(page_content=corrected_transcript)]
    input_data = {"input_documents": docs, "language": lang,"format":format}
    await manager.send_message({"progress": 90, "message": "Generating summary..."})

    chain = load_summarize_chain(llm, chain_type="stuff", prompt=prompt)
    summary = chain.run(input_data)

    await manager.send_message({"progress": 100, "message": "Summary generation completed."})
    save_result = save_summary_to_mongo(user_id,file_url, transcript, summary,title , type='Video')

    return save_result


