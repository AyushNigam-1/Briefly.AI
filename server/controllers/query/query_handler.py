from bson.objectid import ObjectId
from controllers.db.conn import summary_collection

from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from utils.llm import llm
from utils.common import split_content


# ------------------------------------------------------------------
# Prompt
# ------------------------------------------------------------------

prompt_template = PromptTemplate(
    input_variables=["summary", "history", "user_query"],
    template="""
You are chatting with a summarized video.

Video Summary:
{summary}

Previous Conversation:
{history}

User Question:
{user_query}

Answer clearly, directly, and helpfully.
"""
)


# ------------------------------------------------------------------
# Main chat handler
# ------------------------------------------------------------------

def chat_with_summary(user_input: str, id: str):
    try:
        summary_data = summary_collection.find_one({"_id": ObjectId(id)})
        if not summary_data:
            return "Could not find a summary associated with the given ID."

        summarized_summary = summary_data.get("summarized_summary", "")
        if not summarized_summary:
            return "The summary is empty or unavailable."

        # --------------------------------------------
        # Build chat history from DB only
        # --------------------------------------------

        chat_history = summary_data.get("queries", [])

        history_text = "\n".join(
            f"{q.get('sender', 'unknown')}: {q.get('content', '')}"
            for q in chat_history
        ) if chat_history else ""

        # --------------------------------------------
        # Build prompt
        # --------------------------------------------

        prompt = prompt_template.format(
            summary=summarized_summary,
            history=history_text,
            user_query=user_input,
        )

        # --------------------------------------------
        # LLM call (LCEL-safe)
        # --------------------------------------------

        response_text = llm.invoke(prompt)
        thought, final_response = split_content(response_text)

        # --------------------------------------------
        # Persist conversation
        # --------------------------------------------

        user_entry = {
            "sender": "user",
            "content": user_input,
        }

        llm_entry = {
            "sender": "llm",
            "content": final_response,
            "thought": thought,
        }

        summary_collection.update_one(
            {"_id": ObjectId(id)},
            {"$push": {"queries": {"$each": [user_entry, llm_entry]}}},
        )

        return {
            "res": final_response,
            "thought": thought,
        }

    except Exception as e:
        return f"An error occurred: {str(e)}"
