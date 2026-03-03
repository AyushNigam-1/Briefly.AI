from langchain_mcp_adapters.client import MultiServerMCPClient

async def get_notion_tools(user_notion_token: str):
    client = MultiServerMCPClient(
        {
            "notion": {
                "transport": "http",
                "url": "http://10.207.18.43:3333/mcp",
                "headers": {
                    "Authorization": f"Bearer {user_notion_token}",
                },
            }
        }
    )

    tools = await client.get_tools()
    return tools
