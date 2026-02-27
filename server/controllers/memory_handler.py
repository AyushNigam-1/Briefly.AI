import json
from datetime import datetime, timezone
from uuid import uuid4
from controllers.mongo import users_collection
from redis_client import redis_client, CACHE_TTL

def save_user_memories(user_id: str, memories: list[str]):
    if not memories:
        return

    docs = [
        {
            "id": str(uuid4()),
            "text": m,
            "created_at": datetime.now(timezone.utc)
        }
        for m in memories
    ]

    users_collection.update_one(
        {"_id": user_id},
        {
            "$push": {"memories": {"$each": docs}},
            "$set": {"memory_updated_at": datetime.now(timezone.utc)}
        },
        upsert=True
    )
    # Invalidate cache so the next read fetches fresh data
    redis_client.delete(f"user_memories:{user_id}")


def get_user_memories(user_id: str):
    cache_key = f"user_memories:{user_id}"
    
    # 1. Try to get from Redis
    cached_memories = redis_client.get(cache_key)
    if cached_memories:
        return json.loads(cached_memories)

    # 2. Fallback to MongoDB
    user = users_collection.find_one({"_id": user_id}, {"memories": 1})
    
    if not user:
        return []

    memories = user.get("memories", [])
    
    # 3. Convert datetime objects to strings so JSON can serialize them
    for m in memories:
        if 'created_at' in m and isinstance(m['created_at'], datetime):
            m['created_at'] = m['created_at'].isoformat()

    # 4. Save to Redis
    redis_client.setex(cache_key, CACHE_TTL, json.dumps(memories))
    
    return memories


def update_user_memory(user_id: str, memory_id: str, new_text: str):
    users_collection.update_one(
        {
            "_id": user_id,
            "memories.id": memory_id
        },
        {
            "$set": {
                "memories.$.text": new_text,
                "memory_updated_at": datetime.now(timezone.utc)
            }
        }
    )
    # Invalidate cache
    redis_client.delete(f"user_memories:{user_id}")

def delete_user_memory(user_id: str, memory_id: str):
    users_collection.update_one(
        {"_id": user_id},
        {
            "$pull": {"memories": {"id": memory_id}},
            "$set": {"memory_updated_at": datetime.now(timezone.utc)}
        }
    )
    # Invalidate cache
    redis_client.delete(f"user_memories:{user_id}")

def clear_user_memories(user_id: str):
    users_collection.update_one(
        {"_id": user_id},
        {"$set": {"memories": []}}
    )
    # Invalidate cache
    redis_client.delete(f"user_memories:{user_id}")

def get_memory_enabled(user_id: str) -> bool:
    cache_key = f"user_memory_enabled:{user_id}"
    
    # 1. Try Redis
    cached_flag = redis_client.get(cache_key)
    if cached_flag is not None:
        return json.loads(cached_flag) # correctly converts "true"/"false" string to boolean

    # 2. Fallback to MongoDB
    user = users_collection.find_one(
        {"_id": user_id},
        {"memory_enabled": 1}
    )

    enabled = user.get("memory_enabled", True) if user else True
    
    # 3. Save to Redis
    redis_client.setex(cache_key, CACHE_TTL, json.dumps(enabled))
    return enabled


def set_memory_enabled(user_id: str, enabled: bool):
    users_collection.update_one(
        {"_id": user_id},
        {
            "$set": {
                "memory_enabled": enabled,
            }
        },
        upsert=True
    )
    # Here we can directly update the cache since it's a simple boolean
    redis_client.setex(f"user_memory_enabled:{user_id}", CACHE_TTL, json.dumps(enabled))