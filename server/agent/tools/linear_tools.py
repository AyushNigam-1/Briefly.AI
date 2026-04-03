from langchain_mcp_adapters.client import MultiServerMCPClient

ALLOWED_LINEAR_TOOLS = {
    "linear_get_teams",
    "linear_search_issues",
    "linear_search_projects",
    "linear_get_user",
    "linear_create_issue",
    "linear_delete_issue",
    "linear_get_issue_comments",
    "linear_create_comment"
}

async def get_linear_tools(user_oauth_token: str):
    """
    Initializes Linear MCP tools securely for a SPECIFIC user.
    Connects to the local multi-tenant SSE server on Port 3337.
    """
    client = MultiServerMCPClient({
        "linear": {
            "transport": "sse",
            "url": "https://ayush456-mcp-gateway.hf.space/linear/sse",
            "headers": {
                "Authorization": f"Bearer {user_oauth_token}",
            }
        }
    })

    tools = await client.get_tools()
    print("tools",tools)
    # 🧠 HARD FILTER
    tools = [t for t in tools if t.name in ALLOWED_LINEAR_TOOLS]
    print("✅ Loaded Linear tools:", [t.name for t in tools])

    return tools