from langchain_mcp_adapters.client import MultiServerMCPClient
import os

# ⚠️ UPDATED: These are the exact tool names exported by the official Slack MCP
ALLOWED_SLACK_TOOLS = {
    "slack_get_channel_history",
    "slack_post_message",
    "slack_list_channels",
    "slack_get_users",
    "slack_get_thread_replies"
}

async def get_slack_tools(token: str):
    """
    Initializes Slack MCP tools for a specific user using their OAuth bot token.
    """
    client = MultiServerMCPClient({
        "slack": {
            "transport": "stdio",
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-slack"],
            "env": {
                "MCP_MODE": "stdio",
                "LOG_LEVEL": "error",
                "DISABLE_CONSOLE_OUTPUT": "true",
                # The official package expects the token here
                "SLACK_BOT_TOKEN": token, 
            }
        }
    })

    tools = await client.get_tools()

    # 🧠 HARD FILTER
    tools = [t for t in tools if t.name in ALLOWED_SLACK_TOOLS]

    print("✅ Loaded Slack tools:", [t.name for t in tools])

    return tools