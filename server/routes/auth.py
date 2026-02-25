from controllers.auth_handler import (
    signup, 
    login, 
    save_app_token, 
    get_all_app_tokens, 
    get_specific_app_token,
    AppTokenPayload
)
import os
import jwt 
from fastapi import APIRouter, HTTPException, Request, Response ,Depends
from pydantic import BaseModel
from utils.auth import get_current_user
import httpx
from fastapi.responses import RedirectResponse

# Credentials from Developer Portals
NOTION_CLIENT_ID = "312d872b-594c-819f-a846-0037e48b9fea"
NOTION_CLIENT_SECRET = "secret_43gxzrplC0ATp55aDmYU5h84dBoU3YfYiLQxz0NhJKF"
NOTION_REDIRECT_URI = "http://localhost:8000/notion/callback"
DISCORD_CLIENT_ID = os.getenv("DISCORD_CLIENT_ID")
DISCORD_CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET")
DISCORD_REDIRECT_URI = "http://localhost:8000/discord/callback"
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = "http://localhost:8000/google/callback"
SLACK_CLIENT_ID = os.getenv("SLACK_CLIENT_ID")
SLACK_CLIENT_SECRET = os.getenv("SLACK_CLIENT_SECRET")
SLACK_REDIRECT_URI = "http://localhost:8000/slack/callback"

router = APIRouter()

class User(BaseModel):
    username: str
    password: str

@router.post("/auth")
async def auth(request: Request, response: Response):
    data = await request.json()
    action = data.get('action')
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password are required")

    user = User(username=username, password=password)

    if action == 'login':
        result = await login(user, response)
    elif action == 'signup':
        result = await signup(user, response)
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'login' or 'signup'")

    if result.get("status_code") != 201:
        raise HTTPException(status_code=result.get("status_code", 400), detail=result.get("error", "Unknown error"))

    return {
        "message": "Authentication successful",
        "favourites": result["favorites"]
    }

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")  
    return {"message": "Logged out successfully."}

@router.post("/tokens")
async def add_app_token(payload: AppTokenPayload, current_user: dict = Depends(get_current_user)):
    """
    Save or update an OAuth/API token for a specific app (e.g., Notion, Google Drive).
    """
    username = current_user.get("username")
    if not username:
        raise HTTPException(status_code=401, detail="Invalid user token")
    
    return await save_app_token(payload, username)

@router.get("/tokens")
async def get_all_tokens(current_user: dict = Depends(get_current_user)):
    """
    Retrieve all connected app tokens for the authenticated user.
    """
    username = current_user.get("username")
    if not username:
        raise HTTPException(status_code=401, detail="Invalid user token")
        
    return await get_all_app_tokens(username)

@router.get("/tokens/{app_name}")
async def get_single_token(app_name: str, current_user: dict = Depends(get_current_user)):
    """
    Retrieve the token for one specific app.
    """
    username = current_user.get("username")
    if not username:
        raise HTTPException(status_code=401, detail="Invalid user token")
        
    return await get_specific_app_token(app_name, username)


import urllib.parse
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse

@router.get("/{app_id}/login")
async def oauth_login(app_id: str, token: str): 
    if not token:
        raise HTTPException(status_code=401, detail="Token missing")

    if app_id == "notion":
        params = {
            "client_id": NOTION_CLIENT_ID,
            "response_type": "code",
            "owner": "user",
            "redirect_uri": NOTION_REDIRECT_URI,
            "state": token  # <-- Safely passed here
        }
        
        query_string = urllib.parse.urlencode(params)
        
        url = f"https://api.notion.com/v1/oauth/authorize?{query_string}"
        
        return RedirectResponse(url)
    
    if app_id == "discord":
        params = {
            "client_id": DISCORD_CLIENT_ID,
            "response_type": "code",
            "scope": "identify email",
            "redirect_uri": DISCORD_REDIRECT_URI,
            "state": token
        }

        query = urllib.parse.urlencode(params)
        return RedirectResponse(f"https://discord.com/api/oauth2/authorize?{query}")
    
    if app_id == "google_drive":
        params = {
            "client_id": GOOGLE_CLIENT_ID,
            "response_type": "code",
            "scope": "https://www.googleapis.com/auth/drive.readonly",
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "access_type": "offline",
            "prompt": "consent",
            "state": token
        }

        query = urllib.parse.urlencode(params)
        return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{query}")
    
    if app_id == "slack":
        params = {
            "client_id": SLACK_CLIENT_ID,
            "scope": "channels:read users:read chat:write",
            "redirect_uri": SLACK_REDIRECT_URI,
            "state": token
        }

        query = urllib.parse.urlencode(params)
        return RedirectResponse(f"https://slack.com/oauth/v2/authorize?{query}")

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"

@router.get("/notion/callback")
async def notion_callback(code: str, state: str = None):
    if not state:
        raise HTTPException(status_code=401, detail="Authentication state missing")

    try:
        payload = jwt.decode(state, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("username")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except :
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.notion.com/v1/oauth/token",
            auth=(NOTION_CLIENT_ID, NOTION_CLIENT_SECRET),
            json={"grant_type": "authorization_code", "code": code, "redirect_uri": NOTION_REDIRECT_URI}
        )
        data = response.json()
        notion_token = data.get("access_token")

    if notion_token:
        await save_app_token(AppTokenPayload(app_name="notion", token=notion_token), username)
    
    return RedirectResponse(url="http://localhost:3000")

@router.get("/discord/callback")
async def discord_callback(code: str, state: str = None):

    if not state:
        raise HTTPException(status_code=401, detail="Authentication state missing")

    try:
        payload = jwt.decode(state, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("username")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://discord.com/api/oauth2/token",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data={
                "client_id": DISCORD_CLIENT_ID,
                "client_secret": DISCORD_CLIENT_SECRET,
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": DISCORD_REDIRECT_URI
            }
        )

    data = response.json()
    discord_token = data.get("access_token")

    if discord_token:
        await save_app_token(
            AppTokenPayload(app_name="discord", token=discord_token),
            username
        )

    return RedirectResponse("http://localhost:3000")

@router.get("/google/callback")
async def google_callback(code: str, state: str = None):

    if not state:
        raise HTTPException(status_code=401)

    payload = jwt.decode(state, SECRET_KEY, algorithms=[ALGORITHM])
    username = payload.get("username")

    async with httpx.AsyncClient() as client:
        r = await client.post(
            "https://oauth2.googleapis.com/token",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data={
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": GOOGLE_REDIRECT_URI
            }
        )

    data = r.json()
    google_token = data.get("access_token")

    if google_token:
        await save_app_token(
            AppTokenPayload(app_name="google_drive", token=google_token),
            username
        )

    return RedirectResponse("http://localhost:3000")

@router.get("/slack/callback")
async def slack_callback(code: str, state: str = None):

    if not state:
        raise HTTPException(status_code=401)

    payload = jwt.decode(state, SECRET_KEY, algorithms=[ALGORITHM])
    username = payload.get("username")

    async with httpx.AsyncClient() as client:
        r = await client.post(
            "https://slack.com/api/oauth.v2.access",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data={
                "client_id": SLACK_CLIENT_ID,
                "client_secret": SLACK_CLIENT_SECRET,
                "code": code,
                "redirect_uri": SLACK_REDIRECT_URI
            }
        )

    data = r.json()
    slack_token = data.get("access_token")

    if slack_token:
        await save_app_token(
            AppTokenPayload(app_name="slack", token=slack_token),
            username
        )

    return RedirectResponse("http://localhost:3000")