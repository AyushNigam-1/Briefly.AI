from werkzeug.security import generate_password_hash, check_password_hash
from pydantic import BaseModel
from typing import Optional, List
from .mongo import users_collection 
from utils.auth import create_access_token  
from fastapi import HTTPException, Response
from dotenv import load_dotenv
import httpx
import os

# Load environment variables
load_dotenv()

class User(BaseModel):
    username: str
    password: str
    captcha_token: str  # 🌟 Added to receive the token from the frontend


class AuthResponse(BaseModel):
    message: str
    token: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str
    favorites: List[str]


async def verify_captcha(token: str):
    """Verifies the CAPTCHA token with the provider."""
    secret_key = os.getenv("CAPTCHA_SECRET_KEY")
    
    # This URL is for Cloudflare Turnstile. 
    # If using Google reCAPTCHA, use: https://www.google.com/recaptcha/api/siteverify
    verify_url = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
    
    async with httpx.AsyncClient() as client:
        # We send our secret key and the user's token to the provider
        response = await client.post(
            verify_url,
            data={"secret": secret_key, "response": token}
        )
        result = response.json()
        
        # If the provider says "false", we block the request immediately
        if not result.get("success"):
            # Sentry will catch this 400 error if someone is trying to spam you!
            raise HTTPException(status_code=400, detail="CAPTCHA verification failed. Bot behavior detected.")


async def signup(user: User, response: Response):
    """Sign up a new user."""
    if not user.username or not user.password:
        raise HTTPException(status_code=400, detail="Username and password are required")

    # 🌟 1. Verify CAPTCHA before touching the database
    await verify_captcha(user.captcha_token)

    # 2. Check if the username already exists by querying the users_collection
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
        secure=False,
        samesite="Lax",
        httponly=False,
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

    # 🌟 1. Verify CAPTCHA before heavy password hashing or DB lookups
    await verify_captcha(user.captcha_token)

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
        secure=False,
        samesite="Lax",
        httponly=False,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "favorites": favorites,  # Include the user's favorites list
        "status_code": 201
    }