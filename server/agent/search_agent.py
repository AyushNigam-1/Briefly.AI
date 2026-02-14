from langchain.agents import create_agent
from langchain_community.tools import DuckDuckGoSearchResults
from langchain_mcp_adapters.client import MultiServerMCPClient
from utils.llm import llm


async def get_agent():
    search_tool = DuckDuckGoSearchResults(
        num_results=5,
        output_format="list",
    )

    client = MultiServerMCPClient(
        {
            "notion": {
                "transport": "http",
                "url": "http://localhost:3333/mcp",
                "headers": {
                    "Authorization": "Bearer 253aa01e6052fdd6fd8dfca84a731191ff9b3f6911c29994b45a804c39f8a68e",
                },
            }
        }
    )

    tools = await client.get_tools()
    tools.append(search_tool)
    print(f"Loaded {len(tools)} tools.")
    agent = create_agent(
        llm,
        tools=tools,
    )

    return agent
