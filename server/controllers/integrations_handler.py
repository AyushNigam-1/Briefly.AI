from .mongo import users_collection  
from fastapi import HTTPException
from pydantic import BaseModel
import os
from bson.objectid import ObjectId

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

class AppTokenPayload(BaseModel):
    app_name: str
    token: str

OAUTH_CONFIG = {
    "notion": {
        "auth_url": "https://api.notion.com/v1/oauth/authorize",
        "token_url": "https://api.notion.com/v1/oauth/token",
        "auth_params": {
            "client_id": os.getenv("NOTION_CLIENT_ID"),
            "response_type": "code",
            "owner": "user",
            "redirect_uri": f"{BACKEND_URL}/notion/callback", 
        },
        "get_token_kwargs": lambda code, cfg: {
            "auth": (os.getenv("NOTION_CLIENT_ID"), os.getenv("NOTION_CLIENT_SECRET")),
            "json": {"grant_type": "authorization_code", "code": code, "redirect_uri": cfg["auth_params"]["redirect_uri"]}
        }
        },
    "google_drive": {
        "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "auth_params": {
            "client_id": os.getenv("GOOGLE_CLIENT_ID"),
            "response_type": "code",
            "scope": "https://www.googleapis.com/auth/drive",
            "redirect_uri": f"{BACKEND_URL}/google_drive/callback", 
            "access_type": "offline",
            "prompt": "consent",
        },
        "get_token_kwargs": lambda code, cfg: {
            "headers": {"Content-Type": "application/x-www-form-urlencoded"},
            "data": {
                "client_id": cfg["auth_params"]["client_id"],
                "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": cfg["auth_params"]["redirect_uri"]
            }
        }
    },
"linear": {
        "auth_url": "https://linear.app/oauth/authorize",
        "token_url": "https://api.linear.app/oauth/token",
        "auth_params": {
            "client_id": os.getenv("LINEAR_CLIENT_ID"),
            "response_type": "code",
            "scope": "read,write", 
            "redirect_uri": f"{BACKEND_URL}/linear/callback",
            "prompt": "consent"
        },
        "get_token_kwargs": lambda code, cfg: {
            "headers": {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            "data": {
                "client_id": cfg["auth_params"]["client_id"],
                "client_secret": os.getenv("LINEAR_CLIENT_SECRET"),
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": cfg["auth_params"]["redirect_uri"]
            }
        }
    },
      "slack": {
        "auth_url": "https://slack.com/oauth/v2/authorize",
        "token_url": "https://slack.com/api/oauth.v2.access",
        "auth_params": {
            "client_id": os.getenv("SLACK_CLIENT_ID"),
            "scope": "channels:read,groups:read,users:read,users.profile:read,chat:write,reactions:write,channels:history,groups:history",
            "redirect_uri": f"{BACKEND_URL}/slack/callback",
        },
        "get_token_kwargs": lambda code, cfg: {
            "headers": {"Content-Type": "application/x-www-form-urlencoded"},
            "data": {
                "client_id": cfg["auth_params"]["client_id"],
                "client_secret": os.getenv("SLACK_CLIENT_SECRET"),
                "code": code,
                "redirect_uri": cfg["auth_params"]["redirect_uri"]
            }
        }
    }
}

async def save_app_token(payload: AppTokenPayload, current_username: str):
    result = users_collection.update_one(
        {"name": current_username},
        {"$set": {f"app_tokens.{payload.app_name}": payload.token}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {"message": f"Token for {payload.app_name} saved successfully", "status_code": 200}

async def get_all_app_tokens(user_id: str):
    if user_id == "guest":
        return {"app_tokens": {}}
    user = users_collection.find_one({"_id": ObjectId(user_id)}, {"app_tokens": 1, "_id": 0})
    app_tokens = user.get("app_tokens") if user else None
    print(user, app_tokens)
    if app_tokens is None:
        app_tokens = {}

    return {"app_tokens": app_tokens,"status_code": 200}

async def get_specific_app_token(app_name: str, current_username: str):
    user = users_collection.find_one({"name": current_username}, {f"app_tokens.{app_name}": 1, "_id": 0})
    
    if not user or "app_tokens" not in user or app_name not in user["app_tokens"]:
        raise HTTPException(status_code=404, detail=f"Token for '{app_name}' not found")
        
    return {
        "app_name": app_name, 
        "token": user["app_tokens"][app_name], 
        "status_code": 200
    }