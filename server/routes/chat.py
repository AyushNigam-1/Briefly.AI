from fastapi import APIRouter, HTTPException, Depends, Form, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from utils.auth import get_current_user
from pydantic import BaseModel
from controllers.chat_handler import (
    chat_stream,
    get_chats_by_user,
    delete_summary_by_id,
    toggle_chat_pin,
    get_chat_history
)
from typing import Optional, List
from datetime import datetime
from fastapi_limiter.depends import RateLimiter
from pyrate_limiter import Limiter, Rate, Duration

router = APIRouter()

query_limiter = Limiter(Rate(20, Duration.MINUTE))
read_limiter = Limiter(Rate(60, Duration.MINUTE))
mutation_limiter = Limiter(Rate(30, Duration.MINUTE))


class ChatRequest(BaseModel):
    messages: List[dict]
    id: Optional[str] = None
    modal_name: Optional[str] = None

@router.post("/query")
async def query_handler(
    body: ChatRequest,
    user=Depends(get_current_user)
):
    user_id = user["user_id"]

    last_user_message = body.messages[-1]["content"]

    generator = chat_stream(
        user_input=last_user_message,
        user_id=user_id,
        chat_id=body.id,
        modal_name=body.modal_name
    )

    return StreamingResponse(generator, media_type="text/event-stream")


@router.get(
    "/history/{id}",
    dependencies=[Depends(RateLimiter(limiter=read_limiter))]
)
async def get_history(
    id: str,
    limit: int = Query(default=5, ge=1, le=100),
    before: Optional[datetime] = Query(default=None)
):
    history = get_chat_history(id, limit, before)
    return {
        "id": id,
        "history": history,
        "has_more": len(history) == limit
    }


@router.get(
    "/chats/",
    dependencies=[Depends(RateLimiter(limiter=read_limiter))]
)
def get_user_summaries(current_user: dict = Depends(get_current_user)):
    try:
        summaries = get_chats_by_user(current_user["user_id"])
        return {"chats": summaries}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


class PinRequest(BaseModel):
    is_pinned: bool


@router.delete(
    "/summary/",
    dependencies=[Depends(RateLimiter(limiter=mutation_limiter))]
)
async def delete_chat_route(
    id: str,
    user=Depends(get_current_user)
):
    return await delete_summary_by_id(
        chat_id=id,
        user_id=str(user["user_id"])
    )


@router.patch(
    "/summary/{chat_id}/pin",
    dependencies=[Depends(RateLimiter(limiter=mutation_limiter))]
)
async def toggle_pin_chat_route(
    chat_id: str,
    request: PinRequest,
    user=Depends(get_current_user)
):
    return await toggle_chat_pin(
        chat_id=chat_id,
        user_id=str(user["user_id"]),
        is_pinned=request.is_pinned
    )