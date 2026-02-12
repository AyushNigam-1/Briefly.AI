from fastapi import APIRouter, HTTPException, Depends , Form
from pydantic import BaseModel
from utils.auth import get_current_user
from controllers.query.query_handler import chat_with_summary
from typing import Optional
from controllers.db.query import get_last_50_chats
from fastapi import UploadFile, File

router = APIRouter()

# class QueryRequest(BaseModel):
#     query: str
#     id: Optional[str] = None
#     files: list[UploadFile] = File(None),

@router.post("/query")
async def query_handler(query: str = Form(...),
    id: Optional[str] = Form(None),
    files: list[UploadFile] = File(None),
      user=Depends(get_current_user)):
    try:
        print("files",files)
        return await chat_with_summary(query, user["user_id"], id,files)
    except Exception as e:
        raise HTTPException(500, str(e))

@router.get("/history/{id}")
async def history(id: str):
    return {"id": id, "history": get_last_50_chats(id)}


