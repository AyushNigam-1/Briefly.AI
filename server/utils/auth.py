import jwt
import os
from datetime import datetime, timedelta
from pymongo import MongoClient
from dotenv import load_dotenv
from fastapi.security import OAuth2PasswordBearer
from fastapi import  HTTPException , Request
from fastapi.security import OAuth2PasswordBearer
from bson import ObjectId

load_dotenv()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

CONNECTION_STRING = os.getenv("mongo_db_uri")
client = MongoClient(CONNECTION_STRING)
db = client['briefly']
users_collection = db['users']

ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7
SECRET = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


async def get_current_user(request: Request):

    access_token = request.cookies.get("access_token")

    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = decode_token(access_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("user_id")

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user_doc = users_collection.find_one({"_id": ObjectId(user_id)})

    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "user_id": str(user_doc["_id"]),
        "username": user_doc["username"],
        "favorites": user_doc.get("favorites", [])
    }


def create_access_token(data: dict):
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(payload, SECRET, algorithm=ALGORITHM)


def create_refresh_token(data: dict):
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    return jwt.encode(payload, SECRET, algorithm=ALGORITHM)


def decode_token(token: str):
    return jwt.decode(token, SECRET, algorithms=[ALGORITHM])

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_user_by_username(username: str):
    return users_collection.find_one({"username": username})

def create_user(user_data: dict):
    users_collection.insert_one(user_data)

def get_valid_username(current_user: dict) -> str:
    """Extracts and validates username from the current user dependency."""
    username = current_user.get("username")
    if not username:
        raise HTTPException(status_code=401, detail="Invalid user token")
    return username

def verify_state_token(state: str) -> str:
    """Decodes the JWT state token and returns the username."""
    if not state:
        raise HTTPException(status_code=401, detail="Authentication state missing")
    try:
        payload = jwt.decode(state, SECRET, algorithms=[ALGORITHM])
        username = payload.get("username")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return username
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

