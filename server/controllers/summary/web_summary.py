from langchain_community.document_loaders import UnstructuredURLLoader
from langchain.prompts import PromptTemplate
from langchain.chains.summarize import load_summarize_chain
from utils.websocket_manager import manager
from controllers.db.prompt import get_prompt_by_user
from controllers.db.summary import save_summary_to_mongo , fetch_existing_summary
import urllib3
import nltk
from io import BytesIO
from PIL import Image
from controllers.db.conn import fs
import requests
from utils.llm import llm
from datetime import datetime
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

async def get_web_summary(
    url: str,
    lang: str,
    format: str,
    title: str,
    icon:str,
    current_user: dict,
) -> dict:
    user_id = str(current_user["user_id"])

    await manager.send_message({"progress": 10, "message": "Extracting webpage content..."})

    result = await fetch_existing_summary(user_id, title, manager)
    if result:
        return result

    
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
    try:
        await manager.send_message({"progress": 20, "message": "Extracting video thumbnail..."})
        response = requests.get(icon, stream=True)
        response.raise_for_status()

        image = Image.open(BytesIO(response.content))
        img_byte_arr = BytesIO()
        image.save(img_byte_arr, format="JPEG")
        img_byte_arr.seek(0)  # Rewind the file pointer to the beginning

        gridfs_file = fs.put(img_byte_arr, filename=f"{datetime.now()}_thumbnail.jpg", content_type="image/jpeg")
        file_url = f"files/?id={gridfs_file}"

    except Exception as e:
        await manager.send_message({"progress": 0, "message": f"Thumbnail extraction failed: {str(e)}"})
        return f"Thumbnail extraction failed: {str(e)}"

    await manager.send_message({"progress": 50, "message": "Correcting summary..."})
    corrected_summary = correct_summary(docs[0].page_content, lang)


    await manager.send_message({"progress": 75, "message": "Generating summary..."})

    prompt_template = (
            "Convert the following YouTube transcript into a refined and human-friendly output based on the specified action."
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
    
    if format == 'Custom':
        user_prompt_data = get_prompt_by_user(user_id)
        user_prompt = None if "error" in user_prompt_data else user_prompt_data.get("prompt")
        if user_prompt:
            prompt_template = user_prompt + "\n\nThe subtitle is - {text} and the language should strictly be - {language}."

    
    prompt = PromptTemplate(template=prompt_template, input_variables=["text", "language", "output_format"])

    chain = load_summarize_chain(llm, chain_type="stuff", prompt=prompt)
    input_data = {"input_documents": docs, "language": lang, "format": format}

    try:
        summary = chain.run(input_data)
    except Exception as e:
        await manager.send_message({"progress": 0, "message": f"Summary generation failed. Error: {str(e)}"})
        return {"error": f"Summary generation failed.{str(e)}"}

    await manager.send_message({"progress": 90, "message": "Summary generation completed."})
    save_result = save_summary_to_mongo(user_id,file_url,corrected_summary, summary, title,type='web')
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
