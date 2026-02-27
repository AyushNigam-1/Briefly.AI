from langchain_mcp_adapters.client import MultiServerMCPClient
import os

# ⚠️ Note: I updated these names to match the exact tools
# provided by the @scarecr0w12/discord-mcp package.
ALLOWED_DISCORD_TOOLS = {
    "list_servers",
    "list_channels",
    # "get_channel_info",
    # "list_members",
    # "list_roles"
}

async def get_discord_tools(token: str):
    """
    Initializes Discord MCP tools for a specific user using their OAuth token.
    """
    client = MultiServerMCPClient({
        "discord": {
            "transport": "stdio",
            "command": "npx",
            "args": ["-y", "@scarecr0w12/discord-mcp"], 
            "env": {
                # REQUIRED: Force the package to use stdio instead of HTTP
                "MCP_TRANSPORT": "stdio", 
                "LOG_LEVEL": "error",
                "DISABLE_CONSOLE_OUTPUT": "true",
                # REQUIRED: The package expects "DISCORD_BOT_TOKEN"
                "DISCORD_BOT_TOKEN": token,
            }
        }
    })

    tools = await client.get_tools()

    # 🧠 HARD FILTER
    tools = [t for t in tools if t.name in ALLOWED_DISCORD_TOOLS]

    print("✅ Loaded Discord tools:", [t.name for t in tools])

    return tools