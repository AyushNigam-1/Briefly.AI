from langchain_community.document_loaders import YoutubeLoader
from langchain.prompts import PromptTemplate
from langchain.chains.summarize import load_summarize_chain
from langchain_groq import ChatGroq
import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
api_key = os.getenv("groq_api_key") 
session = requests.Session()

def get_youtube_summary(url: str, lang: str, tone: str) -> str:
    llm = ChatGroq(model="Gemma-7b-It", groq_api_key=api_key)

    # Modified prompt template to return HTML with Tailwind CSS
    prompt_template = """
    Provide a {tone} summary of the following YouTube content in 300 words.
    The summary should be written entirely in {language}. 

    Ensure the summary is formatted for webpage display using proper HTML tags 
    
    Content: {text}
    """
    prompt = PromptTemplate(
        template=prompt_template, 
        input_variables=["text", "language", "tone"],
    )

    try:
        # Load video content using YoutubeLoader
        loader = YoutubeLoader.from_youtube_url(url, add_video_info=True)
    except Exception as e:
        print(f"Error loading video: {e}")
        return "Failed to load video content."

    docs = loader.load()

    # Load and execute summarization chain
    chain = load_summarize_chain(llm, chain_type="stuff", prompt=prompt)
    input_data = {"input_documents": docs, "language": lang, "tone": tone}
    summary = chain.run(input_data)

    return summary
