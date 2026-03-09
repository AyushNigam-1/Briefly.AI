# # from langchain_mcp_adapters.client import MultiServerMCPClient


# # N8N_MCP_URL = "http://localhost:5678/mcp-server/http"
# # N8N_ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4MTQyOTIxNy05MWExLTQzOWYtOGZjMC1iZjBlNmQwY2NmMjEiLCJpc3MiOiJuOG4iLCJhdWQiOiJtY3Atc2VydmVyLWFwaSIsImp0aSI6ImZhMTJkODBjLWM1MDgtNDY5OS04M2UwLWI1YjFjMzliNGM4MCIsImlhdCI6MTc3MTQ3MDE3Nn0.eL00XNMHz5l_lu4qUqTSvxaW4wSmCP_NqwEzTO6vpFM"  # <--- PASTE YOUR KEY



# # async def get_n8n_tools():
# #     client = MultiServerMCPClient(  
# #         {
# #             "n8n": {
# #                 "transport": "http",
# #                 "url": N8N_MCP_URL,
# #                 "headers": {
# #                     "Authorization": f"Bearer {N8N_ACCESS_TOKEN}",
# #                 },
# #             }
# #         }
# #     )

# #     tools = await client.get_tools()

# #     print(f"✅ n8n MCP loaded ({len(tools)} tools)")

# #     return tools

# from langchain_mcp_adapters.client import MultiServerMCPClient
# from dotenv import load_dotenv
# import os
# load_dotenv()
# ALLOWED_N8N_TOOLS = {
#     "n8n_create_workflow",
#     "n8n_update_partial_workflow",
#     "n8n_list_workflows",
#     "n8n_get_workflow",
#     "n8n_delete_workflow",
#     "n8n_test_workflow",
# }

# _n8n_tools_cache = None


# async def get_n8n_tools():
#     global _n8n_tools_cache

#     # 🔒 Cache tools (don't reload every time)
#     if _n8n_tools_cache:
#         return _n8n_tools_cache

#     client = MultiServerMCPClient({
#         "n8n": {
#             "transport": "stdio",
#             "command": "npx",
#             "args": ["-y", "n8n-mcp"],
#             "env": {
#                 "MCP_MODE": "stdio",
#                 "LOG_LEVEL": "error",
#                 "DISABLE_CONSOLE_OUTPUT": "true",
#                 "N8N_API_URL": "http://localhost:5678",
#                 "N8N_API_KEY": os.getenv("N8N_API_KEY"),
#             }
#         }
#     })

#     tools = await client.get_tools()

#     # 🧠 HARD FILTER
#     tools = [t for t in tools if t.name in ALLOWED_N8N_TOOLS]

#     print("✅ Loaded n8n tools:", [t.name for t in tools])

#     _n8n_tools_cache = tools
#     return tools
import os
import json
import logging
from dotenv import load_dotenv
from langchain_core.tools import tool
from langchain_mcp_adapters.client import MultiServerMCPClient

# Load environment variables first so the templates can access them
load_dotenv()
logger = logging.getLogger(__name__)

# ---------------------------------------------------------
# 1. ALLOWED MCP TOOLS
# ---------------------------------------------------------
# MCP tools sometimes drop the 'n8n_' prefix depending on the version. 
# We include both to be absolutely safe.
ALLOWED_N8N_TOOLS = {
    "n8n_create_workflow",
    "n8n_update_partial_workflow",
    "n8n_list_workflows",
    "n8n_get_workflow",
    "n8n_delete_workflow",
    "n8n_test_workflow",
}

