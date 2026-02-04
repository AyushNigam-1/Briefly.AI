import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from groq import Groq

load_dotenv()
api_key = os.getenv("groq_api_key")
groq_client = Groq(api_key=api_key)

llm = ChatGroq(model="openai/gpt-oss-120b", groq_api_key=api_key)

def whisper(audio_path: str) -> str:
    with open(audio_path, "rb") as f:
        result = groq_client.audio.transcriptions.create(
            file=f,
            model="whisper-large-v3",
        )

    return result.text
