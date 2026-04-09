from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from controllers.task_handler import (
    get_user_workflows,
    delete_workflow,
    toggle_workflow ,
    get_workflow_blocks,
    update_workflow_blocks
)
from utils.auth import get_current_user

router = APIRouter(prefix="/workflows", tags=["Workflows"])

class WorkflowUpdateRequest(BaseModel):
    nodes: List[Dict[str, Any]]

@router.get("/{workflow_id}")
def get_workflow_details(workflow_id: str, current_user=Depends(get_current_user)):
    """
    Fetches a specific workflow and formats it into 'editable blocks' 
    (e.g., extracting just the Webhook URL, Slack message, or API keys).
    """
    user_id = current_user["user_id"]
    
    # Your controller should fetch from n8n, strip out the complex logic, 
    # and return an array of simplified blocks.
    result = get_workflow_blocks(user_id, workflow_id)
    
    if result.get("status") != "success":
        raise HTTPException(status_code=400, detail=result.get("message", "Failed to fetch workflow details"))

    return result

@router.put("/{workflow_id}")
def update_workflow_details(
    workflow_id: str, 
    payload: WorkflowUpdateRequest, 
    current_user=Depends(get_current_user)
):
    """
    Takes the edited fields from the frontend, injects them back into the 
    raw n8n workflow JSON, and saves it to the n8n API.
    """
    user_id = current_user["user_id"]
    
    result = update_workflow_blocks(user_id, workflow_id, payload.nodes)
    
    if result.get("status") != "success":
        raise HTTPException(status_code=400, detail=result.get("message", "Failed to update workflow"))

    return result

@router.get("")
def list_workflows(current_user=Depends(get_current_user)):
    """
    Returns all workflows created by logged-in user.
    """
    user_id = current_user["user_id"]
    workflows = get_user_workflows(user_id)

    return {
        "status": "success",
        "data": workflows
    }

@router.delete("/{workflow_id}")
def remove_workflow(workflow_id: str, current_user=Depends(get_current_user)):
    """
    Deletes workflow (only if owned by user).
    """
    user_id = current_user["user_id"]
    result = delete_workflow(user_id, workflow_id)

    if result["status"] != "success":
        raise HTTPException(status_code=400, detail=result["message"])

    return result

@router.put("/{workflow_id}/toggle")
def toggle_workflow_status(workflow_id: str, current_user=Depends(get_current_user)):
    """
    Toggles a workflow between Active and Inactive.
    """
    user_id = current_user["user_id"]

    result = toggle_workflow(user_id, workflow_id)

    if result["status"] != "success":
        raise HTTPException(status_code=400, detail=result["message"])

    return result