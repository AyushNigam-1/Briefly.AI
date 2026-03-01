from bson import ObjectId
from datetime import datetime, timezone
from controllers.mongo import summary_collection
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
from typing import Optional

from agent.agent_factory import  run_agent , generate_chat_title , extract_sources , extract_memory , stream_agent , route_tools
from controllers.memory_handler import get_user_memories, save_user_memories
from controllers.file_handler import process_files
from fastapi import HTTPException
import traceback
import os
import json
from groq import Groq

client = Groq(api_key=os.getenv("groq_api_key"))

GUARD_MODEL = "meta-llama/llama-prompt-guard-2-86m"

async def run_guard(text: str):
    res = client.chat.completions.create(
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


def save_chat_turn(chat_id, user_input, assistant_text, files, sources, title=None):
    now = datetime.now(timezone.utc)

    payload = {
        "$push": {
            "queries": {
                "$each": [
                    {"sender": "user", "content": user_input, "files": files ,"created_at": now},
                    {"sender": "llm", "content": assistant_text, "sources": sources,"created_at": now},
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

    safe_input = await run_guard(user_input)
    if not safe_input:
        yield f"data: {json.dumps({'type': 'blocked'})}\n\n"
        return

    messages = build_messages(chat_doc, user_input, file_context)
    assistant_text = ""

    try:
        # 1. Fetch the user's connected app tokens from MongoDB
        from controllers.mongo import users_collection # Adjust import path as needed
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        app_tokens = user.get("app_tokens", {}) if user else {}

        notion_token = app_tokens.get("notion")
        gdrive_token = app_tokens.get("google_drive")
        linear_token = app_tokens.get("linear")
        slack_token = app_tokens.get("slack")
        n8n_connected = True # Assuming n8n is always available, or toggle this

        available_apps = []
        if notion_token: available_apps.append("notion")
        if gdrive_token: available_apps.append("google_drive")
        if linear_token: available_apps.append("linear")
        if slack_token: available_apps.append("slack")
        if n8n_connected: available_apps.append("n8n")

        # 3. Call the Router to see what we actually need
        needed_apps = await route_tools(user_input, available_apps)
        print(f"🚦 Router decided we need: {needed_apps}",linear_token)

        # 4. Stream the agent with ONLY the required apps enabled
        async for chunk in stream_agent(
            messages,
            modal_name=modal_name,
            notion_token=notion_token, enable_notion="notion" in needed_apps,
            gdrive_token=gdrive_token, enable_gdrive="google_drive" in needed_apps,
            linear_token=linear_token, enable_linear="linear" in needed_apps,
            slack_token=slack_token, enable_slack="slack" in needed_apps,
            enable_n8n="n8n" in needed_apps
        ):
            assistant_text += chunk
            yield f"data: {json.dumps({'type': 'token', 'data': chunk})}\n\n"

        # 5. Save the chat
        sources = []
        title = None
        if is_new:
            title = await generate_chat_title(user_input)

        save_chat_turn(chat_oid, user_input, assistant_text, uploaded_files, sources, title)

        yield f"data: {json.dumps({'type': 'done', 'id': str(chat_oid), 'title': title, 'sources': sources})}\n\n"

    except Exception:
        import traceback
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