from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from utils.auth import get_current_user
from controllers.query.query_handler import chat_with_summary
from typing import Optional
from controllers.db.query import get_last_50_chats
from fastapi import UploadFile, File

router = APIRouter()

class QueryRequest(BaseModel):
    query: str
    id: Optional[str] = None
    files: list[UploadFile] = File(None),

@router.post("/query")
async def query_handler(req: QueryRequest, user=Depends(get_current_user)):
    try:
        return chat_with_summary(req.query, user["user_id"], req.id,req.files)
    except Exception as e:
        raise HTTPException(500, str(e))

@router.get("/history/{id}")
async def history(id: str):
    return {"id": id, "history": get_last_50_chats(id)}
