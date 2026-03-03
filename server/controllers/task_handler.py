import os
import json
import logging
from controllers.mongo import  workflows_collection
import requests
from redis_client import redis_client, CACHE_TTL

N8N_HOST = "http://10.207.18.43:5678"
N8N_API_KEY = os.getenv("N8N_API_KEY")

logger = logging.getLogger(__name__)

def get_user_workflows(user_id: str):
    """
    Returns all workflows created by this user.
    """
    cache_key = f"user_workflows:{user_id}"

    # 1. Try to fetch from Redis gracefully
    try:
        cached_workflows = redis_client.get(cache_key)
        if cached_workflows:
            return json.loads(cached_workflows)
    except Exception as e:
        logger.warning(f"Redis get error for {cache_key}: {e}")

    # 2. Fallback to MongoDB
    workflows = list(
        workflows_collection.find(
            {"user_id": user_id},
            {"_id": 0}  # Excluding _id makes this instantly JSON serializable!
        )
    )

    # 3. Save to Redis gracefully
    try:
        redis_client.setex(cache_key, CACHE_TTL, json.dumps(workflows))
    except Exception as e:
        logger.warning(f"Redis set error for {cache_key}: {e}")

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

    # Invalidate the cache so the next fetch reflects the deletion
    try:
        redis_client.delete(f"user_workflows:{user_id}")
    except Exception as e:
        logger.warning(f"Redis delete error for user_workflows:{user_id}: {e}")

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

    # Note: No cache invalidation is needed here because executing a workflow 
    # doesn't change the list of saved workflows.
    return {"status": "success", "message": "Workflow executed"}