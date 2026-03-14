
from .mongo import users_collection  # Correct import from the conn module
from fastapi import HTTPException
from pydantic import BaseModel
import os

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
            "redirect_uri": "http://localhost:8000/notion/callback",
        },
        # Notion uses JSON body and Basic Auth
        "get_token_kwargs": lambda code, cfg: {
            "auth": (os.getenv("NOTION_CLIENT_ID"), "secret_43gxzrplC0ATp55aDmYU5h84dBoU3YfYiLQxz0NhJKF"),
            "json": {"grant_type": "authorization_code", "code": code, "redirect_uri": cfg["auth_params"]["redirect_uri"]}
        }
        },
    "google": {
        "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "auth_params": {
            "client_id": os.getenv("GOOGLE_CLIENT_ID"),
            "response_type": "code",
            "scope": "https://www.googleapis.com/auth/drive",
            "redirect_uri": "http://localhost:8000/google/callback",
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
            # Linear uses comma-separated scopes. 'read,write' gives full access to their workspace.
            # You can downgrade this to just 'read' if you only want the AI to fetch data, not create issues.
            "scope": "read,write", 
            "redirect_uri": "http://localhost:8000/linear/callback",
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
            "redirect_uri": "http://localhost:8000/slack/callback",
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
    """
    Saves or updates a token for a specific app (e.g., Notion, Google Drive).
    Requires the current logged-in user's username.
    """
    # Uses dot notation to update a specific key within the app_tokens dictionary
    result = users_collection.update_one(
        {"name": current_username},
        {"$set": {f"app_tokens.{payload.app_name}": payload.token}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {"message": f"Token for {payload.app_name} saved successfully", "status_code": 200}


async def get_all_app_tokens(current_username: str):
    """
    Retrieves all connected app tokens for the current user.
    """
    user = users_collection.find_one({"name": current_username}, {"app_tokens": 1, "_id": 0})
    app_tokens = user.get("app_tokens")

    if app_tokens is None:
        app_tokens = []

    return {"app_tokens": app_tokens,"status_code": 200}

async def get_specific_app_token(app_name: str, current_username: str):
    """
    Retrieves the token for one specific app.
    """
    user = users_collection.find_one({"name": current_username}, {f"app_tokens.{app_name}": 1, "_id": 0})
    
    if not user or "app_tokens" not in user or app_name not in user["app_tokens"]:
        raise HTTPException(status_code=404, detail=f"Token for '{app_name}' not found")
        
    return {
        "app_name": app_name, 
        "token": user["app_tokens"][app_name], 
        "status_code": 200
    }

