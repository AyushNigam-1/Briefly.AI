from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from langchain.prompts import PromptTemplate
from langchain_groq import ChatGroq
from langchain.chains.summarize import load_summarize_chain
from langchain_community.document_loaders import YoutubeLoader, UnstructuredURLLoader
import validators

router = APIRouter()

@router.post("/summarize/")
def summarize_content(api_key: str,url:str):
    if not validators.url(url):
        raise HTTPException(status_code=400, detail="Invalid URL")

    try:
        llm = ChatGroq(model="Gemma-7b-It", groq_api_key=api_key)

        prompt_template = """
        Provide a summary of the following content in 300 words:
        Content:{text}
        """
        prompt = PromptTemplate(template=prompt_template, input_variables=["text"])

        if "youtu.be" in url or "youtube.com" in url:
            loader = YoutubeLoader.from_youtube_url(url, add_video_info=True)
        else:
            loader = UnstructuredURLLoader(
                urls=[url], ssl_verify=False,
                headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36"}
            )

        docs = loader.load()
        chain = load_summarize_chain(llm, chain_type="stuff", prompt=prompt)
        summary = chain.run(docs)

        return {"summary": summary}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
