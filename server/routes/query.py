from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from controllers.query.query_handler import chat_with_summary  
from typing import Optional 
router = APIRouter()

class QueryRequest(BaseModel):
    query: str
    id: Optional[str] = None

@router.post("/query")
async def query_handler(request: QueryRequest):
    query = request.query
    id = request.id
    try:
        response = chat_with_summary(query,id)
        return response
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))
