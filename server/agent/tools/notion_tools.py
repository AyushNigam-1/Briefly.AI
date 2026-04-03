from langchain_mcp_adapters.client import MultiServerMCPClient

async def get_notion_tools(user_notion_token: str):
    client = MultiServerMCPClient(
        {
            "notion": {
            "transport": "sse", 
            "url": "https://ayush456-mcp-gateway.hf.space/notion/mcp",
            "headers": {
                "Authorization": f"Bearer {user_notion_token}",
            },
        }
        }
    )

    tools = await client.get_tools()
    return tools
