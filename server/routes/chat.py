from fastapi import APIRouter, HTTPException, Depends , Form 
from fastapi.responses import StreamingResponse  
from utils.auth import get_current_user
from controllers.chat_handler import chat_stream , get_chats_by_user
from typing import Optional
from controllers.chat_handler import get_last_50_chats
# from controllers.task_handler import perform_task
from fastapi import UploadFile, File

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
async def history(id: str):
    return {"id": id, "history": get_last_50_chats(id)}


@router.get("/chats/")
def get_user_summaries(current_user: dict = Depends(get_current_user)):
    try:
        summaries = get_chats_by_user(current_user["user_id"])
        return {"chats": summaries}
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
    