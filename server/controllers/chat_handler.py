from bson import ObjectId
from datetime import datetime, timezone
from controllers.mongo import summary_collection
from typing import Optional
from controllers.mongo import users_collection
from controllers.file_handler import process_files
from agent.agent_graph import agent_graph
from fastapi import HTTPException
import traceback
import os
import json
from groq import Groq

client = Groq(api_key=os.getenv("groq_api_key"))

def get_or_create_chat(chat_id, user_id):
    if chat_id and ObjectId.is_valid(chat_id):
        chat = summary_collection.find_one({"_id": ObjectId(chat_id), "user_id": user_id})
        if chat:
            return chat, chat["_id"], False

    doc = {
        "user_id": user_id,
        "queries": [],
        "timestamp": datetime.now(timezone.utc),
        "title": "New Chat",
        "thought": "",
        "is_pinned":False
    }

    res = summary_collection.insert_one(doc)
    doc["_id"] = res.inserted_id
    return doc, res.inserted_id, True


def build_messages(chat, user_input, file_context):
    messages = [
        (
            "system",
            f"""
                You are Briefly AI, an intelligent personal assistant.
                You have been granted secure, direct access to the user's private data via external tools (Google Drive, Notion).
                If a user asks about their servers, channels, files, or messages, YOU MUST USE YOUR TOOLS to fetch the data.
                NEVER tell the user you cannot access their account. You CAN access it.
                NEVER give generic tutorials. Execute the tools and provide the actual data.
                Uploaded files:
                {file_context if file_context else "None"}
            """
        )
    ]

    for q in chat.get("queries", []):
        role = "human" if q["sender"] == "user" else "assistant"
        messages.append((role, q["content"]))

    messages.append(("human", user_input))
    return messages


def save_chat_turn(chat_id, user_input, assistant_text, files, sources, title=None, thinking_text=None):
    now = datetime.now(timezone.utc)
    llm_turn = {
        "sender": "llm", 
        "content": assistant_text, 
        "sources": sources,
        "created_at": now
    }
    if thinking_text:
        llm_turn["thinking"] = thinking_text

    payload = {
        "$push": {
            "queries": {
                "$each": [
                    {"sender": "user", "content": user_input, "files": files, "created_at": now},
                    llm_turn
                ]
            }
        },
        "$set": {"timestamp": datetime.now(timezone.utc)}
    }

    if title:
        payload["$set"]["title"] = title

    summary_collection.update_one({"_id": chat_id}, payload)

async def chat_stream(user_input, user_id, chat_id=None, files=None, modal_name=None):

    chat_doc, chat_oid, is_new = get_or_create_chat(chat_id, user_id)
    file_context, uploaded_files = await process_files(files, user_id)

    messages = build_messages(chat_doc, user_input, file_context)

    from controllers.mongo import users_collection
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    app_tokens = user.get("app_tokens", {}) if user else {}

    available_apps = []
    if app_tokens.get("notion"):
        available_apps.append("notion")
    if app_tokens.get("google_drive"):
        available_apps.append("google_drive")
    if app_tokens.get("linear"):
        available_apps.append("linear")
    if app_tokens.get("slack"):
        available_apps.append("slack")
    available_apps.append("n8n")

    initial_state = {
        "messages": messages,
        "modal_name": modal_name,
        "available_apps": available_apps,
        "selected_apps": [],
        "blocked": False,
        "is_new_chat": is_new,
        "user_input": user_input,
        "user_id": user_id,
    }

    try:
        assistant_text = ""
        thinking_text = ""
        final_state = None

        async for event in agent_graph.astream_events(initial_state, version="v2"):

            kind = event["event"]

            if kind == "on_chat_model_stream":
                chunk = event["data"]["chunk"]

                # Thinking stream
                if hasattr(chunk, "additional_kwargs"):
                    reasoning = chunk.additional_kwargs.get("reasoning_content")
                    if reasoning:
                        thinking_text += reasoning
                        yield f"data: {json.dumps({'type': 'thinking', 'data': reasoning})}\n\n"

                # Normal tokens
                if hasattr(chunk, "content") and chunk.content:
                    assistant_text += chunk.content
                    yield f"data: {json.dumps({'type': 'token', 'data': chunk.content})}\n\n"

            elif kind == "on_tool_start":
                yield f"data: {json.dumps({'type': 'tool_status', 'tool': event['name'], 'status': 'running'})}\n\n"

            elif kind == "on_tool_end":
                yield f"data: {json.dumps({'type': 'tool_status', 'tool': event['name'], 'status': 'completed'})}\n\n"

            elif kind == "on_chain_end":
                final_state = event["data"]["output"]

        if not final_state:
            final_state = {}

        sources = final_state.get("sources", [])
        title = final_state.get("title")

        if not thinking_text.strip():
            thinking_text = None

        save_chat_turn(
            chat_id=chat_oid,
            user_input=user_input,
            assistant_text=assistant_text,
            files=uploaded_files,
            sources=sources,
            title=title,
            thinking_text=thinking_text
        )

        yield f"data: {json.dumps({'type': 'done', 'id': str(chat_oid), 'title': title, 'sources': sources})}\n\n"

    except Exception:
        traceback.print_exc()
        yield f"data: {json.dumps({'type': 'error'})}\n\n"

