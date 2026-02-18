from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List

from controllers.memory_handler import (
    get_user_memories,
    save_user_memories,
    clear_user_memories,
    update_user_memory,
    delete_user_memory,
    get_memory_enabled,
    set_memory_enabled,
)

router = APIRouter(prefix="/memory", tags=["memory"])


# -------------------------
# Request Schemas
# -------------------------

class AddMemoryRequest(BaseModel):
    memories: List[str]


class UpdateMemoryRequest(BaseModel):
    memory_id: str
    text: str


class ToggleMemoryRequest(BaseModel):
    enabled: bool


# -------------------------
# Routes
# -------------------------

@router.get("/")
async def fetch_memories(user=Depends()):
    """
    Get all memories + toggle state
    """
    return {
        "memories": get_user_memories(user["user_id"]),
        "enabled": get_memory_enabled(user["user_id"]),
    }


@router.post("/")
async def add_memory(payload: AddMemoryRequest, user=Depends()):
    """
    Manually add memories
    """
    save_user_memories(user["user_id"], payload.memories)

    return {
        "status": "success",
        "memories": get_user_memories(user["user_id"])
    }


@router.put("/")
async def edit_memory(payload: UpdateMemoryRequest, user=Depends()):
    """
    Update single memory
    """
    update_user_memory(
        user_id=user["user_id"],
        memory_id=payload.memory_id,
        new_text=payload.text
    )

    return {
        "status": "success",
        "memories": get_user_memories(user["user_id"])
    }


@router.delete("/{memory_id}")
async def delete_memory(memory_id: str, user=Depends()):
    """
    Delete single memory
    """
    delete_user_memory(user["user_id"], memory_id)

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


@router.get("/toggle")
async def get_memory_toggle(user=Depends()):
    """
    Get memory enabled flag
    """
    return {
        "enabled": get_memory_enabled(user["user_id"])
    }


@router.post("/toggle")
async def toggle_memory(payload: ToggleMemoryRequest, user=Depends()):
    """
    Enable / disable memory usage
    """
    set_memory_enabled(user["user_id"], payload.enabled)

    return {
        "status": "success",
        "enabled": payload.enabled
    }
