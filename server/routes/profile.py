from fastapi import APIRouter,HTTPException, Depends, Body
from utils.auth import get_current_user
from controllers.profile_handler import (
    get_profile,
    update_profile,
    delete_profile_field
)

router = APIRouter(prefix="/profile", tags=["profile"])

@router.get("/")
def fetch_profile(current_user=Depends(get_current_user)):
    user = get_profile(current_user["user_id"])
    print("user",user)
    if not user:
        raise HTTPException(404, "User not found")
    return user

@router.put("/")
def update_user_profile(
    payload: dict = Body(...),
    current_user=Depends(get_current_user)
):
    return update_profile(current_user["user_id"], payload)

@router.delete("/{field}")
def delete_field(field: str, current_user=Depends(get_current_user)):
    delete_profile_field(current_user["user_id"], field)
    return {"status": "success"}
