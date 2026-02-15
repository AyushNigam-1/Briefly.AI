from langchain.agents import create_agent
from langchain_community.tools import DuckDuckGoSearchResults
from langchain_mcp_adapters.client import MultiServerMCPClient
from utils.llm import llm

# 1. Accept the user's token as an argument
async def get_agent(user_notion_token: str):
    search_tool = DuckDuckGoSearchResults(
        num_results=5,
        output_format="list",
    )

    # 2. Configure the client to use your running server
    client = MultiServerMCPClient(
        {
            "notion": {
                "transport": "http",
                "url": "http://localhost:3333/mcp", # Points to your NEW local server
                "headers": {
                    "Authorization": f"Bearer {user_notion_token}",
                },
            }
        }
    )

    # The rest is standard...
    tools = await client.get_tools()
    tools.append(search_tool)
    
    print(f"Loaded {len(tools)} tools for token ending in ...{user_notion_token[-4:]}")

    agent = create_agent(
        llm,
        tools=tools,
    )

    return agent