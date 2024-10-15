from langchain_community.document_loaders import YoutubeLoader
from langchain.prompts import PromptTemplate
from langchain.chains.summarize import load_summarize_chain
from langchain_groq import ChatGroq
import os
from dotenv import load_dotenv
load_dotenv()
api_key = os.getenv("groq_api_key") 

def get_youtube_summary(url: str, lang:str) -> str:
    llm = ChatGroq(model="Gemma-7b-It", groq_api_key=api_key)

    prompt_template = """
    Provide a summary of the following YouTube content in 300 words.
    Ensure the summary is written entirely in {language}. 

    Ensure the text is well-structured for webpage display.

    Content: {text}
    """
    prompt = PromptTemplate(template=prompt_template, input_variables=["text", "language"])

    loader = YoutubeLoader.from_youtube_url(url, add_video_info=True)
    docs = loader.load()

    chain = load_summarize_chain(llm, chain_type="stuff", prompt=prompt)
    summary = chain.run(docs , language=lang)

    return summary
