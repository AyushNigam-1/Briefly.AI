from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from controllers.query.query_handler import chat_with_summary  

router = APIRouter()

class QueryRequest(BaseModel):
    query: str
    video_id: str

@router.post("/query")
async def query_handler(request: QueryRequest):
    query = request.query
    video_id = request.video_id
    print(query, video_id)
    try:
        response = chat_with_summary(query)
        print(response)
        return response
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))
