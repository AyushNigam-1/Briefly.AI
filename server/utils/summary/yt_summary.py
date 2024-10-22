from langchain.prompts import PromptTemplate
from langchain.chains.summarize import load_summarize_chain
from langchain_groq import ChatGroq
from langchain.schema import Document
from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound, TranscriptsDisabled
import os
import requests
from urllib.parse import urlparse, parse_qs
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
api_key = os.getenv("groq_api_key")

# Create a global session
session = requests.Session()

def session_request(method, url, *args, **kwargs):
    """Overrides the internal request function to use our session."""
    response = session.request(method, url, *args, **kwargs)
    response.raise_for_status()
    return response.json()

# Monkey-patch the YouTube Transcript API's request function
from youtube_transcript_api import _api
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
        # Try to fetch the transcript in the requested language
        return _get_transcript_text(video_id, [lang])
    except NoTranscriptFound:
        print(f"No {lang} transcript found. Attempting fallback to auto-generated transcript.")
        # Fetch any available auto-generated transcript
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

def get_youtube_summary(url: str, lang: str, tone: str) -> str:
    """Generate a summary of YouTube content."""
    llm = ChatGroq(model="Gemma-7b-It", groq_api_key=api_key)

    # Extract the video ID from the URL
    video_id = extract_video_id(url)
    if not video_id:
        return "Invalid YouTube URL or video ID could not be extracted."

    # Fetch the transcript
    transcript = get_auto_subtitles(video_id, lang)
    if transcript in ["Subtitles not available.", "Transcripts are disabled for this video."]:
        return transcript

    # Wrap the transcript in a Document object
    docs = [Document(page_content=transcript)]

    # Prompt template for summary generation
    prompt_template = """
    Provide a {tone} summary of the following YouTube content in 300 words.
    The summary should be written entirely in {language}. 

    Ensure the summary is formatted for webpage display.

    Content: {text}
    """
    prompt = PromptTemplate(
        template=prompt_template, 
        input_variables=["text", "language", "tone"],
    )

    # Prepare input for LangChain summarization
    input_data = {"input_documents": docs, "language": lang, "tone": tone}

    # Load and execute summarization chain
    chain = load_summarize_chain(llm, chain_type="stuff", prompt=prompt)
    summary = chain.run(input_data)

    return summary


