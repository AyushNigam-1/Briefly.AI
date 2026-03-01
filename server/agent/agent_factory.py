from langchain.agents import create_agent
from agent.tools.notion_tools import get_notion_tools
from agent.tools.search_tools import get_search_tools
from agent.tools.n8n_tools import get_n8n_tools
from agent.tools.gdrive_tools import get_gdrive_tools
from agent.tools.slack_tools import get_slack_tools
from agent.tools.linear_tools import get_linear_tools
from agent.tool_cache import *
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from groq import Groq
import re   
import ast
import os
import json

load_dotenv()
api_key = os.getenv("groq_api_key")
groq_client = Groq(api_key=api_key)

async def route_tools(user_prompt: str, available_apps: list) -> list:
    """
    Uses a fast, cheap model to determine which apps are needed for the prompt.
    Bulletproof parsing handles single quotes, markdown, and conversational filler.
    """
    if not available_apps:
        return []

    router_llm = ChatGroq(model="meta-llama/llama-4-maverick-17b-128e-instruct", groq_api_key=api_key, temperature=0)

    system_prompt = f"""
    Analyze the user's prompt. Which of these apps are required to answer it?
    Available apps: {available_apps}
    
    Rules:
    - Return ONLY a JSON list of app names. 
    - Use DOUBLE QUOTES only. Example: ["notion", "slack"]
    - If no apps are needed, return []
    """

    try:
        response = await router_llm.ainvoke([
            ("system", system_prompt),
            ("human", user_prompt)
        ])
        
        raw_content = response.content.strip()
        print("raw_content",raw_content)
        match = re.search(r'\[.*\]', raw_content, re.DOTALL)
        if match:
            clean_str = match.group(0)
        else:
            clean_str = "[]"

        try:
            apps_needed = json.loads(clean_str)
        except json.JSONDecodeError:
            try:
                apps_needed = ast.literal_eval(clean_str)
            except Exception:
                apps_needed = []
        
        if isinstance(apps_needed, list):
            return [str(app) for app in apps_needed if app in available_apps]
            
        return []
        
    except Exception as e:
        print(f"⚠️ Router failed to parse. Error: {e}")
        if 'raw_content' in locals():
            print(f"⚠️ Raw LLM Output was: {raw_content}")
        return []

async def get_agent(
    modal_name: str = "meta-llama/llama-4-scout-17b-16e-instruct", 
    user_notion_token: str = None, enable_notion: bool = False,
    user_gdrive_token: str = None, enable_gdrive: bool = False,
    user_linear_token: str = None, enable_linear: bool = False,
    user_slack_token: str = None, enable_slack: bool = False,
    enable_n8n: bool = False,
):
    print(f"\n⚙️ Initializing Agent | Model: {modal_name}")
    llm = ChatGroq(model=modal_name, groq_api_key=api_key, streaming=True)
    tools = []
    
    cached_search = get_cached_tools("search")
    if not cached_search:
        print("⏳ Cache miss. Fetching Search tools...")
        cached_search = get_search_tools()
        set_cached_tools("search", cached_search)
        print("✅ Search tools loaded.")
    else:
        print("⚡ Loaded Search tools from cache.")
    
    if cached_search:
        tools.extend(cached_search)

    mcp_configs = [
        ("n8n", enable_n8n, "default", get_n8n_tools, False),
        ("notion", enable_notion, user_notion_token, get_notion_tools, True),
        ("gdrive", enable_gdrive, user_gdrive_token, get_gdrive_tools, True),
        ("linear", enable_linear, user_linear_token, get_linear_tools, True),
        ("slack", enable_slack, user_slack_token, get_slack_tools, True),
    ]

    for name, is_enabled, token, fetch_func, requires_token in mcp_configs:
        print(f"🔍 Checking {name.capitalize()} tools...")
        
        if not is_enabled:
            print(f"⏭️ Skipping {name.capitalize()} tools (Flag disabled).")
            continue
            
        if requires_token and not token:
            print(f"⏭️ Skipping {name.capitalize()} tools (Missing token).")
            continue
            
        cache_key_token = token if token else "default"
        cached_tool = get_cached_tools(name, cache_key_token)
        
        if not cached_tool:
            print(f"   ⏳ Cache miss. Fetching {name.capitalize()} MCP tools...")
            try:
                if requires_token:
                    cached_tool = await fetch_func(token)
                else:
                    cached_tool = await fetch_func()
                set_cached_tools(name, cached_tool, cache_key_token)
                print(f"   ✅ {name.capitalize()} MCP tools loaded & cached.")
            except Exception as e:
                print(f"   ⚠️ {name.capitalize()} MCP unavailable: {e}")
                cached_tool = []
        else:
            print(f"⚡ Loaded {name.capitalize()} tools from cache.")
            
        if cached_tool:
            tools.extend(cached_tool)
    
    return create_agent(llm, tools=tools)

