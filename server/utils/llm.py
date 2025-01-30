import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq

load_dotenv()
api_key = os.getenv("groq_api_key")
llm = ChatGroq(model="deepseek-r1-distill-llama-70b", groq_api_key=api_key)