from fastapi import APIRouter, Depends, HTTPException
from server.controllers.task_handler import (
    get_user_workflows,
    delete_workflow,
    execute_workflow
)
from utils.auth import get_current_user

router = APIRouter(prefix="/workflows", tags=["Workflows"])

@router.get("/")
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


@router.post("/{workflow_id}/execute")
def run_workflow(workflow_id: str, current_user=Depends(get_current_user)):
    """
    Manually executes workflow.
    """
    user_id = current_user["user_id"]

    result = execute_workflow(user_id, workflow_id)

    if result["status"] != "success":
        raise HTTPException(status_code=400, detail=result["message"])

    return result
