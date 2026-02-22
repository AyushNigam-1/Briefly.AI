from langchain.agents import create_agent
from agent.tools.notion_tools import get_notion_tools
from agent.tools.search_tools import get_search_tools
from agent.tools.n8n_tools import get_n8n_tools
import asyncio
from agent.tool_cache import *
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from groq import Groq
import os
import json

load_dotenv()
api_key = os.getenv("groq_api_key")
groq_client = Groq(api_key=api_key)

async def get_agent(
    modal_name: str = "meta-llama/llama-4-scout-17b-16e-instruct", 
    user_notion_token: str = None,
    enable_notion: bool = False,
    enable_n8n: bool = False,
):
    print("modal_name",modal_name)
    llm = ChatGroq(model=modal_name, groq_api_key=api_key,streaming=True)
    tools = []
    cached_search = get_cached_search_tools()
    if not cached_search:
        cached_search = get_search_tools()
        set_cached_search_tools(cached_search)

    tools.extend(cached_search)

    if enable_n8n:
        cached_n8n = get_cached_n8n_tools()

        if not cached_n8n:
            try:
                cached_n8n = await get_n8n_tools()
                set_cached_n8n_tools(cached_n8n)
                print("✅ n8n MCP cached")
            except Exception as e:
                print("⚠️ n8n MCP unavailable:", e)

        if cached_n8n:
            tools.extend(cached_n8n)

    if enable_notion and user_notion_token:
        cached_notion = get_cached_notion_tools(user_notion_token)

        if not cached_notion:
            try:
                cached_notion = await get_notion_tools(user_notion_token)
                set_cached_notion_tools(user_notion_token, cached_notion)
                print("✅ Notion MCP cached")
            except Exception as e:
                print("⚠️ Notion MCP unavailable:", e)

        if cached_notion:
            tools.extend(cached_notion)

    print(f"Total tools active: {len(tools)} | Model: {modal_name}")

    return create_agent(llm, tools=tools)

async def stream_agent(messages):
    print("\n================ STREAM AGENT START ================")
    
    agent = await get_agent()
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
