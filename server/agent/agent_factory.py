from langchain.agents import create_agent
from agent.tools.notion_tools import get_notion_tools
from agent.tools.search_tools import get_search_tools
from agent.tools.n8n_tools import get_n8n_tools
from agent.tools.gdrive_tools import get_gdrive_tools
from agent.tools.slack_tools import get_slack_tools
from agent.tools.linear_tools import get_linear_tools
import asyncio
import logging
from typing import List
from pydantic import BaseModel, Field
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda
from agent.tool_cache import *
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from groq import Groq
import os
import json
import logging
import hashlib
import logging
from pydantic import BaseModel, Field
from typing import List

class MemoryExtraction(BaseModel):
    """Evaluates if the text contains durable facts, then extracts them."""
    has_concrete_facts: bool = Field(
        description="True ONLY if the user states a concrete fact, skill, or goal. False for questions, chat, or filler."
    )
    memories: List[str] = Field(
        description="If has_concrete_facts is true, list the facts. If false, output an empty list [].",
        default_factory=list
    )

load_dotenv()
AGENT_CACHE = {}
logger = logging.getLogger(__name__)
api_key = os.getenv("groq_api_key")
groq_client = Groq(api_key=api_key)

ROUTER_TIMEOUT_SECONDS = 10

GUARD_MODEL = "meta-llama/llama-prompt-guard-2-86m"

async def run_guard(text: str):
    res = groq_client.chat.completions.create(
        model=GUARD_MODEL,
        messages=[{"role": "user", "content": text}],
        temperature=0,
    )

    raw = res.choices[0].message.content.strip()

    try:
        score = float(raw)
    except:
        return True, raw
    THRESHOLD = 0.1

    is_safe = score < THRESHOLD
    return is_safe

class ToolRouteResponse(BaseModel):
    apps: List[str] = Field(
        description="List of required app names. Empty list if none."
    )


async def route_tools(user_prompt: str, available_apps: List[str]) -> List[str]:
    """
    Production-grade tool router using structured output.
    Deterministic. No regex. No manual JSON parsing.
    """
    if not available_apps:
        return []

    try:
        llm = ChatGroq(
            model="llama-3.1-8b-instant",
            groq_api_key=api_key,
            temperature=0,
        )
        structured_llm = llm.with_structured_output(ToolRouteResponse, method="json_mode")

        prompt = ChatPromptTemplate.from_messages([
            (
                "system",
                """You are a precise routing assistant. 
                Your task is to select which apps are required to answer the user's prompt.
                
                Available apps: {available_apps}

                Rules:
                - You must respond in valid JSON format ONLY.
                - The JSON must have a single key "apps" mapping to a list of strings.
                - No conversational text, no explanations, no markdown blocks.
                - If no apps are needed, return an empty list: {{"apps": []}}
                """
            ),
            ("human", "{input}")
        ])

        chain = prompt | structured_llm

        result = await chain.ainvoke({
            "input": user_prompt,
            "available_apps": available_apps
        })

        return [app for app in result.apps if app in available_apps]

    except asyncio.TimeoutError:
        logger.warning("Router timeout")
        return []

    except Exception as e:
        logger.exception(f"Router failure: {e}")
        return []

def _build_agent_cache_key(
    modal_name,
    enable_notion,
    enable_gdrive,
    enable_linear,
    enable_slack,
    enable_n8n,
    notion_token,
    gdrive_token,
    linear_token,
    slack_token,
):
    """
    Create deterministic cache key for agent config.
    Tokens are hashed to avoid storing raw secrets.
    """
    raw = f"""
    {modal_name}|
    notion:{enable_notion}:{notion_token}|
    gdrive:{enable_gdrive}:{gdrive_token}|
    linear:{enable_linear}:{linear_token}|
    slack:{enable_slack}:{slack_token}|
    n8n:{enable_n8n}
    """

    return hashlib.md5(raw.encode()).hexdigest()


