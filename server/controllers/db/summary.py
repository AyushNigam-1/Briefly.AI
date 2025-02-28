from .conn import summary_collection , users_collection
from datetime import datetime , timezone
from bson.objectid import ObjectId
from langchain.prompts import PromptTemplate
from langchain.schema import Document
from langchain.chains.summarize import load_summarize_chain
from utils.llm import llm
from utils.websocket_manager import manager
from utils.common import split_content
from fastapi import HTTPException

def is_valid_object_id(id: str) -> bool:
    """
    Check if a string is a valid MongoDB ObjectId.
    """
    try:
        ObjectId(id)
        return True
    except:
        return False

def save_summary_to_mongo(user_id: str,file_url:str,url:str, summarized_summary: str,thought:str,original_summary:str,title:str,type:str) -> dict:
    """Saves the original and summarized subtitles to the MongoDB 'summary' collection along with an empty queries array."""
    
    summary_data = {
        "user_id": user_id,
        "thumbnail":file_url,
        "url":url,
        "type":type,
        "thought":thought,
        "original_summary": original_summary,
        "summarized_summary": summarized_summary,
        "queries": [], 
        "timestamp": datetime.now(timezone.utc),
        "title":title
    }
    # return summary_data
    
    result = summary_collection.insert_one(summary_data)
    
    return {
        "id": str(result.inserted_id),
        "summarized_summary": summary_data.get("summarized_summary", ""),
        "thought":summary_data.get("thought", ""),
        "queries":  summary_data.get("queries", []),
        "title":summary_data.get("title", ""),
        "url":summary_data.get("url", ""),
        "thumbnail":summary_data.get("thumbnail", ""),
        "type":summary_data.get("type", "")
    }

async def fetch_existing_summary(user_id, title, manager):
    """
    Fetches an existing summary from the database based on user_id and URL.

    Args:
        user_id (str): The ID of the user.
        url (str): The URL to look for in the database.
        manager: The manager object for sending progress updates.

    Returns:
        dict: A dictionary containing the existing summary details if found, otherwise an empty dictionary.
    """
    existing_summary = summary_collection.find_one({"user_id": user_id, "title": title})
    if existing_summary:
        summary_id = str(existing_summary["_id"])
        thought=existing_summary.get("thought","")
        summarized_summary = existing_summary.get("summarized_summary", "No summary available.")
        queries = existing_summary.get("queries", "No queries available.")
        url = existing_summary.get("url", "unavailable")
        thumbnail = existing_summary.get("thumbnail", "")
        title = existing_summary.get("title", "not available")
        summary_type = existing_summary.get("type", "not available")

        await manager.send_message({"progress": 100, "message": "Summary already exists in the database."})
        return {
            "thought":thought,
            "summarized_summary": summarized_summary,
            "id": summary_id,
            "queries": queries,
            "url": url,
            "thumbnail":thumbnail,
            "title": title,
            "type": summary_type,
            'haha':'lol'       
            }
    
    return {}  


async def generate_summary(prompt_template: str, summary: str, language: str, format: str):
    prompt = PromptTemplate(template=prompt_template, input_variables=["text", "language", "format"])
    docs = [Document(page_content=summary)]
    input_data = {"input_documents": docs, "language": language, "format": format}
    chain = load_summarize_chain(llm, chain_type="stuff", prompt=prompt)

    return chain.run(input_data)  


async def regenerate(id: str,  language: str, format: str):
    print(id,language,format)
    if not is_valid_object_id(id):
        return "Invalid ObjectId. It must be a 24-character hex string."

    summary_data = summary_collection.find_one({"_id": ObjectId(id)})
    if not summary_data:
        return "Summary not found."

    prompt_template = "Regenerate the summary for the following transcript - {text} in {language} with the format - {format}.  Focus on highlighting different aspects or providing a new perspective on the information compared to the previous summary.  Avoid simply rephrasing the existing summary. Aim for a fresh and distinct summary."
    
    manager.send_message({"progress": 90, "message": "Regenerating summary..."})
    
    summary = await generate_summary(prompt_template, summary_data.get('summarized_summary'), language, format)
    print(summary)
    thought, response = split_content(summary)

    summary_collection.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"summarized_summary": response,"thought":thought, "timestamp": datetime.now(timezone.utc)}}
    )
    
    return {"id": id, "summarized_summary": response , "thought":thought}


