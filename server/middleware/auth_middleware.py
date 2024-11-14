

from fastapi import Request, HTTPException


async def auth_middleware(request: Request, call_next):
    
    auth_header = request.headers.get("Authorization")
    if auth_header is None or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization token is missing or invalid")

    
    token = auth_header.split(" ")[1]

    
    if token != "your_valid_token_here":  
        raise HTTPException(status_code=401, detail="Invalid authorization token")

    
    response = await call_next(request)
    return response