async def stream_agent(
    messages, 
    modal_name="meta-llama/llama-4-scout-17b-16e-instruct", 
    notion_token=None, enable_notion=False,
    gdrive_token=None, enable_gdrive=False,
    linear_token=None, enable_linear=False,
    slack_token=None, enable_slack=False,
    enable_n8n=False
):  
    agent = await get_agent(
        modal_name=modal_name,
        user_notion_token=notion_token, enable_notion=enable_notion,
        user_gdrive_token=gdrive_token, enable_gdrive=enable_gdrive,
        user_linear_token=linear_token, enable_linear=enable_linear,
        user_slack_token=slack_token, enable_slack=enable_slack,
        enable_n8n=enable_n8n
    )
    print("✅ Agent created")

    async for event in agent.astream_events({"messages": messages}, version="v2"):
        kind = event["event"]
        
        if kind == "on_chat_model_stream":
            chunk = event["data"]["chunk"]
            if hasattr(chunk, "content") and chunk.content:
                yield chunk.content
                
        elif kind == "on_tool_start":
            tool_name = event["name"]
            tool_inputs = event["data"].get("input")
            print(f"🔧 TOOL STARTED: {tool_name} with inputs: {tool_inputs}")
            
        elif kind == "on_chat_model_end":
            print("📦 MODEL GENERATION COMPLETE")

    print("\n================ STREAM AGENT END ================\n")


async def run_agent(messages,modal_name):
    agent = await get_agent(user_notion_token="YOUR_NOTION_TOKEN",modal_name=modal_name)
    response = await agent.ainvoke({"messages": messages})
    return response["messages"][-1].content, response["messages"]


async def generate_chat_title(user_input):
    agent = await get_agent(user_notion_token="YOUR_NOTION_TOKEN")

    res = await agent.ainvoke({
        "messages": [
            ("system", "Create a short 3–5 word chat title."),
            ("human", user_input),
        ]
    })

    return res["messages"][-1].content.strip()

def extract_sources(messages):
    sources = []

    for msg in messages:
        if getattr(msg, "type", None) == "tool":
            try:
                parsed = json.loads(msg.content)
                if isinstance(parsed, list):
                    sources.extend(parsed)
            except Exception:
                pass

    return sources

async def extract_memory(user_input, assistant_output, existing_memories):

    agent = await get_agent(enable_n8n=False)

    response = await agent.ainvoke({
        "messages": [
            (
                "system",
                f"""
                You extract durable user traits.

                Existing memories:
                {existing_memories}

                Rules:
                - Only NEW info
                - No duplicates
                - No emotions
                - Short bullet points
                - Return [] if nothing
                """
            ),
            ("human", user_input),
            ("assistant", assistant_output)
        ]
    })

    raw = response["messages"][-1].content.strip()

    if raw == "[]" or not raw:
        return []

    return [
        m.strip("- ").strip()
        for m in raw.split("\n")
        if m.strip()
    ]
