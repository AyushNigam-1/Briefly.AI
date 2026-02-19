# from langchain_mcp_adapters.client import MultiServerMCPClient


# N8N_MCP_URL = "http://localhost:5678/mcp-server/http"
# N8N_ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4MTQyOTIxNy05MWExLTQzOWYtOGZjMC1iZjBlNmQwY2NmMjEiLCJpc3MiOiJuOG4iLCJhdWQiOiJtY3Atc2VydmVyLWFwaSIsImp0aSI6ImZhMTJkODBjLWM1MDgtNDY5OS04M2UwLWI1YjFjMzliNGM4MCIsImlhdCI6MTc3MTQ3MDE3Nn0.eL00XNMHz5l_lu4qUqTSvxaW4wSmCP_NqwEzTO6vpFM"  # <--- PASTE YOUR KEY



# async def get_n8n_tools():
#     client = MultiServerMCPClient(  
#         {
#             "n8n": {
#                 "transport": "http",
#                 "url": N8N_MCP_URL,
#                 "headers": {
#                     "Authorization": f"Bearer {N8N_ACCESS_TOKEN}",
#                 },
#             }
#         }
#     )

#     tools = await client.get_tools()

#     print(f"✅ n8n MCP loaded ({len(tools)} tools)")

#     return tools

from langchain_mcp_adapters.client import MultiServerMCPClient
from dotenv import load_dotenv
import os
load_dotenv()
ALLOWED_N8N_TOOLS = {
    "n8n_create_workflow",
    "n8n_update_partial_workflow",
    "n8n_list_workflows",
    "n8n_get_workflow",
    "n8n_delete_workflow",
    "n8n_test_workflow",
}

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
                "MCP_MODE": "stdio",
                "LOG_LEVEL": "error",
                "DISABLE_CONSOLE_OUTPUT": "true",
                "N8N_API_URL": "http://localhost:5678",
                "N8N_API_KEY": os.getenv("N8N_API_KEY"),
            }
        }
    })

    tools = await client.get_tools()

    # 🧠 HARD FILTER
    tools = [t for t in tools if t.name in ALLOWED_N8N_TOOLS]

    print("✅ Loaded n8n tools:", [t.name for t in tools])

    _n8n_tools_cache = tools
    return tools

