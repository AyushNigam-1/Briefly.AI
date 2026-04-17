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
from langchain_core.prompts import ChatPromptTemplate
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
            model="meta-llama/llama-4-scout-17b-16e-instruct",
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

def get_tool_prompts(user_id: str):
    return {
        "n8n": (
            "N8N AUTOMATION RULES & CAPABILITIES:\n"
            "- CAPABILITIES: If the user asks what automations you can build, explain that you can create scheduled background tasks that scrape websites, analyze the content using an AI brain based on custom rules, and send conditional alerts via Email or Push Notification. You can also create, read, update, test, and delete these workflows.\n"
            "- CRITICAL: Before creating a workflow, you MUST call `get_workflow_blueprint()`.\n"
            "- The blueprint is a SUPERSET of available nodes. You MUST heavily customize it based on the user's request:\n"
            "  1. PRUNING: Delete any nodes the user didn't explicitly ask for. (e.g., If they only want an Email, completely delete the 'Push' node. If they just want a scheduled email without web scraping, delete 'Fetch Website' and 'Ask LLM Brain').\n"
            "  2. REWIRING: You MUST update the 'connections' dictionary. The 'true' branch of 'Should I Notify?' MUST connect ONLY to the notification nodes the user requested. If no logic is needed, connect the trigger directly to the action node.\n"
            "  3. SCHEDULING: Modify the 'Schedule' node parameters to match the requested timeframe (e.g., change field to 'seconds' and expression to 10).\n"
            f"  4. VARIABLES: Replace 'TARGET_USER_ID' with: {user_id}. Replace 'TARGET_EMAIL' with their email. For 'TARGET_URL', replace it ONLY with the raw website URL. Do NOT add Jina manually, it is already in the blueprint!\n"
            "  5. RULE EXTRACTION: Replace 'USER_RULE' with ONLY the logical condition. (e.g., If user says 'Email me about Unnao news', the USER_RULE should simply be 'News about Unnao').\n"
            "💡 PRO TIP: If the user asks to monitor 'news' about a topic, DO NOT use a specific newspaper website. Instead, construct a Google News URL. Example: If they ask for 'Unnao news', replace TARGET_URL with 'https://news.google.com/search?q=unnao%20news'.\n"
            "- SECRETS: You ALREADY have all required API keys (n8n, Resend, OneSignal, Jina) configured in the backend environment. NEVER ask the user for API keys, credentials, or tokens. Just execute the task.\n"
            "- DATA HANDLING: NEVER output raw data, raw HTML, or raw JSON from external sources directly to the user. You MUST parse the data, pass it through your own reasoning, and explain it conversationally.\n"
            "- EXTERNAL RESOURCES: NEVER guess or assume URLs, API endpoints, or external websites. If the user asks for an automation involving a website but does not provide the exact URL, you MUST stop and ask them for the exact URL before building the workflow.\n"
            "- UPDATE PROTOCOL: If modifying an existing workflow, ALWAYS call `n8n_get_workflow` first to get the current state, modify the parameters, then call `n8n_update_workflow`.\n"
            "- POST-CREATION MESSAGE: After successfully creating a workflow, you MUST politely inform the user: 'You can activate and configure this task by going to the **Manage Tasks** option.'\n"
        ),
       "notion": (
            "NOTION RULES & CAPABILITIES:\n"
            "- CAPABILITIES: If asked, explain you can search and read Notion databases, and extract content directly from Notion pages.\n"
            "- FORMATTING: ALWAYS format retrieved Notion data as clean Markdown tables or structured bulleted lists for maximum readability.\n"
            "- DATA HANDLING: NEVER dump raw JSON or raw Notion UUIDs to the user. Always reference pages and databases by their human-readable Title.\n"
            "- AUTHENTICATION & ERRORS: NEVER state that you cannot access Notion or refuse the ability to use it. If you lack access or receive an invalid token error, politely instruct the user to 'connect the app, or if already connected, disconnect and reconnect it by clicking on your user icon and navigating to Integrations'.\n"
        ),
        "gdrive": (
            "GOOGLE DRIVE RULES & CAPABILITIES:\n"
            "- CAPABILITIES: If asked, explain you can search, read, create, update, and delete files in Google Drive.\n"
            "- CREATION & TITLING: When creating a new file, autonomously generate a highly descriptive, professional title based on the content.\n"
            "- DATA HANDLING: NEVER dump raw JSON metadata or raw Google Drive File IDs to the user. Reference files strictly by their names.\n"
            "- LINKING: If the user needs to view or edit the file directly, provide a clean, clickable Markdown link using the file's web link (e.g., `[Document Title](url)`).\n"
            "- AUTHENTICATION & ERRORS: NEVER state that you cannot access Google Drive or refuse the ability to use it. If you lack access or receive an invalid token error, politely instruct the user to 'connect the app, or if already connected, disconnect and reconnect it by clicking on your user icon and navigating to Integrations'.\n"
        ),
        "linear": (
            "LINEAR RULES & CAPABILITIES:\n"
            "- CAPABILITIES: If asked, explain you can search issues and projects, fetch teams and users, create or delete issues, and read or post issue comments.\n"
            "- TAGGING: ALWAYS tag specific Linear issues using their official identifier format (e.g., `ENG-123`).\n"
            "- ISSUE CREATION: When creating an issue, write a concise, action-oriented title. The description must be well-structured and include all necessary context.\n"
            "- FORMATTING: When listing multiple issues, present them as clean Markdown tables including the Identifier, Title, Status, and Assignee.\n"
            "- DATA HANDLING: NEVER dump raw API JSON. Extract and synthesize the human-readable text.\n"
            "- AUTHENTICATION & ERRORS: NEVER state that you cannot access Linear or refuse the ability to use it. If you lack access or receive an invalid token error, politely instruct the user to 'connect the app, or if already connected, disconnect and reconnect it by clicking on your user icon and navigating to Integrations'.\n"
        ),
        "slack": (
            "SLACK RULES & CAPABILITIES:\n"
            "- CAPABILITIES: If asked, explain you can read channel history, list channels, fetch user profiles, post new messages, reply to specific threads, and add emoji reactions.\n"
            "- COMMUNICATION STYLE: Keep any generated Slack messages concise, professional, and action-oriented. Avoid unnecessary fluff.\n"
            "- MENTIONS: ALWAYS use the proper `<@username>` or `<@user_id>` syntax when instructed to tag or mention specific users in a message.\n"
            "- SUMMARIZATION: When retrieving channel history or thread replies, synthesize the conversation logically. Do not dump raw JSON, raw timestamps, or internal user IDs.\n"
            "- AUTHENTICATION & ERRORS: NEVER state that you cannot access Slack or refuse the ability to use it. If you lack access or receive an invalid token error, politely instruct the user to 'connect the app, or if already connected, disconnect and reconnect it by clicking on your user icon and navigating to Integrations'.\n"
        )
    }