def get_chat_history(
    id: str, 
    limit: int = 50, 
    before: Optional[datetime] = None
):
    try:
        if ObjectId.is_valid(id):
            query = {"_id": ObjectId(id)}
        else:
            query = {"id": id}

        if before is None:
            # First load → most recent chats
            result = summary_collection.find_one(
                query,
                {"queries": {"$slice": -limit}, "_id": 0}
            )
        else:
            # Scroll up → older chats before the given timestamp
            pipeline = [
                {"$match": query},
                {"$project": {
                    "queries": {
                        "$slice": [
                            {
                                "$filter": {
                                    "input": "$queries",
                                    "as": "chat",
                                    "cond": {"$lt": ["$$chat.created_at", before]}
                                }
                            },
                            -limit          # take the newest 'limit' among older chats
                        ]
                    }
                }}
            ]
            result_list = list(summary_collection.aggregate(pipeline))
            result = result_list[0] if result_list else None

        return result.get("queries", []) if result else []

    except Exception as e:
        print(f"Error fetching history: {e}")
        raise e
    
def get_chats_by_user(user_id: str):
    summaries = list(
        summary_collection.find(
            {"user_id": user_id},
            {"_id": 1, "title": 1, "timestamp": 1, "url": 1, "queries": 1, "type": 1, "thumbnail": 1,"is_pinned":1},
        )
    )
    result = []
    for summary in summaries:
        result.append({
            "id": str(summary["_id"]),
            "title": summary["title"],
            "timestamp": summary["timestamp"],
            "queries": len(summary.get("queries", [])),
            "is_pinned":summary["is_pinned"]
        })
    

    return result


async def delete_summary_by_id(chat_id: str, user_id: str):
    """Handles the database logic for deleting a chat summary."""
    try:
        result = summary_collection.delete_one({
            "_id": ObjectId(chat_id),
            "user_id": user_id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Chat not found or unauthorized")
            
        return {"status": "success", "message": "Chat deleted permanently"}
        
    except Exception as e:
        print(f"Delete Error: {e}")
        # Re-raise HTTPExceptions so they don't get swallowed as 500s
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Internal Server Error")


async def toggle_chat_pin(chat_id: str, user_id: str, is_pinned: bool):
    """Handles the database logic for pinning/unpinning a chat."""
    try:
        result = summary_collection.update_one(
            {
                "_id": ObjectId(chat_id),
                "user_id": user_id
            },
            {"$set": {"is_pinned": is_pinned}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Chat not found or unauthorized")
            
        return {"status": "success", "is_pinned": is_pinned}
        
    except Exception as e:
        print(f"Pin Error: {e}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Internal Server Error")