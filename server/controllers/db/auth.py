from fastapi import  HTTPException , Response
from pydantic import BaseModel
from typing import Optional
import jwt
import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from pymongo import MongoClient
from dotenv import load_dotenv
import os
from datetime import timedelta
from fastapi.security import OAuth2PasswordBearer
load_dotenv()

CONNECTION_STRING = os.getenv("mongo_db_uri")
client = MongoClient(CONNECTION_STRING)
db = client['briefly']
users_collection = db['users']

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

SECRET_KEY = "your_secret_key"
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



def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + (expires_delta or datetime.timedelta(hours=1))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
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

async def signup(user: User, response: Response):
    if not user.username or not user.password:
        raise HTTPException(status_code=400, detail="Username and password are required")

    if get_user_by_username(user.username):
        raise HTTPException(status_code=400, detail="Username already exists")

    hashed_password = generate_password_hash(user.password)
    create_user({"username": user.username, "password": hashed_password})

    token_data = {"username": user.username}
    access_token = create_access_token(data=token_data)
    response.set_cookie(key="access_token", value=access_token, httponly=True, max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60)

    return {"message": "User registered successfully", "status_code": 201}

async def login(user: User):
    if not user.username or not user.password:
        raise HTTPException(status_code=400, detail="Username and password are required")

    stored_user = get_user_by_username(user.username)
    if not stored_user or not check_password_hash(stored_user['password'], user.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token_data = {"username": user.username, "user_id": str(stored_user['_id'])}
    access_token = create_access_token(data=token_data)
    
    return {"access_token": access_token, "token_type": "bearer"}


def get_db():
    return db

