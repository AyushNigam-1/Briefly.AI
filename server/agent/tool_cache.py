from typing import Dict, List

_search_tools = None
_n8n_tools = None
_notion_tools: Dict[str, List] = {}


def get_cached_search_tools():
    global _search_tools
    return _search_tools


def set_cached_search_tools(tools):
    global _search_tools
    _search_tools = tools


def get_cached_n8n_tools():
    global _n8n_tools
    return _n8n_tools


def set_cached_n8n_tools(tools):
    global _n8n_tools
    _n8n_tools = tools


def get_cached_notion_tools(token: str):
    return _notion_tools.get(token)


def set_cached_notion_tools(token: str, tools):
    _notion_tools[token] = tools
