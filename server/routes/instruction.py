from fastapi import APIRouter, HTTPException , Depends ,Body
from controllers.instruction_handler import get_prompt_by_user, update_prompt_for_user  
from utils.auth import get_current_user

router = APIRouter(prefix="/preference", tags=["preference"])

@router.get("/get")
def read_prompts( current_user: dict = Depends(get_current_user)):
    try:
        user_id = current_user["user_id"]
        response = get_prompt_by_user(user_id)
        
        if "error" in response:
            raise HTTPException(status_code=404, detail=response["error"])
        
        return response
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/update")
def update_prompt(payload: dict = Body(...), current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]

    field = payload.get("field")
    value = payload.get("value")

    if not field:
        raise HTTPException(status_code=400, detail="Missing field")

    response = update_prompt_for_user(user_id, field, value)

    if "error" in response:
        raise HTTPException(status_code=400, detail=response["error"])

    return response

