from langchain.agents import create_agent
from langchain_community.tools import DuckDuckGoSearchResults
from utils.llm import llm

def get_agent():
    search_tool = DuckDuckGoSearchResults(
        num_results=5,
        output_format="list",  # IMPORTANT → gives structured sources
    )

    agent = create_agent(
        llm,
        tools=[search_tool],
    )

    return agent
