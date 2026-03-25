import os
import uuid
import json
from fastapi import HTTPException
from livekit.api import AccessToken, VideoGrants
from controllers.mongo import summary_collection  
from bson import ObjectId

class VoiceController:
    @staticmethod
    async def generate_token(user_id: str, chat_id: str = None):
        livekit_api_key = os.getenv("LIVEKIT_API_KEY", "devkey")
        livekit_api_secret = os.getenv("LIVEKIT_API_SECRET", "secret")
        livekit_url = os.getenv("LIVEKIT_URL", "ws://127.0.0.1:7880")

        if chat_id:
            try:
                # 🌟 FIX 1: Strip hidden whitespace just in case
                clean_chat_id = chat_id.strip()
                
                # 🌟 FIX 2: Removed 'await' because PyMongo is synchronous
                existing_chat = summary_collection.find_one({
                    "_id": ObjectId(clean_chat_id),
                    "user_id": user_id
                })
                
                if not existing_chat:
                    raise HTTPException(status_code=404, detail="Chat not found or access denied")
            
            except HTTPException:
                raise # Re-raise our intentional 404 error
            except Exception as e:
                print(f"❌ Real DB Error in VoiceController: {e}")
                raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

        unique_suffix = uuid.uuid4().hex[:6]
        room_name = f"room_{chat_id}_{unique_suffix}" if chat_id else f"room_{unique_suffix}"        
        grant = VideoGrants(room_join=True, room=room_name)
        
        metadata_payload = json.dumps({"chat_id": chat_id}) if chat_id else "{}"

        token = AccessToken(livekit_api_key, livekit_api_secret) \
            .with_identity(str(user_id)) \
            .with_name(str(user_id)) \
            .with_metadata(metadata_payload) \
            .with_grants(grant)

        return {
            "token": token.to_jwt(),
            "url": livekit_url,
            "room_name": room_name
        }