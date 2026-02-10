from bson import ObjectId
from .conn import summary_collection 

def get_last_50_chats(id: str):
    try:
        # Check if the provided ID is a valid MongoDB ObjectId
        if ObjectId.is_valid(id):
            query = {"_id": ObjectId(id)}
        else:
            query = {"id": id}  # Fallback for custom string IDs

        # Projection: 
        # 1. Exclude _id ("_id": 0) if you don't want to return it
        # 2. Slice 'chat_history' to get the last 50 elements ("$slice": -50)
        # Note: Replace 'chat_history' with the actual name of your array field in MongoDB
        result = summary_collection.find_one(
            query,
            {"queries": {"$slice": -50}, "_id": 0} 
        )

        if result:
            return result["queries"]
        
        return []

    except Exception as e:
        print(f"Error fetching history: {e}")
        raise e