import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from groq import Groq



# def whisper(audio_path: str) -> str:
#     with open(audio_path, "rb") as f:
#         result = groq_client.audio.transcriptions.create(
#             file=f,
#             model="whisper-large-v3",
#         )

#     return result.text
