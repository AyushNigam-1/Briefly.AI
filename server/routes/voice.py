from fastapi import APIRouter, Depends
from controllers.voice_controller import VoiceController
from utils.auth import get_current_user 

router = APIRouter()

@router.get("/voice/token")
async def get_livekit_token(chat_id: str = None, current_user=Depends(get_current_user)):
    user_id = str(current_user["user_id"])
    return await VoiceController.generate_token(user_id=user_id, chat_id=chat_id)