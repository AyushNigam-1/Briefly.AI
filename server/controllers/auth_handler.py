from werkzeug.security import generate_password_hash, check_password_hash
from pydantic import BaseModel
from typing import Optional, List
from .mongo import users_collection  # Correct import from the conn module
from utils.auth import create_access_token  # Correct import from utils.auth
from fastapi import HTTPException, Response
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class User(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    message: str
    token: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str
    favorites: List[str]


async def signup(user: User, response: Response):
    """Sign up a new user."""
    if not user.username or not user.password:
        raise HTTPException(status_code=400, detail="Username and password are required")

    # Check if the username already exists by querying the users_collection
    if users_collection.find_one({"username": user.username}):
        raise HTTPException(status_code=400, detail="Username already exists")

    # Hash the password and create the new user with an empty favorites list
    hashed_password = generate_password_hash(user.password)
    new_user = users_collection.insert_one({"username": user.username, "password": hashed_password, "favorites": []})

    # Fetch the user_id from the inserted user document
    user_id = str(new_user.inserted_id)

    # Create access token for the user, include user_id in the payload
    token_data = {"username": user.username, "user_id": user_id}
    access_token = create_access_token(data=token_data)

    # Set the token in the response cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=False,
        secure=False,
        samesite="Lax"
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "favorites": [],  # New users have an empty favorites list
        "status_code": 201
    }


async def login(user: User, response: Response):
    """Log in an existing user."""
    if not user.username or not user.password:
        raise HTTPException(status_code=400, detail="Username and password are required")

    # Fetch the user from the users_collection
    stored_user = users_collection.find_one({"username": user.username})

    print(stored_user)

    # Check if the user exists and if the password is correct
    if not stored_user or not check_password_hash(stored_user['password'], user.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    # Fetch the user_id and favorites list from the stored user document
    user_id = str(stored_user['_id'])
    favorites = stored_user.get("favorites", [])  # Ensure favorites is a list

    # Generate access token, include user_id in the payload
    token_data = {"username": user.username, "user_id": user_id}
    access_token = create_access_token(data=token_data)

    # Set the token in the response cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=False,
        secure=False,
        samesite="Lax"
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "favorites": favorites,  # Include the user's favorites list
        "status_code": 201
    }
