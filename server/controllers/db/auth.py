from fastapi import  HTTPException , Response
from pydantic import BaseModel
from typing import Optional
from werkzeug.security import generate_password_hash, check_password_hash
from pymongo import MongoClient
from dotenv import load_dotenv
import os
from utils.auth import create_access_token , create_user , get_user_by_username

load_dotenv()

CONNECTION_STRING = os.getenv("mongo_db_uri")
client = MongoClient(CONNECTION_STRING)
db = client['briefly']
users_collection = db['users']

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

class User(BaseModel):
    username: str
    password: str

class UserInDB(User):
    hashed_password: str

class AuthResponse(BaseModel):
    message: str
    token: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str


async def signup(user: User, response: Response):
    if not user.username or not user.password:
        raise HTTPException(status_code=400, detail="Username and password are required")

    if get_user_by_username(user.username):
        raise HTTPException(status_code=400, detail="Username already exists")

    hashed_password = generate_password_hash(user.password)
    create_user({"username": user.username, "password": hashed_password})

    token_data = {"username": user.username}
    access_token = create_access_token(data=token_data)
    response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=False,
            max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            secure=False,  
            samesite="Lax"  
        )
    return {"access_token": access_token, "token_type": "bearer","status_code":201}

async def login(user: User, response: Response):
    if not user.username or not user.password:
        raise HTTPException(status_code=400, detail="Username and password are required")

    stored_user = get_user_by_username(user.username)
    if not stored_user or not check_password_hash(stored_user['password'], user.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token_data = {"username": user.username, "user_id": str(stored_user['_id'])}
    access_token = create_access_token(data=token_data)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=False,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        secure=False,  
        samesite="Lax"  
    )


    
    return {"access_token": access_token, "token_type": "bearer","status_code":201}

