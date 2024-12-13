from fastapi import APIRouter, HTTPException , Depends ,Body
from controllers.db.prompt import get_prompt_by_user, update_prompt_for_user  
from utils.auth import get_current_user

router = APIRouter()

@router.get("/get-prompt")
def read_prompts( current_user: dict = Depends(get_current_user)):
    try:
        user_id = current_user["user_id"]
        response = get_prompt_by_user(user_id)
        
        if "error" in response:
            raise HTTPException(status_code=404, detail=response["error"])
        
        return response
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/update-prompt")
def update_prompt( new_prompt: str = Body(..., embed=True) , current_user: dict = Depends(get_current_user)):
    print(new_prompt)
    try:
        user_id = current_user["user_id"]
        response = update_prompt_for_user(user_id, new_prompt)
        
        if "error" in response:
            raise HTTPException(status_code=400, detail=response["error"])
        
        return response
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
