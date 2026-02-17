from langchain.agents import create_agent
from agent.tools.notion_tools import get_notion_tools
from agent.tools.search_tools import get_search_tools
from utils.llm import llm
import json
# 1. Accept the user's token as an argument
async def get_agent(user_notion_token: str = None, enable_notion: bool = False):
    tools = []

    tools.extend(get_search_tools())

    if enable_notion and user_notion_token:
        try:
            notion_tools = await get_notion_tools(user_notion_token)
            tools.extend(notion_tools)
            print("✅ Notion MCP loaded")
        except Exception as e:
            print("⚠️ Notion MCP unavailable:", e)

    print(f"Total tools loaded: {len(tools)}")

    agent = create_agent(
        llm,
        tools=tools,
    )

    return agent


async def run_agent(messages):
    agent = await get_agent(user_notion_token="YOUR_NOTION_TOKEN")
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

    agent = await get_agent()

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
