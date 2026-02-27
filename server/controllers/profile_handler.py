import json
import logging
from controllers.mongo import users_collection
from redis_client import redis_client, CACHE_TTL

# Optional: Set up a logger to track Redis connection issues without crashing the app
logger = logging.getLogger(__name__)

def get_profile(user_id: str):
    cache_key = f"user_profile:{user_id}"

    # 1. Try to fetch from Redis gracefully
    try:
        cached_profile = redis_client.get(cache_key)
        if cached_profile:
            return json.loads(cached_profile)
    except Exception as e:
        logger.warning(f"Redis get error for {cache_key}: {e}")

    # 2. Fallback to MongoDB
    user = users_collection.find_one({"_id": user_id}, {"password": 0})
    if not user:
        return None

    # MongoDB returns the _id field. If it's an ObjectId, JSON won't serialize it.
    # Convert _id (and any other non-serializable fields like datetime) to strings.
    if "_id" in user:
        user["_id"] = str(user["_id"])

    # 3. Save to Redis gracefully
    try:
        redis_client.setex(cache_key, CACHE_TTL, json.dumps(user))
    except Exception as e:
        logger.warning(f"Redis set error for {cache_key}: {e}")

    return user


def update_profile(user_id: str, payload: dict):
    # 1. Update the database
    users_collection.update_one(
        {"_id": user_id},
        {"$set": payload}
    )
    
    # 2. Invalidate the old cache
    try:
        redis_client.delete(f"user_profile:{user_id}")
    except Exception as e:
        logger.warning(f"Redis delete error for user_profile:{user_id}: {e}")
        
    # 3. Because get_profile handles caching, this will automatically fetch
    # the fresh data from MongoDB and repopulate the Redis cache!
    return get_profile(user_id)


def delete_profile_field(user_id: str, field: str):
    # 1. Update the database
    users_collection.update_one(
        {"_id": user_id},
        {"$unset": {field: ""}}
    )
    
    # 2. Invalidate the cache so the next get_profile request pulls the updated data
    try:
        redis_client.delete(f"user_profile:{user_id}")
    except Exception as e:
        logger.warning(f"Redis delete error for user_profile:{user_id}: {e}")