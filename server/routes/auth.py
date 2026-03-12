from controllers.auth_handler import signup, login, refresh_token, logout , get_current_user
from fastapi import APIRouter, HTTPException, Request, Response, Depends
from pydantic import BaseModel
from fastapi_limiter.depends import RateLimiter
from pyrate_limiter import Limiter, Rate, Duration

router = APIRouter()

auth_limiter = Limiter(Rate(5, Duration.MINUTE))
logout_limiter = Limiter(Rate(20, Duration.MINUTE))


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

    action = data.get("action")
    username = data.get("username")
    password = data.get("password")
    captcha_token = data.get("captcha_token")

    if not username or not password or not captcha_token:
        raise HTTPException(
            status_code=400,
            detail="Username, password and captcha required"
        )

    user = User(
        username=username,
        password=password,
        captcha_token=captcha_token
    )

    if action == "login":
        result = await login(user, response)

    elif action == "signup":
        result = await signup(user, response)

    else:
        raise HTTPException(
            status_code=400,
            detail="Invalid action"
        )

    return {
        "message": "Authentication successful",
        "favorites": result["favorites"]
    }


@router.post("/refresh")
async def refresh(request: Request, response: Response):
    return await refresh_token(request, response)

@router.get("/me")
async def me(request: Request):
    return await get_current_user(request)

@router.post(
    "/logout",
    dependencies=[Depends(RateLimiter(limiter=logout_limiter))]
)
async def logout_user(request: Request, response: Response):
    return await logout(response, request)