import os, json, logging
from dotenv import load_dotenv
from langchain_core.tools import tool
from langchain_mcp_adapters.client import MultiServerMCPClient

load_dotenv()
logger = logging.getLogger(__name__)

ALLOWED_N8N_TOOLS = {"n8n_create_workflow", "n8n_test_workflow", "n8n_get_workflow", "n8n_delete_workflow","n8n_update_workflow"}

client = MultiServerMCPClient({ 
        "n8n": { "transport": "stdio", "command": "npx", "args": ["-y", "n8n-mcp"], 
        "env": { **os.environ, "MCP_MODE": "stdio",
        "N8N_API_URL": os.getenv("N8N_API_URL", "http://localhost:5678"),
        "N8N_API_KEY": os.getenv("N8N_API_KEY", "") } } 
     })

UNIVERSAL_BLUEPRINT = {
    "nodes": [
        { "id": "1", "name": "Schedule", "type": "n8n-nodes-base.scheduleTrigger", "typeVersion": 1.1, "position": [0, 0], "parameters": { "rule": { "interval": [ { "field": "minutes", "expression": 60 } ] } } },
   { 
            "id": "2", 
            "name": "Fetch Website", 
            "type": "n8n-nodes-base.httpRequest", 
            "typeVersion": 4.1, 
            "position": [200, 0], 
            "parameters": { 
                "url": "https://r.jina.ai/TARGET_URL", 
                "sendHeaders": True, 
                "headerParameters": { 
                    "parameters": [ 
                        { 
                            "name": "Authorization", 
                            "value": "Bearer " + os.getenv('JINA_API_KEY', '') 
                        } 
                    ] 
                }, 
                "options": {} 
            } 
        },
        { "id": "3", "name": "Ask LLM Brain", "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.1, "position": [400, 0], "parameters": { "method": "POST", "url": "http://172.17.0.1:8000/api/n8n-llm", "sendBody": True, "specifyBody": "json", "jsonBody": "={{ JSON.stringify({ user_rule: 'USER_RULE', website_data: typeof $json.data === 'string' ? $json.data : JSON.stringify($json) }) }}" } },
        { "id": "4", "name": "Should I Notify?", "type": "n8n-nodes-base.if", "typeVersion": 1, "position": [600, 0], "parameters": { "conditions": { "string": [ { "value1": "={{ $json.response }}", "operation": "notEqual", "value2": "SKIP" } ] } } },
        { "id": "5", "name": "Email", "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.1, "position": [800, -100], "parameters": { "method": "POST", "url": "https://api.resend.com/emails", "sendHeaders": True, "headerParameters": { "parameters": [ { "name": "Authorization", "value": "Bearer " + os.getenv('RESEND_API_KEY', '') }, { "name": "Content-Type", "value": "application/json" } ] }, "sendBody": True, "specifyBody": "json", "jsonBody": "={{ JSON.stringify({ from: 'Briefly AI <onboarding@resend.dev>', to: ['TARGET_EMAIL'], subject: 'Briefly Alert', html: '<p>' + $json.response + '</p>' }) }}" } },
        { "id": "6", "name": "Push", "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.1, "position": [800, 100], "parameters": { "method": "POST", "url": "https://onesignal.com/api/v1/notifications", "sendHeaders": True, "headerParameters": { "parameters": [ { "name": "Authorization", "value": "Basic " + os.getenv('ONESIGNAL_REST_API_KEY', '') }, { "name": "Content-Type", "value": "application/json" } ] }, "sendBody": True, "specifyBody": "json", "jsonBody": "={{ JSON.stringify({ app_id: '" + os.getenv('ONESIGNAL_APP_ID', '') + "', include_aliases: { external_id: ['TARGET_USER_ID'] }, target_channel: 'push', contents: { en: $json.response } }) }}" } }
    ],
    "connections": {
        "Schedule": { "main": [ [ { "node": "Fetch Website", "type": "main", "index": 0 } ] ] },
        "Fetch Website": { "main": [ [ { "node": "Ask LLM Brain", "type": "main", "index": 0 } ] ] },
        "Ask LLM Brain": { "main": [ [ { "node": "Should I Notify?", "type": "main", "index": 0 } ] ] },
        "Should I Notify?": { "main": [ [ {"node": "Push", "type": "main", "index": 0} ] ] }
    }
}

@tool
def get_workflow_blueprint() -> str:
    """
    CRITICAL: Call this FIRST to get the official n8n workflow structure. 
    It returns the exact JSON you must pass into n8n_create_workflow.
    """
    return json.dumps(UNIVERSAL_BLUEPRINT)

_n8n_tools_cache = None
async def get_n8n_tools():
    global _n8n_tools_cache
    if _n8n_tools_cache: return _n8n_tools_cache
    try:
        tools = [t for t in await client.get_tools() if t.name in ALLOWED_N8N_TOOLS]
        _n8n_tools_cache = tools + [get_workflow_blueprint]
        return _n8n_tools_cache
    except Exception as e: 
        logger.error(f"Failed to load MCP: {e}")
        return [get_workflow_blueprint]