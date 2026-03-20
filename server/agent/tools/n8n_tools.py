import os
import json
import logging
import requests
from dotenv import load_dotenv
from langchain_core.tools import tool
from langchain_mcp_adapters.client import MultiServerMCPClient

load_dotenv()
logger = logging.getLogger(__name__)

ALLOWED_N8N_TOOLS = {
    "n8n_list_workflows",
    "n8n_get_workflow",
    "n8n_delete_workflow",
    "n8n_test_workflow",
}

N8N_TEMPLATES = {
    "web_push_notification": {
        "description": "Sends a native browser push notification to the user.",
        "n8n_json": {
            "nodes": [
                { "id": "trigger-1", "parameters": { "rule": { "interval": [ { "field": "cronExpression", "expression": "* * * * *" } ] } }, "name": "Schedule Trigger", "type": "n8n-nodes-base.scheduleTrigger", "typeVersion": 1.1, "position": [0, 0] },
                { "id": "action-1", "parameters": { "method": "POST", "url": "https://onesignal.com/api/v1/notifications", "sendHeaders": True, "headerParameters": { "parameters": [ { "name": "Authorization", "value": f"Basic {os.getenv('ONESIGNAL_REST_API_KEY', '')}" }, { "name": "Content-Type", "value": "application/json" } ] }, "sendBody": True, "specifyBody": "json", "jsonBody": json.dumps({ "app_id": os.getenv("ONESIGNAL_APP_ID", ""), "include_aliases": { "external_id": ["TARGET_USER_ID"] }, "target_channel": "push", "contents": { "en": "USER_MESSAGE" } }) }, "name": "OneSignal Push", "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.1, "position": [250, 0] }
            ],
            "connections": { "Schedule Trigger": { "main": [ [ { "node": "OneSignal Push", "type": "main", "index": 0 } ] ] } }
        }
    },
    
    "daily_email_reminder": {
        "description": "Sends a simple email reminder to the user at a scheduled time.",
        "n8n_json": {
            "nodes": [
                { "id": "trigger-2", "parameters": { "rule": { "interval": [ { "field": "cronExpression", "expression": "0 9 * * *" } ] } }, "name": "Schedule Trigger", "type": "n8n-nodes-base.scheduleTrigger", "typeVersion": 1.1, "position": [0, 0] },
                { "id": "action-2", "parameters": { "method": "POST", "url": "https://api.resend.com/emails", "sendHeaders": True, "headerParameters": { "parameters": [ { "name": "Authorization", "value": f"Bearer {os.getenv('RESEND_API_KEY', '')}" }, { "name": "Content-Type", "value": "application/json" } ] }, "sendBody": True, "specifyBody": "json", "jsonBody": json.dumps({ "from": "Briefly AI <onboarding@resend.dev>", "to": ["TARGET_EMAIL"], "subject": "SUBJECT", "html": "<p>USER_MESSAGE</p>" }) }, "name": "Send Email via Resend", "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.1, "position": [250, 0] }
            ],
            "connections": { "Schedule Trigger": { "main": [ [ { "node": "Send Email via Resend", "type": "main", "index": 0 } ] ] } }
        }
    },

    "dynamic_website_scraper": {
        "description": "Fetches text from a website on a schedule and sends it via Email OR Push Notification.",
        "n8n_json": {
            "nodes": [
                { "id": "trigger-3", "parameters": { "rule": { "interval": [ { "field": "seconds", "expression": 10 } ] } }, "name": "Schedule Trigger", "type": "n8n-nodes-base.scheduleTrigger", "typeVersion": 1.1, "position": [0, 0] },
                { "id": "action-3", "parameters": { "url": "TARGET_URL", "options": {} }, "name": "Fetch Website", "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.1, "position": [200, 0] },
                { "id": "action-4", "parameters": { "method": "POST", "url": "https://api.resend.com/emails", "sendHeaders": True, "headerParameters": { "parameters": [ { "name": "Authorization", "value": "Bearer " + os.getenv('RESEND_API_KEY', '') }, { "name": "Content-Type", "value": "application/json" } ] }, "sendBody": True, "specifyBody": "json", "jsonBody": "={{ JSON.stringify({ from: 'Briefly Scraper <onboarding@resend.dev>', to: ['TARGET_EMAIL'], subject: 'SUBJECT', html: '<p>Here is your scraped data:</p><br><pre>' + $json.data + '</pre>' }) }}" }, "name": "Send Email via Resend", "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.1, "position": [450, -100] },
                { "id": "action-5", "parameters": { "method": "POST", "url": "https://onesignal.com/api/v1/notifications", "sendHeaders": True, "headerParameters": { "parameters": [ { "name": "Authorization", "value": "Basic " + os.getenv('ONESIGNAL_REST_API_KEY', '') }, { "name": "Content-Type", "value": "application/json" } ] }, "sendBody": True, "specifyBody": "json", "jsonBody": "={{ JSON.stringify({ app_id: '" + os.getenv('ONESIGNAL_APP_ID', '') + "', include_aliases: { external_id: ['TARGET_USER_ID'] }, target_channel: 'push', contents: { en: 'New Scrape Data: ' + $json.data } }) }}" }, "name": "OneSignal Push", "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.1, "position": [450, 100] }
            ],
            "connections": {
                "Schedule Trigger": { "main": [ [ { "node": "Fetch Website", "type": "main", "index": 0 } ] ] },
                "Fetch Website": { "main": [ [] ] } # Python will wire this dynamically
            }
        }
    }
}

@tool
def list_available_templates() -> str:
    """Use this FIRST when a user wants an automation. Returns a lightweight list of available template names and descriptions."""
    catalog = {name: data["description"] for name, data in N8N_TEMPLATES.items()}
    return json.dumps(catalog)

@tool
def deploy_briefly_automation(
    template_name: str,
    delivery_method: str = "email",
    target_url: str = "https://example.com",
    target_email: str = "user@example.com",
    target_user_id: str = "none",
    user_message: str = "Default message",
    subject: str = "Briefly Update",
    interval_seconds: int = 10
) -> str:
    """
    CRITICAL: Use this tool to CREATE automations securely.
    Args:
        template_name: The name of the template from list_available_templates.
        delivery_method: 'email' or 'push' (Only used if template is dynamic_website_scraper).
        target_url: URL to scrape (if applicable).
        target_email: User's email (if delivery method is email).
        target_user_id: User's ID (if delivery method is push).
        user_message: Body of the email or notification.
        subject: Subject of the email.
        interval_seconds: Run interval (default 10).
    Returns the n8n Workflow ID.
    """
    template = N8N_TEMPLATES.get(template_name)
    if not template:
        return f"Error: Template '{template_name}' not found."

    # Safely inject variables into the JSON string
    json_str = json.dumps(template["n8n_json"])
    json_str = json_str.replace("TARGET_URL", target_url)
    json_str = json_str.replace("TARGET_EMAIL", target_email)
    json_str = json_str.replace("TARGET_USER_ID", target_user_id)
    json_str = json_str.replace("USER_MESSAGE", user_message)
    json_str = json_str.replace("SUBJECT", subject)

    workflow = json.loads(json_str)

    # Dynamic wiring for the scraper template
    if template_name == "dynamic_website_scraper":
        target_node = "Send Email via Resend" if delivery_method == "email" else "OneSignal Push"
        workflow["connections"]["Fetch Website"]["main"] = [[{"node": target_node, "type": "main", "index": 0}]]
        
        # Set interval
        workflow["nodes"][0]["parameters"]["rule"]["interval"][0]["expression"] = interval_seconds

    # Deploy to n8n directly via REST API
    n8n_url = os.getenv("N8N_API_URL", "http://localhost:5678").rstrip("/")
    headers = {"X-N8N-API-KEY": os.getenv("N8N_API_KEY", ""), "Content-Type": "application/json"}
    payload = {"name": f"Briefly Automation: {template_name}", "nodes": workflow["nodes"], "connections": workflow["connections"], "active": True}
    
    try:
        resp = requests.post(f"{n8n_url}/api/v1/workflows", headers=headers, json=payload)
        if resp.status_code == 200:
            return f"Success! Workflow created and activated. ID: {resp.json().get('id')}"
        return f"Deploy Failed: {resp.status_code} - {resp.text}"
    except Exception as e:
        return f"API Connection Failed: {str(e)}"

_n8n_tools_cache = None

async def get_n8n_tools():
    global _n8n_tools_cache
    if _n8n_tools_cache:
        return _n8n_tools_cache

    client = MultiServerMCPClient({
        "n8n": {
            "transport": "stdio",
            "command": "npx",
            "args": ["-y", "n8n-mcp"],
            "env": {
                **os.environ,
                "MCP_MODE": "stdio",
                "N8N_API_URL": os.getenv("N8N_API_URL", "http://localhost:5678"),
                "N8N_API_KEY": os.getenv("N8N_API_KEY", ""),
            }
        }
    })

    try:
        # Fetch remaining n8n MCP tools and add our custom wrapper tools
        mcp_tools = await client.get_tools()
        filtered_mcp_tools = [t for t in mcp_tools if t.name in ALLOWED_N8N_TOOLS]
        
        final_tools_list = filtered_mcp_tools + [list_available_templates, deploy_briefly_automation]
        _n8n_tools_cache = final_tools_list
        return final_tools_list
    except Exception as e:
        logger.error(f"❌ Failed to load n8n MCP tools: {e}")
        return [list_available_templates, deploy_briefly_automation]