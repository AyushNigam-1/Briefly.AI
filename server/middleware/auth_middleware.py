from fastapi import Request, HTTPException
import jwt
import os
from dotenv import load_dotenv
load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"

async def auth_middleware(request: Request, call_next):
    # Exclude the /auth route from the middleware logic
    excluded_routes = ["/auth"]
    if request.url.path in excluded_routes:
        return await call_next(request)

    # Check for the Authorization header
    auth_header = request.headers.get("Authorization")
    print(auth_header , request.headers)
    if auth_header is None or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization token is missing or invalid")

    # Extract the token from the Authorization header
    token = auth_header.split(" ")[1]

    try:
        # Verify the token without decoding its payload
        jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": True})
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid authorization token")

    # Continue processing the request
    response = await call_next(request)
    return response

