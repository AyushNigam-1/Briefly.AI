from langchain_mcp_adapters.client import MultiServerMCPClient

# ⚠️ UPDATED: These exact names must match the 'name' property in your TypeScript schemas!
ALLOWED_GDRIVE_TOOLS = {
    "gdrive_search",
    "gdrive_read_file",
    "gdrive_create_file", # 🌟 Add this!
    "gdrive_delete_file",
    "gdrive_update_file"
}

async def get_gdrive_tools(token: str):
    """
    Initializes Google Drive MCP tools for a specific user using their OAuth token.
    Connects to the local multi-tenant SSE server.
    """
    client = MultiServerMCPClient({
        "google_drive": {
            "transport": "sse", 
            
            "url": "https://ayush456-mcp-gateway.hf.space/gdrive/mcp",
            
            "headers": {
                "Authorization": f"Bearer {token}",
            }
        }
    })

    tools = await client.get_tools()
    # 🧠 HARD FILTER
    tools = [t for t in tools if t.name in ALLOWED_GDRIVE_TOOLS]

    print("✅ Loaded Google Drive tools:", [t.name for t in tools])

    return tools