async def get_agent(
    modal_name="meta-llama/llama-4-scout-17b-16e-instruct",
    user_id=None,
    user_notion_token=None, enable_notion=False,
    user_gdrive_token=None, enable_gdrive=False,
    user_linear_token=None, enable_linear=False,
    user_slack_token=None, enable_slack=False,
    enable_n8n=False,
):
    if not modal_name:
        modal_name = "meta-llama/llama-4-scout-17b-16e-instruct"
            
    cache_key = _build_agent_cache_key(
        modal_name, enable_notion, enable_gdrive, enable_linear, enable_slack, enable_n8n,
        user_notion_token, user_gdrive_token, user_linear_token, user_slack_token,
    )

    if cache_key in AGENT_CACHE:
        logger.info("Reusing cached agent")
        print(f"📦 [GET AGENT] Returning cached agent for key: {cache_key}")
        return AGENT_CACHE[cache_key]

    print("\n" + "🛠️"*20)
    print("🛠️ [GET AGENT] CREATING NEW INSTANCE")
    print("🛠️" * 20)

    llm = ChatGroq(
        model=modal_name,
        groq_api_key=api_key,
        streaming=True
    )

    tools = []
    active_tool_prompts = [] 
    
    tool_instructions = get_tool_prompts(user_id=str(user_id))

    cached_search = get_cached_tools("search")
    if not cached_search:
        cached_search = get_search_tools()
        set_cached_tools("search", cached_search)

    if cached_search:
        tools.extend(cached_search)
        active_tool_prompts.append("SEARCH RULES: Synthesize web information concisely. Do not list raw URLs unless explicitly asked.")

    mcp_configs = [
        ("n8n", enable_n8n, user_id, get_n8n_tools, False), 
        ("notion", enable_notion, user_notion_token, get_notion_tools, True),
        ("gdrive", enable_gdrive, user_gdrive_token, get_gdrive_tools, True),
        ("linear", enable_linear, user_linear_token, get_linear_tools, True),
        ("slack", enable_slack, user_slack_token, get_slack_tools, True),
    ]
    
    for name, is_enabled, token, fetch_func, requires_token in mcp_configs:
        if not is_enabled:
            print(f"   ⏭️ [EVAL] {name.upper()}: Skipped (Not Enabled by Router)")
            continue
            
        print(f"   ➡️ [EVAL] {name.upper()}: Enabled = True. Fetching tools...")
        
        if requires_token and not token:
            print(f"   ❌ [EVAL] {name.upper()}: FAILED. Tool enabled but token is missing!")
            logger.warning(f"Tool {name} enabled but missing token. Skipping.")
            
            # 🌟 FIX 1: The AI must know the user tried to use a tool without a token!
            active_tool_prompts.append(
                f"{name.upper()} MISSING CONNECTION: The user requested an action involving {name.capitalize()}, but their account is NOT connected. "
                f"NEVER refuse the ability to use this tool or say you cannot access external apps. Instead, politely instruct the user exactly like this: "
                f"'To access your {name.capitalize()} account, please connect the app by clicking on your user icon and navigating to Integrations.'"
            )
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
                print(f"   ✅ [EVAL] {name.upper()}: Successfully fetched {len(cached_tool)} tools from remote server!")
            except Exception as e:
                print(f"   🚨 [EVAL FATAL ERROR] {name.upper()} Failed to connect to Hugging Face Gateway!")
                print(f"   🚨 Error details: {e}")
                import traceback
                traceback.print_exc()
                cached_tool = []
                
                # 🌟 FIX 2: The AI must know the tool failed to load due to an invalid token/gateway error!
                active_tool_prompts.append(
                    f"{name.upper()} CONNECTION ERROR: The connection to {name.capitalize()} failed or the token is invalid. "
                    f"NEVER refuse the ability to use this tool or say you cannot access external apps. Instead, politely instruct the user exactly like this: "
                    f"'There seems to be an issue connecting to {name.capitalize()}. Please disconnect and reconnect the app by clicking on your user icon and navigating to Integrations.'"
                )
        else:
            print(f"   ✅ [EVAL] {name.upper()}: Loaded {len(cached_tool)} tools from Local Cache.")

        if cached_tool:
            tools.extend(cached_tool)
            if name in tool_instructions:
                active_tool_prompts.append(tool_instructions[name])

    print("\n" + "🏁"*20)
    print(f"🏁 [GET AGENT] FINAL LOADED TOOLS: {[t.name for t in tools]}")
    print("🏁" * 20 + "\n")

    dynamic_system_message = (
        "You are an intelligent workflow and utility agent.\n\n"
        "### ACTIVE TOOL CAPABILITIES & RULES ###\n" + 
        "\n\n".join(active_tool_prompts)
    )

    agent = create_agent(
        llm, 
        tools=tools, 
        system_prompt=dynamic_system_message
    )

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
            f"""You are a strict LONG-TERM memory extraction algorithm.
            Your ONLY job is to extract core identity facts, skills, and long-term preferences about the user.

            CRITICAL RULES:
            1. ONLY extract long-term facts (e.g., career, location, programming languages, dietary preferences, long-term goals).
            2. IGNORE ALL TRANSIENT TASKS AND COMMANDS. Do NOT save what the user is asking you to build, create, or automate right now. 
            3. IGNORE TEMPORARY DATA like specific URLs, timers, or target email addresses used for a single task.
            4. STRICT NO DUPLICATION: Carefully review these existing memories: {existing_memories if existing_memories else "None"}. If the input fact is already known, or means the exact same thing, DO NOT extract it again.
            5. IF NO NEW LONG-TERM FACTS EXIST, return an empty array: []

            EXAMPLES:
            Input: "I want to be a software developer"
            Output: ["User's goal is to be a software developer"]

            Input: "I'm using Rust"
            Output: ["User programs in Rust"]

            Input: "Create an email notifier for unnao news to ayush@gmail.com every 10 secs"
            Output: [] 
            
            Input: "Delete the 10-second workflow"
            Output: []
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

