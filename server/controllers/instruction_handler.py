from .mongo import users_collection
from bson.objectid import ObjectId

ALLOWED_FIELDS = {"custom_instruction", "tone", "verbosity"}

def get_prompt_by_user(user_id: str) -> dict:
    try:
        user = users_collection.find_one({"_id": ObjectId(user_id)})

        if not user:
            return {"error": f"No User found for ID {user_id}."}

        return {
            "custom_instruction": user.get("custom_instruction", ""),
            "tone": user.get("tone", "Balanced"),
            "verbosity": user.get("verbosity", "Medium"),
        }

    except Exception as e:
        return {"error": str(e)}
    

def update_prompt_for_user(user_id: str, field: str, value: str) -> dict:
    try:
        if field not in ALLOWED_FIELDS:
            return {"error": "Invalid field"}

        result = users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {field: value}},
        )

        if result.matched_count == 0:
            return {"error": "User not found"}

        user = users_collection.find_one({"_id": ObjectId(user_id)})

        return {
            "custom_instruction": user.get("custom_instruction", ""),
            "tone": user.get("tone", "Balanced"),
            "verbosity": user.get("verbosity", "Medium"),
        }

    except Exception as e:
        return {"error": str(e)}
