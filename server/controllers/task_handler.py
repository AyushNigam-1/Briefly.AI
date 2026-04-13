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

    try:
        cached_workflows = redis_client.get(cache_key)
        if cached_workflows:
            return json.loads(cached_workflows)
    except Exception as e:
        logger.warning(f"Redis get error for {cache_key}: {e}")

    try:
        user = users_collection.find_one(
            {"_id": ObjectId(user_id)},
            {"n8n_workflows": 1, "_id": 0} 
        )
        workflows = user.get("n8n_workflows", []) if user else []
    except Exception as e:
        logger.error(f"Failed to fetch workflows from DB: {e}")
        workflows = []

    try:
        redis_client.setex(cache_key, CACHE_TTL, json.dumps(workflows))
    except Exception as e:
        logger.warning(f"Redis set error for {cache_key}: {e}")

    return workflows

def delete_workflow(user_id: str, workflow_id: str):
    """
    Deletes workflow from n8n and pulls it from the user's DB profile.
    """
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

    res = requests.delete(
        f"{N8N_HOST}/api/v1/workflows/{workflow_id}",
        headers=headers
    )

    if not res.ok:
        return {
            "status": "error",
            "message": f"n8n delete failed: {res.text}"
        }

    users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$pull": {"n8n_workflows": {"id": workflow_id}}}
    )

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

import json
import requests
from bson import ObjectId

# 🌟 NEW: The Security Filter
def is_protected_parameter(key: str, value: any = None) -> bool:
    """
    Security filter to prevent API keys and credentials from leaking to the frontend.
    Checks both the parameter key names and common secret value prefixes.
    """
    k = key.lower()
    
    # 1. Block by Key Name (Aggressive Blacklist)
    blacklisted_keys = [
        "apikey", "api_key", "token", "secret", "password", 
        "credentials", "headerparameters", "headers", "sendheaders",
        "jina", "resend", "opensignal", "auth"
    ]
    if any(word in k for word in blacklisted_keys):
        return True
        
    # 2. Block by Value Signature (Catches secrets hidden inside nested JSON)
    if value is not None:
        if isinstance(value, str):
            if value.startswith("sk-") or value.startswith("Bearer ") or value.startswith("re_") or value.startswith("jina_"):
                return True
        elif isinstance(value, (dict, list)):
            dump = json.dumps(value)
            if '"sk-' in dump or '"Bearer ' in dump or '"re_' in dump or '"jina_' in dump:
                return True
                
    return False


def get_workflow_blocks(user_id: str, workflow_id: str):
    """
    Dynamically fetches configurable parameters, aggressively filtering out API keys.
    """
    user = users_collection.find_one({"_id": ObjectId(user_id), "n8n_workflows.id": workflow_id})
    if not user:
        return {"status": "error", "message": "Workflow not found or access denied."}

    headers = {"X-N8N-API-KEY": N8N_API_KEY}
    n8n_base_url = N8N_HOST.rstrip('/')
    
    res = requests.get(f"{n8n_base_url}/api/v1/workflows/{workflow_id}", headers=headers)
    if not res.ok:
        return {"status": "error", "message": "Failed to fetch workflow from n8n."}

    raw_data = res.json()
    formatted_nodes = []
    
    for node in raw_data.get("nodes", []):
        parameters = node.get("parameters", {})
        editable_fields = []
        
        for key, value in parameters.items():
            
            # 🌟 SECURITY CHECK: Skip this iteration if it contains an API key
            if is_protected_parameter(key, value):
                continue

            formatted_label = ''.join([' '+c if c.isupper() else c for c in key]).strip().title()

            if isinstance(value, (dict, list)):
                editable_fields.append({
                    "key": key,
                    "label": f"{formatted_label} (Advanced)",
                    "value": json.dumps(value, indent=2),
                    "is_json": True 
                })
            else:
                editable_fields.append({
                    "key": key,
                    "label": formatted_label,
                    "value": str(value),
                    "is_json": False
                })

        formatted_nodes.append({
            "id": node.get("id"),
            "name": node.get("name"),
            "type": node.get("type"),
            "editable_fields": editable_fields
        })

    return {"status": "success", "data": {"nodes": formatted_nodes}}

def update_workflow_blocks(user_id: str, workflow_id: str, updated_nodes: list):
    """
    Safely merges user edits back into the full n8n JSON and saves, protecting original keys.
    """
    user = users_collection.find_one({"_id": ObjectId(user_id), "n8n_workflows.id": workflow_id})
    if not user:
        return {"status": "error", "message": "Workflow not found or access denied."}

    headers = {"X-N8N-API-KEY": N8N_API_KEY, "Content-Type": "application/json"}
    n8n_base_url = N8N_HOST.rstrip('/')
    
    get_res = requests.get(f"{n8n_base_url}/api/v1/workflows/{workflow_id}", headers=headers)
    if not get_res.ok:
        return {"status": "error", "message": "Failed to fetch original workflow."}
        
    workflow_data = get_res.json()
    
    for raw_node in workflow_data.get("nodes", []):
        frontend_node = next((n for n in updated_nodes if n["id"] == raw_node["id"]), None)
        
        if frontend_node and frontend_node.get("editable_fields"):
            if "parameters" not in raw_node:
                raw_node["parameters"] = {}
                
            for field in frontend_node["editable_fields"]:
                key = field["key"]
                
                if is_protected_parameter(key):
                    continue

                raw_val = field["value"]
                is_json = field.get("is_json", False)
                
                if is_json:
                    try:
                        parsed_val = json.loads(raw_val) if isinstance(raw_val, str) else raw_val
                    except Exception:
                        parsed_val = raw_val 
                else:
                    val_str = str(raw_val).strip()
                    if val_str.lower() == "true":
                        parsed_val = True
                    elif val_str.lower() == "false":
                        parsed_val = False
                    elif val_str.isdigit():
                        parsed_val = int(val_str)
                    else:
                        parsed_val = raw_val
                        
                raw_node["parameters"][key] = parsed_val

    save_payload = {
        "name": workflow_data.get("name"),
        "nodes": workflow_data.get("nodes"),
        "connections": workflow_data.get("connections"),
        "settings": workflow_data.get("settings", {}),
        "staticData": workflow_data.get("staticData", {})
    }

    put_res = requests.put(f"{n8n_base_url}/api/v1/workflows/{workflow_id}", headers=headers, json=save_payload)
    
    if not put_res.ok:
        print(f"🚨 n8n Save Error: {put_res.status_code} - {put_res.text}")
        return {"status": "error", "message": f"n8n rejected save: {put_res.text}"}
        
    return {"status": "success", "message": "Workflow updated successfully."}