async def get_agent(
    modal_name="meta-llama/llama-4-scout-17b-16e-instruct",
    user_notion_token=None, enable_notion=False,
    user_gdrive_token=None, enable_gdrive=False,
    user_linear_token=None, enable_linear=False,
    user_slack_token=None, enable_slack=False,
    enable_n8n=False,
):
    if not modal_name:
            modal_name = "meta-llama/llama-4-scout-17b-16e-instruct"
            
    cache_key = _build_agent_cache_key(
        modal_name,
        enable_notion,
        enable_gdrive,
        enable_linear,
        enable_slack,
        enable_n8n,
        user_notion_token,
        user_gdrive_token,
        user_linear_token,
        user_slack_token,
    )

    if cache_key in AGENT_CACHE:
        logger.info("Reusing cached agent")
        return AGENT_CACHE[cache_key]

    logger.info("Creating new agent instance")

    llm = ChatGroq(
        model=modal_name,
        groq_api_key=api_key,
        streaming=True
    )

    tools = []

    cached_search = get_cached_tools("search")
    if not cached_search:
        cached_search = get_search_tools()
        set_cached_tools("search", cached_search)

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
        if not is_enabled:
            continue

        if requires_token and not token:
            continue

        cache_key_token = token if token else "default"
        cached_tool = get_cached_tools(name, cache_key_token)

        if not cached_tool:
            try:
                if requires_token:
                    cached_tool = await fetch_func(token)
                else:
                    cached_tool = await fetch_func()

                set_cached_tools(name, cached_tool, cache_key_token)
            except Exception:
                cached_tool = []

        if cached_tool:
            tools.extend(cached_tool)

    agent = create_agent(llm, tools=tools)

    AGENT_CACHE[cache_key] = agent

    logger.info("Agent cached", extra={"cache_key": cache_key})

    return agent


async def generate_chat_title(user_input):
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        groq_api_key=api_key,
        temperature=0.3, 
        streaming=False 
    )

    messages = [
        (
            "system", 
            """You are a UI-focused Content Labeler. 
            Your task is to generate a high-quality, concise chat title based on the user's initial query.

            RULES:
            1. LENGTH: Exactly 2–4 words.
            2. STYLE: Use "Title Case" (e.g., 'Solana Smart Contracts' not 'solana smart contracts').
            3. CONTENT: Focus on the 'Core Subject' or 'Goal'. 
            4. CLEANLINESS: No punctuation, no quotes, no 'Chat about...', no prefixes.
            5. COGNITIVE LOAD: The title must be instantly recognizable in a crowded sidebar.

            EXAMPLES:
            - User: "how do I fix this rust borrow checker error?" -> 'Rust Borrow Debugging'
            - User: "plan a trip to thailand for a vegan" -> 'Thailand Vegan Travel'
            - User: "help me with nextjs 14 layout shifts" -> 'Next.js Layout Optimization'
            """
        ),
        ("human", user_input),
    ]

    res = await llm.ainvoke(messages)
    return res.content.strip()

async def extract_memory(user_input, assistant_output, existing_memories):
    print("Memory extraction triggered...")
    
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        groq_api_key=api_key,
        temperature=0,
        streaming=False 
    )

    structured_llm = llm.with_structured_output(MemoryExtraction)

    messages = [
        (
            "system",
            f"""You are a strict data extraction algorithm.
            Your ONLY job is to extract facts, skills, and goals about the user.

            RULES:
            1. Rephrase aspirations as facts (e.g., "I want to be a dev" -> "User's goal is to be a software developer").
            2. Ignore greetings, emotions, and the assistant's advice.
            3. Do not duplicate these existing memories: {existing_memories if existing_memories else "None"}

            EXAMPLES:
            Input: "i want to be software developer"
            Output: ["User wants to be a software developer"]

            Input: "I'm using Rust"
            Output: ["User programs in Rust"]
            """
        ),
        (
            "human", 
            f"Input: {user_input}"
        )
    ]
    
    try:
        res = await structured_llm.ainvoke(messages)
        print(f"Extracted Memories: {res.memories}")
        return res.memories
        
    except Exception as e:
        print(f"Memory extraction parsing failed: {e}")
        return []

def extract_sources(messages):
    sources = []
    if not messages:
        return sources

    for msg in messages:
        msg_type = msg.get("type") if isinstance(msg, dict) else getattr(msg, "type", None)
        msg_content = msg.get("content") if isinstance(msg, dict) else getattr(msg, "content", "")

        if msg_type == "tool":
            try:
                if isinstance(msg_content, str) and msg_content.strip():
                    parsed = json.loads(msg_content)
                    if isinstance(parsed, list):
                        sources.extend(parsed)
            except Exception as e:
                print(f"Failed to parse tool JSON: {e}")
                pass

    return sources

