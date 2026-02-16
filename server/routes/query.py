from fastapi import APIRouter, HTTPException, Depends , Form
from pydantic import BaseModel
from utils.auth import get_current_user
from controllers.query.query_handler import chat_with_summary
from typing import Optional
from controllers.db.query import get_last_50_chats
from controllers.task.task_handler import perform_task
from fastapi import UploadFile, File

router = APIRouter()

# class QueryRequest(BaseModel):
#     query: str
#     id: Optional[str] = None
#     files: list[UploadFile] = File(None),

@router.post("/query")
async def query_handler(
    query: str = Form(...),
    id: Optional[str] = Form(None),
    mode: str = Form("task"),  # Default to chat
    files: list[UploadFile] = File(None),
    user=Depends(get_current_user)
):
    try:
        user_id = user["user_id"]

        # -------------------------------------------
        # SWITCH LOGIC
        # -------------------------------------------
        if mode == "task":
            # Direct to the specialized Task Controller
            return await perform_task(
                user_input=query,
                user_id=user_id,
                chat_id=id
            )
        else:
            # Direct to the Standard Chat/RAG Controller
            return await chat_with_summary(
                user_input=query, 
                user=user_id, 
                id=id, 
                files=files
            )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/{id}")
async def history(id: str):
    return {"id": id, "history": get_last_50_chats(id)}


