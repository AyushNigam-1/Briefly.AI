from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List
from controllers.memory_handler import (
    get_user_memories,
    save_user_memories,
    clear_user_memories,
)

router = APIRouter(prefix="/memory", tags=["memory"])

class AddMemoryRequest(BaseModel):
    memories: List[str]

@router.get("/")
async def fetch_memories(user=Depends()):
    """
    Get all memories for current user
    """
    return {
        "memories": get_user_memories(user["user_id"])
    }


@router.post("/")
async def add_memory(payload: AddMemoryRequest, user=Depends()):
    """
    Manually add memory
    """
    save_user_memories(user["user_id"], payload.memories)

    return {
        "status": "success",
        "memories": get_user_memories(user["user_id"])
    }


@router.delete("/")
async def delete_all_memories(user=Depends()):
    """
    Clear all memories
    """
    clear_user_memories(user["user_id"])

    return {
        "status": "success",
        "memories": []
    }
