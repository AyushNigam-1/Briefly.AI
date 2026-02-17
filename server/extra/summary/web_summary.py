from langchain_community.document_loaders import WebBaseLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

from utils.websocket_manager import manager
from server.extra.summary import save_summary_to_mongo, fetch_existing_summary
from server.controllers.mongo import fs
from utils.llm import llm

import requests
from io import BytesIO
from PIL import Image
from datetime import datetime
import re


# --------------------------------------------------
# Clean text
# --------------------------------------------------

def clean_text(text: str) -> str:
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"©.*", "", text)
    text = re.sub(r"Cookie Policy.*", "", text, flags=re.I)
    return text.strip()


# --------------------------------------------------
# Main
# --------------------------------------------------

async def get_web_summary(
    url: str,
    lang: str,
    format: str,
    title: str,
    icon: str,
    current_user: dict,
):

    user_id = str(current_user["user_id"])

    await manager.send_message({"progress": 5, "message": "Checking cache..."})

    existing = await fetch_existing_summary(user_id, title, manager)
    if existing:
        return existing

    await manager.send_message({"progress": 15, "message": "Loading webpage..."})

    loader = WebBaseLoader(url)
    docs = loader.load()

    await manager.send_message({"progress": 25, "message": "Processing thumbnail..."})

    try:
        r = requests.get(icon, timeout=10)
        img = Image.open(BytesIO(r.content))
        buf = BytesIO()
        img.save(buf, format="JPEG")
        buf.seek(0)

        grid_id = fs.put(buf, filename=f"{datetime.utcnow()}.jpg")
        file_url = f"files/?id={grid_id}"
    except Exception:
        file_url = None

    await manager.send_message({"progress": 40, "message": "Chunking..."})

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1500,
        chunk_overlap=200,
    )

    docs = splitter.split_documents(docs)

    for d in docs:
        d.page_content = clean_text(d.page_content)

    joined_text = "\n\n".join(d.page_content for d in docs)

    await manager.send_message({"progress": 60, "message": "Summarizing..."})

    prompt = ChatPromptTemplate.from_template("""
    Language: {language}
    Format: {format}

    Summarize clearly:

    {text}
    """)

    chain = (
        {
            "text": RunnablePassthrough(),
            "language": lambda _: lang,
            "format": lambda _: format,
        }
        | prompt
        | llm
        | StrOutputParser()
    )

    summary = chain.invoke(joined_text)

    await manager.send_message({"progress": 85, "message": "Saving..."})

    result = save_summary_to_mongo(
        user_id=user_id,
        file_url=file_url,
        corrected_summary=joined_text,
        summary=summary,
        title=title,
        type="web",
    )

    await manager.send_message({"progress": 100, "message": "Done"})

    return result
