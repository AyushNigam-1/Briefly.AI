import os
from pymongo import MongoClient
from dotenv import load_dotenv
from fastapi import HTTPException, Request
from bson import ObjectId
from datetime import datetime, timezone

load_dotenv()

CONNECTION_STRING = os.getenv("mongo_db_uri")
client = MongoClient(CONNECTION_STRING)
db = client['briefly']

users_collection = db['user']        
sessions_collection = db['session']  

async def get_current_user(request: Request):
    session_token = request.cookies.get("better-auth.session_token")
    print(session_token)
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token_id = session_token.split(".")[0]

    session_doc = sessions_collection.find_one({"token": token_id})

    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid or expired session")


    expires_at = session_doc.get("expiresAt")
    if expires_at:
        # If naive datetime (no tzinfo), treat it as UTC
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Session expired")

    user_id = session_doc.get("userId")
    if not user_id:
        raise HTTPException(status_code=401, detail="Malformed session")

    user_doc = users_collection.find_one({"_id": user_id})

    if not user_doc:
        try:
            user_doc = users_collection.find_one({"_id": ObjectId(user_id)})
        except Exception:
            pass

    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "user_id": str(user_doc["_id"]),
        "email": user_doc.get("email"),
        "name": user_doc.get("name"),
        "favorites": user_doc.get("favorites", [])
    }


def get_valid_username(current_user: dict) -> str:
    """Works with Better Auth user shape (uses email or name)."""
    identifier = current_user.get("name")
    if not identifier:
        raise HTTPException(status_code=401, detail="Invalid user token")
    return identifier