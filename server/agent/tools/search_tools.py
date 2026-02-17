from langchain_community.tools import DuckDuckGoSearchResults

def get_search_tools():
    search_tool = DuckDuckGoSearchResults(
        num_results=5,
        output_format="list",
    )

    return [search_tool]