# ---------------------------------------------------------
# 2. THE TEMPLATES (The "Brain")
# ---------------------------------------------------------
N8N_TEMPLATES = {
    "web_push_notification": {
        "description": "Sends a native browser notification to the user's desktop/mobile via OneSignal.",
        "usage": "1. Replace 'TARGET_USER_ID' with the user's ID. 2. Replace 'USER_MESSAGE' with text. 3. Adjust the 'cronExpression' if the user asks for a specific schedule (default is every minute '* * * * *').",
        "n8n_json": {
            "nodes": [
                {
                    "id": "e0c4f526-25f0-4df5-b040-5e5d3269b829", # 🌟 FIX: Added required ID
                    "parameters": { "rule": { "interval": [ { "field": "cronExpression", "expression": "* * * * *" } ] } },
                    "name": "Schedule Trigger",
                    "type": "n8n-nodes-base.scheduleTrigger",
                    "typeVersion": 1.1,
                    "position": [0, 0]
                },
                {
                    "id": "848bd4cc-b2d3-4fcb-bc67-0df783ab2b16", # 🌟 FIX: Added required ID
                    "parameters": {
                        "method": "POST",
                        "url": "https://onesignal.com/api/v1/notifications",
                        "sendHeaders": True,
                        "headerParameters": {
                            "parameters": [
                                { "name": "Authorization", "value": f"Basic {os.getenv('ONESIGNAL_REST_API_KEY', '')}" },
                                { "name": "Content-Type", "value": "application/json" }
                            ]
                        },
                        "sendBody": True,
                        "specifyBody": "json",
                        "jsonBody": json.dumps({
                            "app_id": os.getenv("ONESIGNAL_APP_ID", ""),
                            "include_aliases": { "external_id": ["TARGET_USER_ID"] },
                            "target_channel": "push",
                            "contents": { "en": "USER_MESSAGE" }
                        })
                    },
                    "name": "OneSignal Push",
                    "type": "n8n-nodes-base.httpRequest",
                    "typeVersion": 4.1,
                    "position": [250, 0]
                }
            ],
            "connections": {
                "Schedule Trigger": {
                    "main": [ [ { "node": "OneSignal Push", "type": "main", "index": 0 } ] ]
                }
            }
        }
    }
}

@tool
def fetch_n8n_templates() -> str:
    """
    Use this tool FIRST when a user asks for an automation, reminder, or notification. 
    It returns the correct JSON structure for n8n workflows.
    """
    return json.dumps(N8N_TEMPLATES)


# ---------------------------------------------------------
# 3. THE MCP CLIENT (The "Hands")
# ---------------------------------------------------------
_n8n_tools_cache = None

async def get_n8n_tools():
    global _n8n_tools_cache

    # 🔒 Cache tools (don't reload every time)
    if _n8n_tools_cache:
        return _n8n_tools_cache

    client = MultiServerMCPClient({
        "n8n": {
            "transport": "stdio",
            "command": "npx",
            "args": ["-y", "n8n-mcp"],
            "env": {
                **os.environ, # Pass parent environment so node/npx commands work
                "MCP_MODE": "stdio",
                "LOG_LEVEL": "error",
                "DISABLE_CONSOLE_OUTPUT": "true",
                "N8N_API_URL": os.getenv("N8N_API_URL", "http://localhost:5678"),
                "N8N_API_KEY": os.getenv("N8N_API_KEY", ""),
            }
        }
    })

    try:
        # Fetch the dynamic tools from the n8n MCP server
        mcp_tools = await client.get_tools()
        
        # Filter for our allowed list
        filtered_mcp_tools = [t for t in mcp_tools if t.name in ALLOWED_N8N_TOOLS]
        
        # 🌟 CRITICAL: Combine the n8n MCP tools WITH our custom template tool
        final_tools_list = filtered_mcp_tools + [fetch_n8n_templates]

        print("✅ Loaded n8n tools:", [t.name for t in final_tools_list])

        _n8n_tools_cache = final_tools_list
        return final_tools_list

    except Exception as e:
        logger.error(f"❌ Failed to load n8n MCP tools: {e}")
        # If the MCP server fails, still return the template tool so the AI doesn't break
        return [fetch_n8n_templates]
