from controllers.db.auth import signup, login
from fastapi import APIRouter, HTTPException, Request , Response
from pydantic import BaseModel

router = APIRouter()

class User(BaseModel):
    username: str
    password: str

@router.post("/auth")
async def auth(request: Request, response:Response):
    data = await request.json()
    action = data.get('action')
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password are required")
    
    user = User(username=username, password=password)

    if action == 'login':
        result = await login(user, response)
        if result["status_code"] != 201:
            raise HTTPException(status_code=result["status_code"], detail=result["error"])
        return {"message": result["access_token"], "access_token": result["access_token"]}
    
    elif action == 'signup':
        result = await signup(user, response)
        if result["status_code"] != 201:
            raise HTTPException(status_code=result["status_code"], detail=result["error"])
        return {"message": result["access_token"], "access_token": result["access_token"]}
    
    # else:
    #     raise HTTPException(status_code=400, detail="Invalid action. Use 'login' or 'signup'")

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")  
    return {"message": "Logged out successfully."}