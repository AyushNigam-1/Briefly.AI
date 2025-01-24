from langchain_community.document_loaders import UnstructuredURLLoader
from langchain.prompts import PromptTemplate
from langchain.chains.summarize import load_summarize_chain
from langchain_groq import ChatGroq
from dotenv import load_dotenv
from utils.websocket_manager import manager
from controllers.db.conn import summary_collection
import os
from controllers.db.prompt import get_prompt_by_user
from controllers.db.summary import save_summary_to_mongo
import urllib3
import nltk
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

load_dotenv()

api_key = os.getenv("groq_api_key")

llm = ChatGroq(model="llama-3.3-70b-versatile", groq_api_key=api_key)

async def get_web_summary(
    url: str,
    lang: str,
    format: str,
    title: str,
    current_user: dict,
) -> dict:
    user_id = str(current_user["user_id"])

    await manager.send_message({"progress": 10, "message": "Extracting webpage content..."})

    existing_summary = summary_collection.find_one({"user_id": user_id, "url": url})
    if existing_summary:
        summary_id = str(existing_summary["_id"])
        summarized_summary = existing_summary.get("summary", "No summary available.")
        await manager.send_message({"progress": 100, "message": "Summary already exists in the database."})
        return {"summary": summarized_summary, "id": summary_id}

    
    loader = UnstructuredURLLoader(
        urls=[url],
        ssl_verify=False,
        headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36"},
    )

    nltk.download('averaged_perceptron_tagger_eng')

    try:
        docs = loader.load()
    except Exception as e:
        await manager.send_message({"progress": 0, "message": f"Failed to load content from URL. Error: {str(e)}"})
        return {"error": f"Failed to load content from URL.. Error: {str(e)}"}


    await manager.send_message({"progress": 50, "message": "Correcting summary..."})
    corrected_summary = correct_summary(docs[0].page_content, lang)


    await manager.send_message({"progress": 75, "message": "Generating summary..."})

    user_prompt_data = get_prompt_by_user(user_id)
    user_prompt = None if "error" in user_prompt_data else user_prompt_data.get("prompt")

    if user_prompt:
        prompt_template = user_prompt + "\n\nThe subtitle is - {text} and the language should strictly be - {language}."
    else:
        prompt_template = (
        "Convert the following web transcript into a refined and human-friendly output based on the specified action."
        "1. Action: Perform the task specified below:{format}"
        "If shorten, reduce the transcript to its most essential points while maintaining clarity and meaning. Ensure brevity without losing important details."
        "If extend, expand the transcript by adding more details, explanations, and examples to make the content richer and more engaging."
        "    If summarize, condense the transcript into a concise overview by capturing only the main ideas and key points."
        "    If key points, extract the most important and actionable points from the transcript in bullet form, without additional explanations."
        "2. Language: Write the output in {language}."
        "3. Style: Write in a natural, polished, and human-friendly tone."
        "4. Enhancements: Ensure the content is clear, free of redundancy, and flows smoothly. Add transitions or structure (e.g., headings or bullet points) where necessary."
        "Transcript: {text}"
        )

    
    prompt = PromptTemplate(template=prompt_template, input_variables=["text", "language", "output_format"])

    chain = load_summarize_chain(llm, chain_type="stuff", prompt=prompt)
    input_data = {"input_documents": docs, "language": lang, "format": format}

    try:
        summary = chain.run(input_data)
    except Exception as e:
        await manager.send_message({"progress": 0, "message": f"Summary generation failed. Error: {str(e)}"})
        return {"error": f"Summary generation failed.{str(e)}"}

    await manager.send_message({"progress": 90, "message": "Summary generation completed."})
    save_result = save_summary_to_mongo(user_id,url,corrected_summary, summary, title)
    return save_result


def correct_summary(summary: str, lang: str) -> str:
    """
    Function to correct grammar, spelling, and language quality in the summary.
    """
    correction_prompt = PromptTemplate(
        template="""
        Clean and refine the following text:
        {summary}

        Instructions:
        1. Remove advertisements, copyright notices, social media links, and unrelated sections (e.g., "Related News," "Trending News").
        2. Preserve the core article content, ensuring the language is clear, concise, and professional.
        3. Eliminate unnecessary metadata, headings, or repetitive content.
        4. Maintain the logical structure and flow of the article.
        5. Output only the cleaned and polished version of the text.

        Provide the refined text in {language} as the final output.
        """,
        input_variables=["summary", "language"],
    )

    corrected_summary = llm.predict(correction_prompt.format(summary=summary, language=lang))
    return corrected_summary
