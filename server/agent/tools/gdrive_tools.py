from langchain_mcp_adapters.client import MultiServerMCPClient

ALLOWED_GDRIVE_TOOLS = {
    "gdrive_search_files",
    "gdrive_read_document",
    "gdrive_read_spreadsheet",
    "gdrive_list_folder",
}

async def get_gdrive_tools(token: str):
    """
    Initializes Google Drive MCP tools for a specific user using their OAuth token.
    """
    client = MultiServerMCPClient({
        "google_drive": {
            "transport": "stdio",
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-google-drive"],
            "env": {
                "MCP_MODE": "stdio",
                "LOG_LEVEL": "error",
                "DISABLE_CONSOLE_OUTPUT": "true",
                "GOOGLE_DRIVE_ACCESS_TOKEN": token, 
            }
        }
    })

    tools = await client.get_tools()

    # 🧠 HARD FILTER
    tools = [t for t in tools if t.name in ALLOWED_GDRIVE_TOOLS]

    print("✅ Loaded Google Drive tools:", [t.name for t in tools])

    return tools