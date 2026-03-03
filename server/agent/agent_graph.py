from langgraph.graph import StateGraph, START, END
from typing import TypedDict, Optional, List
from agent.agent_factory import route_tools, get_agent, extract_sources , extract_memory , generate_chat_title , run_guard
from controllers.memory_handler import get_user_memories, save_user_memories
from typing import TypedDict, Optional, List

class AgentState(TypedDict):
    messages: list
    modal_name: str
    available_apps: List[str]
    selected_apps: List[str]

    # guard
    blocked: Optional[bool]

    # model output
    response: Optional[str]
    full_messages: Optional[list]
    sources: Optional[list]

    # title
    is_new_chat: bool
    title: Optional[str]

    # memory
    user_input: str
    user_id: str
    assistant_text: Optional[str]
    extracted_memory: Optional[List[str]]

async def guard_node(state: AgentState):
    is_safe = await run_guard(state["user_input"])

    if not is_safe:
        return {"blocked": True}

    return {"blocked": False}   

async def router_node(state: AgentState):
    selected = await route_tools(
        user_prompt=state["messages"][-1][1],
        available_apps=state["available_apps"],
    )
    return {"selected_apps": selected}

async def agent_node(state: AgentState):
    if state.get("blocked"):
        return {}

    agent = await get_agent(
        modal_name=state["modal_name"],
        enable_notion="notion" in state["selected_apps"],
        enable_gdrive="google_drive" in state["selected_apps"],
        enable_linear="linear" in state["selected_apps"],
        enable_slack="slack" in state["selected_apps"],
        enable_n8n="n8n" in state["selected_apps"],
    )

    response = await agent.ainvoke({"messages": state["messages"]})

    assistant_text = response["messages"][-1].content

    return {
        "response": assistant_text,
        "assistant_text": assistant_text,
        "full_messages": response["messages"],
    }

def postprocess_node(state: AgentState):
    sources = extract_sources(state["full_messages"])
    return {
        "sources": sources
    }

async def memory_node(state: AgentState):
    if state.get("blocked"):
        return {}

    existing_memories = await get_user_memories(state["user_id"])

    new_memories = await extract_memory(
        user_input=state["user_input"],
        assistant_output=state["assistant_text"],
        existing_memories=existing_memories,
    )

    if new_memories:
        await save_user_memories(state["user_id"], new_memories)

    return {"extracted_memory": new_memories}

async def title_node(state: AgentState):
    if state.get("blocked"):
        return {}

    if not state["is_new_chat"]:
        return {}

    title = await generate_chat_title(state["user_input"])
    return {"title": title}

def postprocess_node(state: AgentState):
    full_msgs = state.get("full_messages") or []
    sources = extract_sources(full_msgs)
    return {"sources": sources}

# async def run_agent_with_graph(messages, modal_name, available_apps):
#     initial_state: AgentState = {
#         "messages": messages,
#         "modal_name": modal_name,
#         "available_apps": available_apps,
#         "selected_apps": [],
#         "response": None,
#         "full_messages": None,
#     }

#     final_state = await agent_graph.ainvoke(initial_state)

#     return final_state["response"], final_state["sources"]

workflow = StateGraph(AgentState)

workflow.add_node("guard", guard_node)
workflow.add_node("router", router_node)
workflow.add_node("agent", agent_node)
# workflow.add_node("memory", memory_node)
workflow.add_node("title", title_node)
workflow.add_node("postprocess", postprocess_node)

workflow.add_edge(START, "guard")
workflow.add_edge("guard", "router")
workflow.add_edge("router", "agent")
workflow.add_edge("agent", "title")
# workflow.add_edge("memory", "title")
workflow.add_edge("title", "postprocess")
workflow.add_edge("postprocess", END)

agent_graph = workflow.compile()