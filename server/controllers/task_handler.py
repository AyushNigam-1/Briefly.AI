import os
import json
import logging
from controllers.mongo import users_collection
from bson import ObjectId 
import requests
from redis_client import redis_client, CACHE_TTL

N8N_HOST = os.getenv("N8N_API_URL")
N8N_API_KEY = os.getenv("N8N_API_KEY")

logger = logging.getLogger(__name__)

def get_user_workflows(user_id: str):
    """
    Returns all workflows created by this user from their nested profile array.
    """
    cache_key = f"user_workflows:{user_id}"

    # 1. Try to fetch from Redis gracefully
    try:
        cached_workflows = redis_client.get(cache_key)
        if cached_workflows:
            return json.loads(cached_workflows)
    except Exception as e:
        logger.warning(f"Redis get error for {cache_key}: {e}")

    try:
        user = users_collection.find_one(
            {"_id": ObjectId(user_id)},
            {"n8n_workflows": 1, "_id": 0} # Only fetch the workflows array
        )
        workflows = user.get("n8n_workflows", []) if user else []
    except Exception as e:
        logger.error(f"Failed to fetch workflows from DB: {e}")
        workflows = []

    # 3. Save to Redis gracefully
    try:
        redis_client.setex(cache_key, CACHE_TTL, json.dumps(workflows))
    except Exception as e:
        logger.warning(f"Redis set error for {cache_key}: {e}")

    return workflows

def delete_workflow(user_id: str, workflow_id: str):
    """
    Deletes workflow from n8n and pulls it from the user's DB profile.
    """
    # 🌟 Verify ownership by checking if the ID exists in the user's array
    user = users_collection.find_one({
        "_id": ObjectId(user_id),
        "n8n_workflows.id": workflow_id
    })

    if not user:
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

    # 🌟 Delete from Mongo using $pull to remove it from the nested array
    users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$pull": {"n8n_workflows": {"id": workflow_id}}}
    )

    # Invalidate the cache so the next fetch reflects the deletion
    try:
        redis_client.delete(f"user_workflows:{user_id}")
    except Exception as e:
        logger.warning(f"Redis delete error for user_workflows:{user_id}: {e}")

    return {"status": "success", "message": "Workflow deleted successfully"}

def toggle_workflow(user_id: str, workflow_id: str):
    """
    Toggles a workflow between Active and Inactive (for scheduled/recurring tasks).
    """
    user = users_collection.find_one({
        "_id": ObjectId(user_id),
        "n8n_workflows.id": workflow_id
    })

    if not user:
        return {"status": "error", "message": "Workflow not found or not owned by user"}

    workflows = user.get("n8n_workflows", [])
    target_wf = next((w for w in workflows if w.get("id") == workflow_id), {})
    is_currently_active = target_wf.get("is_active", False)

    action = "deactivate" if is_currently_active else "activate"
    headers = {"X-N8N-API-KEY": N8N_API_KEY}
    
    res = requests.post(
        f"{N8N_HOST}/api/v1/workflows/{workflow_id}/{action}",
        headers=headers
    )

    if not res.ok:
        return {
            "status": "error",
            "message": f"Failed to {action} in n8n: {res.text}"
        }

    new_state = not is_currently_active
    users_collection.update_one(
        {"_id": ObjectId(user_id), "n8n_workflows.id": workflow_id},
        {"$set": {"n8n_workflows.$.is_active": new_state}}
    )

    return {"status": "success", "message": f"Workflow {action}d successfully", "is_active": new_state}