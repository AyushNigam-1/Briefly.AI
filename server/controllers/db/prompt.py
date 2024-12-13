from .conn import users_collection
from bson.objectid import ObjectId

def get_prompt_by_user(user_id: str) -> dict:
    try:
        user = users_collection.find({"_id":ObjectId(user_id)})
        
        if user.count() == 0:
            return {"error": f"No User found for user with ID {user_id}."}
        prompts = user.get("prompt", None)
        
        if not prompts:
            return {"error": f"No prompts found for user with ID {user_id}."}
        
        return {"prompt": prompts}
        
        
    except Exception as e:
        return {"error": f"An error occurred: {str(e)}"}
    

def update_prompt_for_user(user_id: str, new_prompt: str) -> dict:
    try:
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            return {"error": f"No user found for ID {user_id}."}
        
        result = users_collection.update_one(
            {"_id": ObjectId(user_id)},  
            {"$set": {"prompt": new_prompt}}  
        )
        
        if result.matched_count == 0:
            return {"error": f"No update was made for user with ID {user_id}."}
        
        updated_user = users_collection.find_one({"_id": ObjectId(user_id)})
        
        return {
            "prompt": updated_user.get("prompt", "No prompt set")
        }
    
    except Exception as e:
        return {"error": f"An error occurred: {str(e)}"}