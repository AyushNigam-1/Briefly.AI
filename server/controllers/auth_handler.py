# from werkzeug.security import generate_password_hash, check_password_hash
# from pydantic import BaseModel
# from typing import  List
# from .mongo import users_collection
# from utils.auth import create_access_token, create_refresh_token, decode_token
# from fastapi import HTTPException, Response , Request
# from dotenv import load_dotenv
# from bson import ObjectId
# import httpx
# import os

# load_dotenv()


# class User(BaseModel):
#     username: str
#     password: str
#     captcha_token: str


# class Token(BaseModel):
#     access_token: str
#     token_type: str
#     favorites: List[str]


# async def verify_captcha(token: str):
#     """Verify Cloudflare Turnstile CAPTCHA."""
#     secret_key = os.getenv("CAPTCHA_SECRET_KEY")

#     verify_url = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

#     async with httpx.AsyncClient() as client:
#         response = await client.post(
#             verify_url,
#             data={"secret": secret_key, "response": token}
#         )

#         result = response.json()

#         if not result.get("success"):
#             raise HTTPException(
#                 status_code=400,
#                 detail="CAPTCHA verification failed"
#             )


# def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
#     """Set secure auth cookies."""

#     response.set_cookie(
#         key="access_token",
#         value=access_token,
#         httponly=True,
#         secure=False,
#         samesite="Lax"
#     )

#     response.set_cookie(
#         key="refresh_token",
#         value=refresh_token,
#         httponly=True,
#         secure=False,
#         samesite="Lax"
#     )


# async def signup(user: User, response: Response):

#     if not user.username or not user.password:
#         raise HTTPException(status_code=400, detail="Username and password required")

#     await verify_captcha(user.captcha_token)

#     if users_collection.find_one({"username": user.username}):
#         raise HTTPException(status_code=400, detail="Username already exists")

#     hashed_password = generate_password_hash(user.password)

#     new_user = users_collection.insert_one({
#         "username": user.username,
#         "password": hashed_password,
#         "favorites": [],
#         "refresh_token": None
#     })

#     user_id = str(new_user.inserted_id)

#     token_data = {"username": user.username, "user_id": user_id}

#     access_token = create_access_token(token_data)
#     refresh_token = create_refresh_token(token_data)

#     users_collection.update_one(
#         {"_id": new_user.inserted_id},
#         {"$set": {"refresh_token": refresh_token}}
#     )

#     set_auth_cookies(response, access_token, refresh_token)

#     return {
#         "access_token": access_token,
#         "favorites": []
#     }


# async def login(user: User, response: Response):

#     if not user.username or not user.password:
#         raise HTTPException(status_code=400, detail="Username and password required")

#     await verify_captcha(user.captcha_token)

#     stored_user = users_collection.find_one({"username": user.username})

#     if not stored_user or not check_password_hash(stored_user["password"], user.password):
#         raise HTTPException(status_code=401, detail="Invalid username or password")

#     user_id = str(stored_user["_id"])
#     favorites = stored_user.get("favorites", [])

#     token_data = {"username": user.username, "user_id": user_id}

#     access_token = create_access_token(token_data)
#     refresh_token = create_refresh_token(token_data)

#     users_collection.update_one(
#         {"_id": stored_user["_id"]},
#         {"$set": {"refresh_token": refresh_token}}
#     )

#     set_auth_cookies(response, access_token, refresh_token)

#     return {
#         "access_token": access_token,
#         "favorites": favorites
#     }


# async def refresh_token(request: Request, response: Response):

#     refresh_token_cookie = request.cookies.get("refresh_token")

#     if not refresh_token_cookie:
#         raise HTTPException(status_code=401, detail="Missing refresh token")

#     payload = decode_token(refresh_token_cookie)

#     user = users_collection.find_one({
#         "_id": ObjectId(payload.get("user_id"))
#     })

#     if not user or user.get("refresh_token") != refresh_token_cookie:
#         raise HTTPException(status_code=401, detail="Invalid refresh token")

#     token_data = {
#         "username": payload["username"],
#         "user_id": payload["user_id"]
#     }

#     new_access_token = create_access_token(token_data)

#     response.set_cookie(
#         key="access_token",
#         value=new_access_token,
#         httponly=True,
#         secure=False,
#         samesite="Lax"
#     )

#     return {"access_token": new_access_token}

# async def get_current_user(request: Request):
#     """
#     Return the currently authenticated user.
#     Reads access_token from httpOnly cookie.
#     """

#     access_token = request.cookies.get("access_token")

#     if not access_token:
#         raise HTTPException(status_code=401, detail="Not authenticated")

#     try:
#         payload = decode_token(access_token)
#     except Exception:
#         raise HTTPException(status_code=401, detail="Invalid or expired token")

#     user_id = payload.get("user_id")

#     if not user_id:
#         raise HTTPException(status_code=401, detail="Invalid token payload")

#     user_doc = users_collection.find_one({"_id": ObjectId(user_id)})

#     if not user_doc:
#         raise HTTPException(status_code=404, detail="User not found")

#     return {
#         "user": {
#             "user_id": str(user_doc["_id"]),
#             "username": user_doc["username"],
#             "favorites": user_doc.get("favorites", [])
#         }
#     }

# async def logout(response: Response, request):

#     refresh_token = request.cookies.get("refresh_token")

#     if refresh_token:
#         payload = decode_token(refresh_token)
#         users_collection.update_one(
#             {"_id": payload.get("user_id")},
#             {"$set": {"refresh_token": None}}
#         )

#     response.delete_cookie("access_token")
#     response.delete_cookie("refresh_token")

#     return {"message": "Logged out successfully"}