import os
import json
import traceback
from datetime import datetime, timezone
from bson import ObjectId
from controllers.mongo import summary_collection , workflows_collection
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
import requests

N8N_HOST = "http://localhost:5678"
N8N_API_KEY = os.getenv("N8N_API_KEY")


def get_user_workflows(user_id: str):
    """
    Returns all workflows created by this user.
    """
    workflows = list(
        workflows_collection.find(
            {"user_id": user_id},
            {"_id": 0}
        )
    )

    return workflows

def delete_workflow(user_id: str, workflow_id: str):
    """
    Deletes workflow from n8n and DB (only if owned by user).
    """

    # Verify ownership
    wf = workflows_collection.find_one({
        "workflow_id": workflow_id,
        "user_id": user_id
    })

    if not wf:
        return {"status": "error", "message": "Workflow not found or not owned by user"}

    headers = {
        "X-N8N-API-KEY": N8N_API_KEY,
        "Content-Type": "application/json"
    }

    # Delete from n8n
    res = requests.delete(
        f"{N8N_HOST}/api/v1/workflows/{workflow_id}",
        headers=headers
    )

    if not res.ok:
        return {
            "status": "error",
            "message": f"n8n delete failed: {res.text}"
        }

    # Delete from Mongo
    workflows_collection.delete_one({
        "workflow_id": workflow_id,
        "user_id": user_id
    })

    return {"status": "success", "message": "Workflow deleted"}

def execute_workflow(user_id: str, workflow_id: str):
    """
    Manually executes workflow (only if owned by user).
    """

    # Ownership check
    wf = workflows_collection.find_one({
        "workflow_id": workflow_id,
        "user_id": user_id
    })

    if not wf:
        return {"status": "error", "message": "Workflow not found or not owned by user"}

    headers = {
        "X-N8N-API-KEY": N8N_API_KEY,
        "Content-Type": "application/json"
    }

    res = requests.post(
        f"{N8N_HOST}/api/v1/workflows/{workflow_id}/execute",
        headers=headers
    )

    if not res.ok:
        return {
            "status": "error",
            "message": res.text
        }

    return {"status": "success", "message": "Workflow executed"}
