from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import jwt
import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from bson import ObjectId
from pymongo import MongoClient


CONNECTION_STRING = "mongodb+srv://<username>:<password>@<cluster-url>/test?retryWrites=true&w=majority"
client = MongoClient(CONNECTION_STRING)
db = client['briefly']
users_collection = db['users']


SECRET_KEY = "your_secret_key_here"  
ALGORITHM = "HS256"


router = APIRouter()


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


@router.post("/signup", response_model=AuthResponse)
async def signup(user: User):
    if not user.username or not user.password:
        raise HTTPException(status_code=400, detail="Username and password are required")

    if get_user_by_username(user.username):
        raise HTTPException(status_code=400, detail="Username already exists")

    hashed_password = generate_password_hash(user.password)
    create_user({"username": user.username, "password": hashed_password})
    
    return {"message": "User registered successfully"}

@router.post("/login", response_model=Token)
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

