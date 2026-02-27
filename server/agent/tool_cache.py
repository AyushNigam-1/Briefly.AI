from typing import Dict, List, Any

# Single global dictionary to hold all tools
# Key format will be "tool_name:token" (e.g., "search:default" or "notion:secret_123")
_TOOL_CACHE: Dict[str, List[Any]] = {}

def get_cached_tools(tool_type: str, token: str = "default") -> List[Any]:
    """
    Retrieve tools from the global cache.
    Uses 'default' for tools that don't require user-specific tokens.
    """
    cache_key = f"{tool_type}:{token}"
    return _TOOL_CACHE.get(cache_key)

def set_cached_tools(tool_type: str, tools: List[Any], token: str = "default"):
    """
    Store tools in the global cache.
    """
    cache_key = f"{tool_type}:{token}"
    _TOOL_CACHE[cache_key] = tools