from .conn import summary_collection 
from datetime import datetime , timezone
from bson.objectid import ObjectId

def is_valid_object_id(id: str) -> bool:
    """
    Check if a string is a valid MongoDB ObjectId.
    """
    try:
        ObjectId(id)
        return True
    except:
        return False

def save_summary_to_mongo(user_id: str,url:str, original_summary: str, summarized_summary: str,title:str) -> dict:
    """Saves the original and summarized subtitles to the MongoDB 'summary' collection along with an empty queries array."""
    
    summary_data = {
        "user_id": user_id,
        "url":url,
        "original_summary": original_summary,
        "summarized_summary": summarized_summary,
        "queries": [], 
        "timestamp": datetime.now(timezone.utc),
        "title":title
    }
    
    result = summary_collection.insert_one(summary_data)
    
    return {
        "id": str(result.inserted_id),
        "summarized_summary": summarized_summary,
        "queries":  summary_data.get("queries", [])

    }

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
        
        return { 
             "id": str(summary_data["_id"]),
            "summarized_summary": summarized_summary,
            "queries": query_history
        }
    except Exception as e:
        return f"An error occurred: {str(e)}"
    

    
def get_summaries_by_user(user_id: str):
    """
    Retrieves all summary titles, IDs, and timestamps for a specific user from MongoDB.
    """
    try:
        summaries = summary_collection.find({"user_id": user_id}, {"_id": 1, "title": 1, "timestamp": 1})

        # Use len(list()) to count documents or check if the cursor is empty
        summary_list = list(summaries)

        if not summary_list:  # Check if the list is empty
            return []
        
        # Process summaries if found
        result = []
        for summary in summary_list:
            result.append({
                "id": str(summary["_id"]),
                "title": summary["title"],
                "timestamp": summary["timestamp"]
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