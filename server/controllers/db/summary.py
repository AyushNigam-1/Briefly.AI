from .conn import summary_collection, users_collection
from datetime import datetime, timezone
from bson.objectid import ObjectId
from fastapi import HTTPException

from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from utils.llm import llm
from utils.websocket_manager import manager
from utils.common import split_content


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def is_valid_object_id(id: str) -> bool:
    try:
        ObjectId(id)
        return True
    except Exception:
        return False


# ------------------------------------------------------------------
# Create
# ------------------------------------------------------------------

def save_summary_to_mongo(
    user_id: str,
    file_url: str,
    url: str,
    summarized_summary: str,
    thought: str,
    original_summary: str,
    title: str,
    type: str,
) -> dict:

    summary_data = {
        "user_id": user_id,
        "thumbnail": file_url,
        "url": url,
        "type": type,
        "thought": thought,
        "original_summary": original_summary,
        "summarized_summary": summarized_summary,
        "queries": [],
        "timestamp": datetime.now(timezone.utc),
        "title": title,
    }

    result = summary_collection.insert_one(summary_data)

    return {
        "id": str(result.inserted_id),
        "summarized_summary": summarized_summary,
        "thought": thought,
        "queries": [],
        "title": title,
        "url": url,
        "thumbnail": file_url,
        "type": type,
    }


# ------------------------------------------------------------------
# Read
# ------------------------------------------------------------------

async def fetch_existing_summary(user_id: str, title: str, manager):
    existing_summary = summary_collection.find_one(
        {"user_id": user_id, "title": title}
    )

    if existing_summary:
        await manager.send_message({
            "progress": 100,
            "message": "Summary already exists in the database."
        })

        return {
            "id": str(existing_summary["_id"]),
            "thought": existing_summary.get("thought", ""),
            "summarized_summary": existing_summary.get("summarized_summary", ""),
            "queries": existing_summary.get("queries", []),
            "url": existing_summary.get("url", ""),
            "thumbnail": existing_summary.get("thumbnail", ""),
            "title": existing_summary.get("title", ""),
            "type": existing_summary.get("type", ""),
        }

    return {}


# ------------------------------------------------------------------
# LLM Regeneration (LCEL, no legacy chains)
# ------------------------------------------------------------------

async def generate_summary(
    prompt_template: str,
    text: str,
    language: str,
    format: str,
):
    prompt = PromptTemplate(
        template=prompt_template,
        input_variables=["text", "language", "format"],
    )

    chain = prompt | llm | StrOutputParser()

    return chain.invoke({
        "text": text,
        "language": language,
        "format": format,
    })


async def regenerate(id: str, language: str, format: str):
    if not is_valid_object_id(id):
        return "Invalid ObjectId."

    summary_data = summary_collection.find_one({"_id": ObjectId(id)})
    if not summary_data:
        return "Summary not found."

    prompt_template = (
        "Regenerate the summary for the following content:\n\n"
        "{text}\n\n"
        "Language: {language}\n"
        "Format: {format}\n\n"
        "Provide a fresh perspective. Do not rephrase the previous summary."
    )

    await manager.send_message({
        "progress": 90,
        "message": "Regenerating summary..."
    })

    summary = await generate_summary(
        prompt_template,
        summary_data.get("summarized_summary", ""),
        language,
        format,
    )

    thought, response = split_content(summary)

    summary_collection.update_one(
        {"_id": ObjectId(id)},
        {
            "$set": {
                "summarized_summary": response,
                "thought": thought,
                "timestamp": datetime.now(timezone.utc),
            }
        },
    )

    return {
        "id": id,
        "summarized_summary": response,
        "thought": thought,
    }


# ------------------------------------------------------------------
# Query helpers
# ------------------------------------------------------------------

def get_summary_by_id(id: str):
    if not is_valid_object_id(id):
        return "Invalid ObjectId."

    summary_data = summary_collection.find_one({"_id": ObjectId(id)})
    if not summary_data:
        return []

    return {
        "id": str(summary_data["_id"]),
        "thought": summary_data.get("thought", ""),
        "summarized_summary": summary_data.get("summarized_summary", ""),
        "queries": summary_data.get("queries", []),
        "thumbnail": summary_data.get("thumbnail", ""),
        "title": summary_data.get("title", ""),
        "url": summary_data.get("url", ""),
        "type": summary_data.get("type", ""),
    }


def get_summaries_by_user(user_id: str):
    print(user_id)
    summaries = list(
        summary_collection.find(
            {"user_id": user_id},
            {"_id": 1, "title": 1, "timestamp": 1, "url": 1, "queries": 1, "type": 1, "thumbnail": 1},
        )
    )
    print("summaries",summaries)
    result = []
    for summary in summaries:
        result.append({
            "id": str(summary["_id"]),
            "title": summary["title"],
            "timestamp": summary["timestamp"],
            "queries": len(summary.get("queries", [])),
        })
    

    return result


# ------------------------------------------------------------------
# Delete / Favorites
# ------------------------------------------------------------------

def delete_summary_by_id(id: str, user_id: str):
    if not is_valid_object_id(id):
        return "Invalid ObjectId."

    result = summary_collection.delete_one({"_id": ObjectId(id)})

    if result.deleted_count == 0:
        return "Summary not found."

    users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$pull": {"favorites": id}},
    )

    return "Summary deleted successfully."


async def mark_summary_as_favorite(user_id: str, summary_id: str):
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    favorites = user.get("favorites", [])

    if summary_id in favorites:
        users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$pull": {"favorites": summary_id}},
        )
        return {"status": False, "summary_id": summary_id}

    users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$push": {"favorites": summary_id}},
    )
    return {"status": True, "summary_id": summary_id}


async def get_favorite_summaries_by_user(user_id: str):
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not user or not user.get("favorites"):
        return []

    favorite_ids = [ObjectId(fid) for fid in user["favorites"]]

    summaries = summary_collection.find({"_id": {"$in": favorite_ids}})
    result = []

    for summary in summaries:
        result.append({
            "id": str(summary["_id"]),
            "title": summary["title"],
            "thumbnail": summary.get("thumbnail", ""),
            "timestamp": summary["timestamp"],
            "queries": len(summary.get("queries", [])),
            "url": summary["url"],
            "type": summary["type"],
        })

    return result
