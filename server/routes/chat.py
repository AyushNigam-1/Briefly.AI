from fastapi import APIRouter, HTTPException, Depends , Form 
from fastapi.responses import StreamingResponse  
from utils.auth import get_current_user
from pydantic import BaseModel
from controllers.chat_handler import chat_stream , get_chats_by_user , delete_summary_by_id , toggle_chat_pin
from typing import Optional
from controllers.chat_handler import get_chat_history
from fastapi import UploadFile, File
from typing import Optional
from datetime import datetime
from fastapi import Query
router = APIRouter()    

@router.post("/query")
async def query_handler(
    query: str = Form(...),
    id: Optional[str] = Form(None),
    files: list[UploadFile] = File(None),
    modal_name: Optional[str] = Form(None),
    user=Depends(get_current_user)
):
    user_id = user["user_id"]

    generator = chat_stream(
        user_input=query,
        user_id=user_id,
        chat_id=id,
        files=files,
        modal_name=modal_name
    )

    return StreamingResponse(generator, media_type="text/event-stream")

@router.get("/history/{id}")
async def get_history(
    id: str,
    limit: int = Query(default=5, ge=1, le=100, description="Chats per page"),
    before: Optional[datetime] = Query(
        default=None, 
        description="ISO datetime to load chats BEFORE (for infinite scroll)"
    )
):
    """Get paginated chat history - perfect for infinite scroll up"""
    history = get_chat_history(id, limit, before)
    return {
        "id": id,
        "history": history,
        "has_more": len(history) == limit   # ← very useful for frontend
    }


@router.get("/chats/")
def get_user_summaries(current_user: dict = Depends(get_current_user)):
    try:
        summaries = get_chats_by_user(current_user["user_id"])
        return {"chats": summaries}
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

class PinRequest(BaseModel):
    is_pinned: bool

@router.delete("/summary/")
async def delete_chat_route(
    id: str, 
    user=Depends(get_current_user)
):
    """API Endpoint to delete a summary."""
    # Pass the clean data to the controller
    return await delete_summary_by_id(
        chat_id=id, 
        user_id=str(user["user_id"])
    )


@router.patch("/summary/{chat_id}/pin")
async def toggle_pin_chat_route(
    chat_id: str, 
    request: PinRequest, 
    user=Depends(get_current_user)
):
    """API Endpoint to pin or unpin a summary."""
    # Pass the clean data to the controller
    return await toggle_chat_pin(
        chat_id=chat_id, 
        user_id=str(user["user_id"]), 
        is_pinned=request.is_pinned
    )