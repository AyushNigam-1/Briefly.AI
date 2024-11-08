from database.users import signup , login
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from utils import create_access_token 
router = APIRouter()

class AuthRequest(BaseModel):
    action: str
    username: str
    password: str

@router.post("/auth")
async def auth(request: Request, response: Response):
    data = await request.json()
    action = data.get('action')
    username = data.get('username')
    password = data.get('password')

    if action == 'login':
        response_data, status_code = login(username, password)
        if status_code != 200:
            raise HTTPException(status_code=status_code, detail=response_data["error"])
        
        user_data = {"username": username}  
        token = create_access_token(data=user_data)
        
        response.set_cookie(key="auth_token", value=token, httponly=True, secure=True)
        
        return {"message": "Login successful", "token": token}
    
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'login'")
