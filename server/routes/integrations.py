import os
import urllib.parse
import httpx
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import RedirectResponse
from utils.auth import get_current_user , get_valid_username , verify_state_token
from controllers.integrations_handler import (
    save_app_token, 
    get_all_app_tokens, 
    get_specific_app_token,
    AppTokenPayload,
    OAUTH_CONFIG
)

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
FRONTEND_URL = "http://10.207.18.43:3000"

router = APIRouter()

@router.post("/tokens")
async def add_app_token(payload: AppTokenPayload, current_user: dict = Depends(get_current_user)):
    return await save_app_token(payload, get_valid_username(current_user))

@router.get("/tokens")
async def get_all_tokens(current_user: dict = Depends(get_current_user)):
    return await get_all_app_tokens(get_valid_username(current_user))

@router.get("/tokens/{app_name}")
async def get_single_token(app_name: str, current_user: dict = Depends(get_current_user)):
    return await get_specific_app_token(app_name, get_valid_username(current_user))


@router.get("/{app_id}/login")
async def oauth_login(app_id: str, token: str): 
    if not token:
        raise HTTPException(status_code=401, detail="Token missing")
        
    config = OAUTH_CONFIG.get(app_id)
    if not config:
        raise HTTPException(status_code=404, detail=f"OAuth configuration for {app_id} not found")

    params = {**config["auth_params"], "state": token}
    query_string = urllib.parse.urlencode(params)
    
    return RedirectResponse(f"{config['auth_url']}?{query_string}")


@router.get("/{app_id}/callback")
async def generic_oauth_callback(app_id: str, code: str, state: str = None):
    """Handles OAuth callbacks for all configured applications."""
    config = OAUTH_CONFIG.get(app_id)
    if not config:
        raise HTTPException(status_code=404, detail="Invalid callback endpoint")

    username = verify_state_token(state)

    async with httpx.AsyncClient() as client:
        kwargs = config["get_token_kwargs"](code, config)
        response = await client.post(config["token_url"], **kwargs)
        
    data = response.json()
    access_token = data.get("access_token")

    if access_token:
        db_app_name = "google_drive" if app_id == "google" else app_id
        await save_app_token(AppTokenPayload(app_name=db_app_name, token=access_token), username)
    
    return RedirectResponse(url=FRONTEND_URL)