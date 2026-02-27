import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional
import os
from pymongo import MongoClient
from dotenv import load_dotenv
from fastapi.security import OAuth2PasswordBearer
from fastapi import  HTTPException 
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from typing import Any

load_dotenv()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

CONNECTION_STRING = os.getenv("mongo_db_uri")
client = MongoClient(CONNECTION_STRING)
db = client['briefly']
users_collection = db['users']

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS= 30

# OAuth2PasswordBearer will automatically extract the token from the Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_current_user(token: str = Depends(oauth2_scheme)) -> Any:
    try:
        payload = verify_token(token)
        print("this is the payload",payload)
        return payload  # Return the payload which might include user data like username or user_id
    except HTTPException as e:
        print(e)
        raise e

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc)+ (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
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
        payload = jwt.decode(state, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("username")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return username
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

