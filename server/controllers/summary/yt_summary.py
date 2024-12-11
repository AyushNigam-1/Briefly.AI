from langchain.prompts import PromptTemplate
from langchain.chains.summarize import load_summarize_chain
from langchain_groq import ChatGroq
from langchain.schema import Document
from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound, TranscriptsDisabled
import os
import requests
from urllib.parse import urlparse, parse_qs
from dotenv import load_dotenv
from common.embed_and_save import embed_and_save
from youtube_transcript_api import _api
import os
from datetime import datetime
from controllers.db.summary import save_summary_to_mongo
from controllers.db.conn import summary_collection
load_dotenv()
api_key = os.getenv("groq_api_key")

session = requests.Session()

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
    llm = ChatGroq(model="Gemma-7b-It", groq_api_key=api_key)
    
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

def get_youtube_summary(url: str, lang: str, tone: str,title:str, current_user) -> str:
    llm = ChatGroq(model="Gemma-7b-It", groq_api_key=api_key)
    
    video_id = extract_video_id(url)
    if not video_id:
        return "Invalid YouTube URL or video ID could not be extracted."
    
    user_id = str(current_user["user_id"])
    existing_summary = summary_collection.find_one({"user_id": user_id, "video_id": video_id})
    if existing_summary:
        summarized_summary = existing_summary.get("summarized_summary", "No summarized summary available.")
        summary_id = str(existing_summary["_id"])
        return {"summarized_summary": summarized_summary, "id": summary_id}


    transcript = get_auto_subtitles(video_id, lang)
    
    if transcript in ["Subtitles not available.", "Transcripts are disabled for this video."]:
        return transcript

    corrected_transcript = correct_subtitles(transcript, language=lang)
    
    docs = [Document(page_content=corrected_transcript)]

    prompt_template = """
    Analyze the following YouTube subtitle transcript from a psychological and scientific perspective, applying relevant psychological models such as the Big Five Personality Traits, Maslow’s Hierarchy of Needs, Self-Determination Theory, Cognitive Behavioral Theory, and others. Identify the key psychological traits, behaviors, and motivations expressed in the text, and evaluate how they align with established psychological theories. Provide a critical assessment of the individual’s choices, decision-making, and emotional intelligence. Offer real-world use cases where these traits might manifest, drawing on historical or cultural examples to highlight how similar traits have influenced notable figures or events. Discuss the underlying psychological needs or drives that might explain these behaviors, and use psychological frameworks to provide suggestions for personal growth or improvement. Consider how these behaviors may evolve over time and reflect on their impact on the individual's relationships, professional life, and overall well-being. The subtitle is - {text} and the language should strictly be - {language}.
    """
    prompt = PromptTemplate(
        template=prompt_template, 
        input_variables=["text", "language"]
    )

    input_data = {"input_documents": docs, "language": lang}

    chain = load_summarize_chain(llm, chain_type="stuff", prompt=prompt)
    summary = chain.run(input_data)
    
    print(current_user)
    user_id = str(current_user["user_id"])
    save_result = save_summary_to_mongo(user_id, transcript, summary , video_id , video_title=title)
    return save_result

