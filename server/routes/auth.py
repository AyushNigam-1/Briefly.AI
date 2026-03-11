from controllers.auth_handler import signup, login
from fastapi import APIRouter, HTTPException, Request, Response, Depends
from pydantic import BaseModel
from fastapi_limiter.depends import RateLimiter
from pyrate_limiter import Limiter, Rate, Duration

router = APIRouter()

auth_limiter = Limiter(Rate(5, Duration.MINUTE))     # 5 attempts per minute
logout_limiter = Limiter(Rate(20, Duration.MINUTE))  # 20 per minute

# 🌟 1. Update the local model to expect the token
class User(BaseModel):
    username: str
    password: str
    captcha_token: str 


@router.post(
    "/auth",
    dependencies=[Depends(RateLimiter(limiter=auth_limiter))]
)
async def auth(request: Request, response: Response):
    data = await request.json()
    action = data.get('action')
    username = data.get('username')
    password = data.get('password')
    captcha_token = data.get('captcha_token')  # 🌟 2. Extract the token from the frontend

    # 🌟 3. Ensure all three pieces of data are present
    if not username or not password or not captcha_token:
        raise HTTPException(status_code=400, detail="Username, password, and CAPTCHA token are required")

    # 🌟 4. Pass the token into the User object
    user = User(username=username, password=password, captcha_token=captcha_token)

    if action == 'login':
        result = await login(user, response)
    elif action == 'signup':
        result = await signup(user, response)
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'login' or 'signup'")

    if result.get("status_code") != 201:
        raise HTTPException(
            status_code=result.get("status_code", 400),
            detail=result.get("error", "Unknown error")
        )

    return {
        "message": "Authentication successful",
        "favourites": result["favorites"]
    }


@router.post(
    "/logout",
    dependencies=[Depends(RateLimiter(limiter=logout_limiter))]
)
async def logout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "Logged out successfully."}