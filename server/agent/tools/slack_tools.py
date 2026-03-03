from langchain_mcp_adapters.client import MultiServerMCPClient

ALLOWED_SLACK_TOOLS = {
    "slack_get_channel_history",
    "slack_post_message",
    "slack_list_channels",
    "slack_get_users",
    "slack_get_thread_replies",
    "slack_reply_to_thread",   # Added the new reply tool we built
    "slack_add_reaction",      # Added the new reaction tool we built
    "slack_get_user_profile"   # Added the new profile tool we built
}

async def get_slack_tools(token: str):
    """
    Initializes Slack MCP tools for a specific user using their OAuth bot token.
    Connects to the local multi-tenant SSE server.
    """
    client = MultiServerMCPClient({
        "slack": {
            "transport": "sse",
            
            "url": "http://10.207.18.43:3335/sse",
            
            "headers": {
                "Authorization": f"Bearer {token}",
            }
        }
    })

    tools = await client.get_tools()

    tools = [t for t in tools if t.name in ALLOWED_SLACK_TOOLS]

    print("✅ Loaded Slack tools:", [t.name for t in tools])

    return tools