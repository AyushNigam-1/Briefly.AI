from datetime import datetime, timezone
from controllers.mongo import users_collection

def save_user_memories(user_id: str, memories: list[str]):
    if not memories:
        return

    users_collection.update_one(
        {"_id": user_id},
        {
            "$addToSet": {"memories": {"$each": memories}},
            "$set": {"memory_updated_at": datetime.now(timezone.utc)}
        },
        upsert=True
    )

def get_user_memories(user_id: str) -> list[str]:
    user = users_collection.find_one({"_id": user_id})

    if not user:
        return []

    return user.get("memories", [])

def clear_user_memories(user_id: str):
    users_collection.update_one(
        {"_id": user_id},
        {"$set": {"memories": []}}
    )