def get_summary_by_id(id: str):
    if not is_valid_object_id(id):
            return "Invalid ObjectId. It must be a 24-character hex string."
    """
    Retrieves the summarized summary and query history for a given summary ID from MongoDB.
    """
    try:
        summary_data = summary_collection.find_one({"_id": ObjectId(id)})
        if not summary_data:
            return []
        
        summarized_summary = summary_data.get("summarized_summary", "")
        query_history = summary_data.get("queries", [])
        thought=summary_data.get("thought",""),

        return { 
            "thought":thought,
             "id": str(summary_data["_id"]),
            "summarized_summary": summarized_summary,
            "queries": query_history,
            "thumbnail": summary_data.get("thumbnail", ""),
            "title":summary_data.get("title", []),
            "url":summary_data.get("url", []),
            "type":summary_data.get("type", [])
        }
    except Exception as e:
        return f"An error occurred: {str(e)}"
    

    
def get_summaries_by_user(user_id: str):
    """
    Retrieves all summary titles, IDs, and timestamps for a specific user from MongoDB.
    """
    try:
        summaries = summary_collection.find({"user_id": user_id}, {"_id": 1, "title": 1, "timestamp": 1, "url":1,"queries":1,"type":1,"thumbnail":1})

        # Use len(list()) to count documents or check if the cursor is empty
        summary_list = list(summaries)

        if not summary_list:  
            return []
        
        result = []
        # print(summary_list)
        for summary in summary_list:
            result.append({
                "id": str(summary["_id"]),
                "title": summary["title"],
                "thumbnail": summary.get("thumbnail", ""),
                "timestamp": summary["timestamp"],
                "queries":len(summary["queries"]),
                "url":summary["url"],
                "type":summary["type"]
            })
        
        return result
    
    except Exception as e:
        return f"An error occurred: {str(e)}"

def delete_summary_by_id(id: str):
    """
    Deletes a summary from the MongoDB collection by its ID.
    """
    print(id)
    if not is_valid_object_id(id):
        return "Invalid ObjectId. It must be a 24-character hex string."

    result = summary_collection.delete_one({"_id": ObjectId(id)})

    if result.deleted_count == 0:
        return "Summary not found or could not be deleted."
    else:
        return "Summary deleted successfully."

async def mark_summary_as_favorite(user_id: str, summary_id: str):
    try:
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        favorites = user.get("favorites", [])

        if summary_id in favorites:
            users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$pull": {"favorites": summary_id}}
            )
            return {"status": False, "summary_id": summary_id}  # Removed from favorites

        users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$push": {"favorites": summary_id}}
        )
        return {"status": True, "summary_id": summary_id}  # Added to favorites

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
    

def convert_objectid_to_str(doc):
    if isinstance(doc, dict):
        return {k: convert_objectid_to_str(v) for k, v in doc.items()}
    elif isinstance(doc, list):
        return [convert_objectid_to_str(item) for item in doc]
    elif isinstance(doc, ObjectId):
        return str(doc)
    else:
        return doc

async def get_favorite_summaries_by_user(user_id: str):
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    
    print("User Data:", user)  # Debugging
    
    if not user or "favorites" not in user or not user["favorites"]:
        return []

    try:
        favorite_ids = [ObjectId(fav) for fav in user["favorites"]]
    except Exception as e:
        print("Error converting favorite IDs:", e)
        return []

    summaries = list(summary_collection.find({"_id": {"$in": favorite_ids}}))
    result = []
    for summary in summaries:
        result.append({
            "id": str(summary["_id"]),
            "title": summary["title"],
            "thumbnail": summary.get("thumbnail", ""),
            "timestamp": summary["timestamp"],
            "queries":len(summary["queries"]),
            "url":summary["url"],
            "type":summary["type"]
        })
        

    print("Fetched Summaries:", result)  # Debugging

    return result



