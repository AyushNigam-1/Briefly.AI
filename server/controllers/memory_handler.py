from datetime import datetime, timezone
from uuid import uuid4
from controllers.mongo import users_collection

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


def get_user_memories(user_id: str):
    user = users_collection.find_one({"_id": user_id}, {"memories": 1})

    if not user:
        return []

    return user.get("memories", [])


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

def delete_user_memory(user_id: str, memory_id: str):
    users_collection.update_one(
        {"_id": user_id},
        {
            "$pull": {"memories": {"id": memory_id}},
            "$set": {"memory_updated_at": datetime.now(timezone.utc)}
        }
    )

def clear_user_memories(user_id: str):
    users_collection.update_one(
        {"_id": user_id},
        {"$set": {"memories": []}}
    )

def get_memory_enabled(user_id: str) -> bool:
    user = users_collection.find_one(
        {"_id": user_id},
        {"memory_enabled": 1}
    )

    if not user:
        return True  # default ON

    return user.get("memory_enabled", True)


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
