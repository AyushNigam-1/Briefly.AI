from controllers.db.auth import signup, login
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

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

    if action == 'login':
        result = await login(username, password, response)
        if result["status_code"] != 200:
            raise HTTPException(status_code=result["status_code"], detail=result["error"])
        return {"message": result["message"], "access_token": result["access_token"]}
    
    elif action == 'signup':
        user = User(username=username, password=password)
        result = await signup(user, response)
        if result["status_code"] != 201:
            raise HTTPException(status_code=result["status_code"], detail=result["error"])
        return {"message": result["message"], "access_token": result["access_token"]}
    
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'login' or 'signup'")
