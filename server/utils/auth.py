import jwt
from datetime import datetime , timedelta
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
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# OAuth2PasswordBearer will automatically extract the token from the Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_current_user(token: str = Depends(oauth2_scheme)) -> Any:
    print(token)
    try:
        payload = verify_token(token)
        return payload  # Return the payload which might include user data like username or user_id
    except HTTPException as e:
        raise e

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + (expires_delta or timedelta(hours=1))
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

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt