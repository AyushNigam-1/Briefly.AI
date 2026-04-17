from langgraph.graph import StateGraph, START, END
from typing import TypedDict, Optional, List
from agent.agent_factory import route_tools, get_agent, extract_sources , extract_memory , generate_chat_title , run_guard
from controllers.memory_handler import get_user_memories, save_user_memories
from controllers.integrations_handler import get_all_app_tokens
from controllers.file_handler import process_files
from typing import TypedDict, Optional, List
import traceback 


class AgentState(TypedDict):
    messages: list
    modal_name: str
    available_apps: List[str]
    selected_apps: List[str]

    files: Optional[List[any]]     
    uploaded_files: Optional[list]
    blocked: Optional[bool]

    response: Optional[str]
    full_messages: Optional[list]
    sources: Optional[list]
    is_new_chat: bool
    title: Optional[str]

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
    print("\n" + "🚦"*20)
    print("🚦 [ROUTER NODE] STARTED")
    
    try:
        last_message = state["messages"][-1]
        user_prompt = last_message.content if hasattr(last_message, 'content') else last_message[-1]
        
        print(f"🚦 [ROUTER NODE] User Prompt: '{user_prompt}'")
        print(f"🚦 [ROUTER NODE] Available Apps to Choose From: {state.get('available_apps')}")

        selected = await route_tools(
            user_prompt=user_prompt,
            available_apps=state.get("available_apps", []),
        )
        
        print(f"🚦 [ROUTER NODE] RAW LLM OUTPUT: {selected}")
        print(f"🚦 [ROUTER NODE] OUTPUT TYPE: {type(selected)}")
        
        if isinstance(selected, str):
            print("⚠️ [ROUTER NODE] WARNING: Router returned a string instead of a list! Fixing...")
            selected = [app.strip() for app in selected.replace('[','').replace(']','').replace('"','').replace("'",'').split(',') if app.strip()]
            print(f"🚦 [ROUTER NODE] FIXED LIST: {selected}")

        print("🚦" * 20 + "\n")
        return {"selected_apps": selected}
        
    except Exception as e:
        print(f"❌ [ROUTER NODE FATAL ERROR] {e}")
        traceback.print_exc()
        return {"selected_apps": []}

async def file_processor_node(state: AgentState):
    if state.get("blocked"):
        return {}

    files = state.get("files")
    if not files:
        return {"uploaded_files": []}

    if isinstance(files[0], dict):
        print("\n📂 [FILE NODE] Edit/Regenerate detected. Bypassing extraction.")
        return {"uploaded_files": files}

    print("\n📂 [FILE NODE] Extracting text/media via Gemini & MarkItDown...")
    file_context, uploaded_metadata = await process_files(files)
    
    for meta in uploaded_metadata:
        meta["extracted_text"] = file_context
    
    print(f"📂 [FILE NODE] Extraction Complete. {len(files)} files processed.")

    return {"uploaded_files": uploaded_metadata}

async def agent_node(state: AgentState):
    if state.get("blocked"):
        return {}

    print("\n" + "🤖"*20)
    print("🤖 [AGENT NODE] STARTED")
    
    token_data = await get_all_app_tokens(user_id=state["user_id"])
    app_tokens = token_data.get("app_tokens", {})
    
    selected_apps = state.get("selected_apps", [])
    enable_notion = "notion" in selected_apps
    enable_gdrive = "google_drive" in selected_apps
    enable_linear = "linear" in selected_apps
    enable_slack = "slack" in selected_apps
    enable_n8n = "n8n" in selected_apps

    messages = state["messages"].copy()
    uploaded_files = state.get("uploaded_files", [])
    
    extracted_texts = [f.get("extracted_text", "") for f in uploaded_files if "extracted_text" in f]
    
    if extracted_texts:
        print("🤖 [AGENT NODE] Injecting file context into temporary prompt...")
        combined_context = "\n".join(extracted_texts)
        last_msg = messages[-1]
        
        if hasattr(last_msg, 'content'):
            original_text = last_msg.content
            msg_class = type(last_msg) 
            new_msg = msg_class(content=f"CONTEXT FROM ATTACHED FILES:\n{combined_context}\n\nUSER PROMPT:\n{original_text}")
            messages[-1] = new_msg
        elif isinstance(last_msg, tuple):
            original_text = last_msg[1]
            messages[-1] = (last_msg[0], f"CONTEXT FROM ATTACHED FILES:\n{combined_context}\n\nUSER PROMPT:\n{original_text}")

    try:
        agent = await get_agent(
            modal_name=state["modal_name"],
            user_id=state["user_id"],
            enable_notion=enable_notion,
            user_notion_token=app_tokens.get("notion"),
            enable_gdrive=enable_gdrive,
            user_gdrive_token=app_tokens.get("google_drive"),
            enable_linear=enable_linear,
            user_linear_token=app_tokens.get("linear"),
            enable_slack=enable_slack,
            user_slack_token=app_tokens.get("slack"),
            enable_n8n=enable_n8n,
        )

        print("🤖 [AGENT NODE] Invoking LangChain Agent...")
        response = await agent.ainvoke({"messages": messages})
        
        assistant_text = response["messages"][-1].content
        print("🤖 [AGENT NODE] Agent Execution Complete!")
        print("🤖" * 20 + "\n")

        return {
            "response": assistant_text,
            "assistant_text": assistant_text,
            "full_messages": response["messages"],
        }
    except Exception as e:
        print(f"❌ [AGENT NODE FATAL ERROR] {e}")
        import traceback
        traceback.print_exc()
        raise e

def postprocess_node(state: AgentState):
    sources = extract_sources(state["full_messages"])
    return {
        "sources": sources
    }

async def memory_node(state: AgentState):
    if state.get("blocked"):
        return {}

    existing_memories = get_user_memories(state["user_id"])

    new_memories = await extract_memory(
        user_input=state["user_input"],
        assistant_output=state["assistant_text"],
        existing_memories=existing_memories,
    )

    if new_memories:
         save_user_memories(state["user_id"], new_memories)
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

workflow = StateGraph(AgentState)

workflow.add_node("guard", guard_node)
workflow.add_node("file_processor", file_processor_node) 
workflow.add_node("router", router_node)
workflow.add_node("agent", agent_node)
workflow.add_node("memory", memory_node)
workflow.add_node("title", title_node)
workflow.add_node("postprocess", postprocess_node)

workflow.add_edge(START, "guard")
workflow.add_edge("guard", "file_processor")     
workflow.add_edge("file_processor", "router")  
workflow.add_edge("router", "agent")
workflow.add_edge("agent", "memory")
workflow.add_edge("memory", "title")
workflow.add_edge("title", "postprocess")
workflow.add_edge("postprocess", END)

agent_graph = workflow.compile()