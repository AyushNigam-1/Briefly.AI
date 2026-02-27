import json
from .mongo import users_collection
from bson.objectid import ObjectId
from redis_client import redis_client , CACHE_TTL


ALLOWED_FIELDS = {"custom_instruction", "tone", "verbosity"}

def get_prompt_by_user(user_id: str) -> dict:
    cache_key = f"user_prompt:{user_id}"
    
    try:
        # 1. Check Redis first
        cached_data = redis_client.get(cache_key)
        if cached_data:
            return json.loads(cached_data)

        # 2. If not in Redis, fetch from MongoDB
        user = users_collection.find_one({"_id": ObjectId(user_id)})

        if not user:
            return {"error": f"No User found for ID {user_id}."}

        prompt_data = {
            "custom_instruction": user.get("custom_instruction", ""),
            "tone": user.get("tone", "Balanced"),
            "verbosity": user.get("verbosity", "Medium"),
        }

        # 3. Store the result in Redis for future requests
        redis_client.setex(cache_key, CACHE_TTL, json.dumps(prompt_data))

        return prompt_data

    except Exception as e:
        return {"error": str(e)}
    

def update_prompt_for_user(user_id: str, field: str, value: str) -> dict:
    try:
        if field not in ALLOWED_FIELDS:
            return {"error": "Invalid field"}

        # 1. Update MongoDB
        result = users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {field: value}},
        )

        if result.matched_count == 0:
            return {"error": "User not found"}

        # 2. Fetch the newly updated user state
        user = users_collection.find_one({"_id": ObjectId(user_id)})

        updated_prompt_data = {
            "custom_instruction": user.get("custom_instruction", ""),
            "tone": user.get("tone", "Balanced"),
            "verbosity": user.get("verbosity", "Medium"),
        }

        # 3. Update the Redis cache so subsequent reads are accurate instantly
        cache_key = f"user_prompt:{user_id}"
        redis_client.setex(cache_key, CACHE_TTL, json.dumps(updated_prompt_data))

        return updated_prompt_data

    except Exception as e:
        return {"error": str(e)}