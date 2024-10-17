from langchain_community.document_loaders import YoutubeLoader
from langchain.prompts import PromptTemplate
from langchain.chains.summarize import load_summarize_chain
from langchain_groq import ChatGroq
import os
import requests
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("groq_api_key") 
session = requests.Session()

def get_youtube_summary(url: str, lang: str, tone: str) -> str:
    llm = ChatGroq(model="Gemma-7b-It", groq_api_key=api_key)
    prompt_template = """
    Provide a {tone} summary of the following YouTube content in 300 words.
    Ensure the summary is written entirely in {language}. 

    The summary should be well-structured for webpage display and easy to read.

    Content: {text}
    """
    prompt = PromptTemplate(
        template=prompt_template, 
        input_variables=["text", "language", "tone"],
        session=session
    )
    try:
        loader = YoutubeLoader.from_youtube_url(url, add_video_info=True)
    except Exception as e:
        print(f"Error loading video: {e}")
        return "Failed to load video content."
    docs = loader.load()
    chain = load_summarize_chain(llm, chain_type="stuff", prompt=prompt)
    input_data = {"input_documents": docs, "language": lang, "tone": tone}
    
    summary = chain.run(input_data)

    return summary
