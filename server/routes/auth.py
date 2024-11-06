from database.users import signup , login
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

router = APIRouter()

class AuthRequest(BaseModel):
    action: str
    username: str
    password: str

@router.post("/auth")
async def auth(request: Request):
    data = await request.json()
    action = data.get('action')
    username = data.get('username')
    password = data.get('password')

    if action == 'signup':
        response, status_code = signup(username, password)
        if status_code != 201:
            raise HTTPException(status_code=status_code, detail=response["error"])
        return response
    elif action == 'login':
        response, status_code = login(username, password)
        if status_code != 200:
            raise HTTPException(status_code=status_code, detail=response["error"])
        return response
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'signup' or 'login'")
