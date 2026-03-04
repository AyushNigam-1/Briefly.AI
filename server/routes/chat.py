from fastapi import APIRouter, HTTPException, Depends, Form, UploadFile, File, Query, Response 
from fastapi.responses import StreamingResponse
from utils.auth import get_current_user
from pydantic import BaseModel, Field
from controllers.chat_handler import (
    chat_stream,
    get_chats_by_user,
    delete_summary_by_id,
    toggle_chat_pin,
    get_chat_history,
    generate_audio_from_text,
    regenerate_chat_stream,
    edit_chat_stream,
    private_chat_stream
)
from typing import Optional
from datetime import datetime
from fastapi_limiter.depends import RateLimiter
from pyrate_limiter import Limiter, Rate, Duration
from fastapi import APIRouter, Depends, Form, File, UploadFile
from fastapi.responses import StreamingResponse
from typing import List, Optional
import json

router = APIRouter()

class EditMessageRequest(BaseModel):
    target_index: int
    new_content: str
    modal_name: Optional[str] = None

query_limiter = Limiter(Rate(20, Duration.MINUTE))
read_limiter = Limiter(Rate(60, Duration.MINUTE))
mutation_limiter = Limiter(Rate(30, Duration.MINUTE))

class TTSRequest(BaseModel):
    text: str = Field(..., max_length=200, description="Text to convert to speech (max 200 chars)")
    voice: str = Field(default="troy", description="Voice persona (e.g., troy, hannah, autumn)")

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



@router.post("/generate-voice", summary="Convert Text to Speech")
async def generate_voice_route(request: TTSRequest):
    audio_bytes = generate_audio_from_text(text=request.text, voice=request.voice)
    
    return Response(
        content=audio_bytes, 
        media_type="audio/wav",
        headers={
            "Content-Disposition": 'attachment; filename="output.wav"'
        }
    )

class RegenerateRequest(BaseModel):
    modal_name: Optional[str] = None

@router.post("/chat/{chat_id}/regenerate")
async def regenerate_chat_route(
    chat_id: str,
    payload: RegenerateRequest,
    user=Depends(get_current_user)
):
    """
    Endpoint to regenerate the last AI response.
    Returns a stream of tokens just like the standard chat endpoint.
    """
    if not chat_id:
        raise HTTPException(status_code=400, detail="chat_id is required")

    generator = regenerate_chat_stream(
        chat_id=chat_id,
        user_id=user["user_id"],
        modal_name=payload.modal_name
    )

    return StreamingResponse(generator, media_type="text/event-stream")

@router.post("/chat/{chat_id}/edit")
async def edit_chat_route(
    chat_id: str,
    payload: EditMessageRequest,
    user=Depends(get_current_user)
):
    """
    Endpoint to edit a user message and stream back a new AI response.
    """
    if not chat_id:
        raise HTTPException(status_code=400, detail="chat_id is required")

    generator = edit_chat_stream(
        chat_id=chat_id,
        user_id=user["user_id"],
        target_index=payload.target_index,
        new_content=payload.new_content,
        modal_name=payload.modal_name
    )

    return StreamingResponse(generator, media_type="text/event-stream")

@router.post("/query/private")
async def private_chat_endpoint(
    query: str = Form(...),
    modal_name: Optional[str] = Form(None),
    chat_history: Optional[str] = Form(None), # Stringified JSON array if sending context
    files: List[UploadFile] = File(default=[]),
    user: str = Depends(get_current_user) 
):
    parsed_history = []
    if chat_history:
        try:
            parsed_history = json.loads(chat_history)
        except json.JSONDecodeError:
            pass

    return StreamingResponse(
        private_chat_stream(
            user_input=query,
            user_id=user["user_id"],
            files=files,
            modal_name=modal_name,
            chat_history=parsed_history
        ),
        media_type="text/event-stream"
    )