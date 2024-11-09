from controllers.db.auth import signup, login
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

router = APIRouter()

class User(BaseModel):
    username: str
    password: str

@router.post("/auth")
async def auth(request: Request):
    data = await request.json()
    action = data.get('action')
    username = data.get('username')
    password = data.get('password')
    print(username, password)

    if action == 'login':
        response_data, status_code = login(username, password)
        if status_code != 200:
            raise HTTPException(status_code=status_code, detail=response_data["error"])
        return {"message": "Login successful", "data": response_data}
    
    elif action == 'signup':
        user = User(username=username, password=password)
        response_data = await signup(user)  
        
        if response_data.get("status_code") != 201:
            raise HTTPException(status_code=response_data["status_code"], detail=response_data["error"])
        return {"message": "Signup successful", "data": response_data}
    
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'login' or 'signup'")
