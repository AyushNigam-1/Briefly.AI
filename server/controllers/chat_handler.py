from controllers.mongo import users_collection
from controllers.mongo import summary_collection
from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional
import os
import asyncio
from groq import Groq
from fastapi import HTTPException
from fastapi import Request 
from controllers.memory_handler import get_user_memories , get_memory_enabled
from agent.agent_graph import agent_graph
from fastapi import HTTPException
import traceback
import os
import json
from redis_client import redis_client
from groq import Groq
import hashlib
import time

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

def search_user_chats(user_id: str, search_term: str):
    """
    Searches across all chats for a user and returns the specific 
    sessions and exact messages that match the search term.
    """
    try:
        pipeline = [
            {"$match": {"user_id": user_id}},
            
            {"$project": {
                "_id": 1,
                "title": 1,
                "timestamp": 1,
                "matching_messages": {
                    "$filter": {
                        "input": "$queries",
                        "as": "msg",
                        "cond": {
                            "$regexMatch": {
                                # Use ifNull to prevent crashes if a message has no content
                                "input": {"$ifNull": ["$$msg.content", ""]}, 
                                "regex": search_term,
                                "options": "i" # 'i' makes it case-insensitive
                            }
                        }
                    }
                }
            }},
            
            # 3. Filter out any chats where no messages matched
            {"$match": {
                "matching_messages": {"$ne": []}
            }},
            
            # 4. Sort by newest chats first
            {"$sort": {"timestamp": -1}}
        ]

        cursor = summary_collection.aggregate(pipeline)
        
        results = []
        for doc in cursor:
            results.append({
                "id": str(doc["_id"]),
                "title": doc.get("title", "Untitled Chat"),
                "timestamp": doc.get("timestamp"),
                "messages": doc.get("matching_messages", [])
            })
            
        return results

    except Exception as e:
        print(f"Search Error: {e}")
        raise HTTPException(status_code=500, detail="Error searching chats")

def build_messages(chat, user_input, memory_context, user_id=None):
    messages = [
        (
            "system",
            f"""You are Briefly AI, an intelligent, helpful, and versatile AI assistant. 
            You provide clear, concise, and accurate answers.
            
            CURRENT USER ID: {user_id} 
                        
            {memory_context}
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

async def chat_stream(request: Request, user_input, user_id, chat_id=None, files=None, modal_name=None):
    print(files)
    chat_doc, chat_oid, is_new = get_or_create_chat(chat_id, user_id)

    existing_memories = get_user_memories(user_id)
    memory_context = ""
    
    if existing_memories and get_memory_enabled(user_id):
        memory_context = "Here is what you know about the user from past conversations:\n"
        for mem in existing_memories:
            memory_context += f"- {mem}\n"
            
    messages = build_messages(chat_doc, user_input, memory_context, user_id)

    user = users_collection.find_one({"_id": ObjectId(user_id)})
    app_tokens = user.get("app_tokens", {}) if user else {}

    available_apps = []
    if app_tokens.get("notion"): available_apps.append("notion")
    if app_tokens.get("google_drive"): available_apps.append("google_drive")
    if app_tokens.get("linear"): available_apps.append("linear")
    if app_tokens.get("slack"): available_apps.append("slack")
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
        "files": files
    }

    try:
        assistant_text = ""
        thinking_text = ""
        final_state = {}

        try:
            async for event in agent_graph.astream_events(initial_state, version="v2"):
                
                if await request.is_disconnected():
                    print("🚨 Client disconnected! Halting LangGraph.")
                    break 

                kind = event["event"]
                name = event.get("name","")

                if kind == "on_chain_start" and name == "file_processor":
                    if files:
                        msg = "📄 Analyzing attached files...\n"
                        thinking_text += msg
                        yield f"data: {json.dumps({'type': 'analyzing', 'data': msg})}\n\n"

                elif kind == "on_chain_end" and name == "file_processor":
                    if files:
                        msg = "✅ File extraction complete.\n\n"
                        thinking_text += msg
                        yield f"data: {json.dumps({'type': 'analyzing', 'data': msg})}\n\n"

                elif kind == "on_chat_model_stream":
                    chunk = event["data"]["chunk"]

                    if hasattr(chunk, "additional_kwargs"):
                        reasoning = chunk.additional_kwargs.get("reasoning_content")
                        if reasoning:
                            thinking_text += reasoning
                            yield f"data: {json.dumps({'type': 'thinking', 'data': reasoning})}\n\n"
                            await asyncio.sleep(0.01) 

                    if hasattr(chunk, "content") and chunk.content:
                        assistant_text += chunk.content
                        yield f"data: {json.dumps({'type': 'token', 'data': chunk.content})}\n\n"
                        await asyncio.sleep(0.03) 

                elif kind == "on_tool_start":
                    yield f"data: {json.dumps({'type': 'tool_status', 'tool': event['name'], 'status': 'running'})}\n\n"

                elif kind == "on_tool_end":
                    tool_name = event['name']
                    yield f"data: {json.dumps({'type': 'tool_status', 'tool': event['name'], 'status': 'completed'})}\n\n"
                    if tool_name == "n8n_create_workflow":
                        try:
                            msg = event['data'].get('output')
                            if msg and hasattr(msg, 'content'):
                                raw_text = msg.content[0].get("text", "{}") if isinstance(msg.content, list) else msg.content
                                data = json.loads(raw_text).get("data", {})                            
                                if wf_id := data.get("id"):
                                    users_collection.update_one(
                                        {"_id": ObjectId(user_id)},
                                        {"$push": {"n8n_workflows": {"id": wf_id, "name": data.get("name", "AI Automation")}}}
                                    )
                                    print(f"✅ GUARANTEED SAVE: Workflow {wf_id} saved!")
                                    try:
                                        redis_client.delete(f"user_workflows:{user_id}")
                                    except Exception as e:
                                        print(f"⚠️ Redis cache clear failed: {e}")
                        except Exception as e:
                            print(f"⚠️ Auto-save failed: {e}")
                
                elif kind == "on_chain_end":
                    output = event["data"]["output"]
                    if isinstance(output, dict):
                        final_state.update(output)
                        
        except asyncio.CancelledError:
            print("🚨 Stream forcefully cancelled by client (CancelledError). Proceeding to save.")

        if not final_state:
            final_state = {}

        uploaded_files = final_state.get("uploaded_files", [])
        sources = final_state.get("sources", [])
        title = final_state.get("title")

        if not thinking_text.strip():
            thinking_text = None

        print(f"💾 Saving chat turn. AI words generated: {len(assistant_text.split())}")

        save_chat_turn(
            chat_id=chat_oid,
            user_input=user_input,
            assistant_text=assistant_text,
            files=uploaded_files,
            sources=sources,
            title=title,
            thinking_text=thinking_text
        )

        if not await request.is_disconnected():
            yield f"data: {json.dumps({'type': 'done', 'id': str(chat_oid), 'title': title, 'sources': sources})}\n\n"

    except Exception:
        traceback.print_exc()
        if not await request.is_disconnected():
            yield f"data: {json.dumps({'type': 'error'})}\n\n"

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
                            -limit         
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
    
def get_chats_by_user(user_id: str, skip: int = 0, limit: int = 10):

    summaries = list(
        summary_collection.find(
            {"user_id": user_id},
            {"_id": 1, "title": 1, "timestamp": 1, "queries": 1, "is_pinned": 1},
        )
        .sort([("is_pinned", -1), ("timestamp", -1)])
        .skip(skip)
        .limit(limit)
    )
    
    result = []
    for summary in summaries:
        result.append({
            "id": str(summary["_id"]),
            "title": summary.get("title", "Untitled Chat"),
            "timestamp": summary.get("timestamp"),
            "queries": len(summary.get("queries", [])),
            "is_pinned": summary.get("is_pinned", False)
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

def get_cache_key(text: str, voice: str):
    raw = f"{voice}:{text}".encode()
    return "tts:" + hashlib.sha256(raw).hexdigest()


def generate_audio_from_text(text: str, voice: str = "troy") -> bytes:
    """
    Generates audio from text using Groq TTS.
    Uses Redis caching to avoid regenerating audio.
    """

    cache_key = get_cache_key(text, voice)

    try:
        # 1️⃣ Check Redis cache
        cached_audio = redis_client.get(cache_key)

        if cached_audio:
            return cached_audio

        response = client.audio.speech.create(
            model="canopylabs/orpheus-v1-english",
            voice=voice,
            input=text,
            response_format="wav"
        )

        audio_bytes = response.read()
        redis_client.setex(cache_key, 86400, audio_bytes)

        return audio_bytes

    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=f"Groq API Error: {str(e)}")

async def regenerate_chat_stream(request:Request, chat_id: str, user_id: str, target_index: int, modal_name: Optional[str] = None):
    try:
        if not ObjectId.is_valid(chat_id):
            yield f"data: {json.dumps({'type': 'error', 'message': 'Invalid chat ID'})}\n\n"
            return
            
        chat = summary_collection.find_one({"_id": ObjectId(chat_id), "user_id": user_id})
        
        if not chat or not chat.get("queries"):
            yield f"data: {json.dumps({'type': 'error', 'message': 'Chat not found or is empty'})}\n\n"
            return

        queries = chat["queries"]

        user_msg_index = target_index - 1

        if target_index >= len(queries) or user_msg_index < 0:
            yield f"data: {json.dumps({'type': 'error', 'message': 'Invalid index'})}\n\n"
            return

        last_user_query = queries[user_msg_index]

        if last_user_query.get("sender") != "user":
            yield f"data: {json.dumps({'type': 'error', 'message': 'Target is not a user message'})}\n\n"
            return

        truncated_queries = queries[:user_msg_index]

        summary_collection.update_one(
            {"_id": ObjectId(chat_id), "user_id": user_id},
            {"$set": {"queries": truncated_queries}}
        )

        user_input = last_user_query.get("content", "")
        files = last_user_query.get("files", []) 

        async for event in chat_stream(
            request=request,
            user_input=user_input,
            user_id=user_id,
            chat_id=chat_id,
            files=files,
            modal_name=modal_name
        ):
            yield event

    except Exception as e:
        import traceback
        traceback.print_exc()
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

async def edit_chat_stream(request:Request, chat_id: str, user_id: str, target_index: int, new_content: str, modal_name: Optional[str] = None):
    try:
        chat = summary_collection.find_one({"_id": ObjectId(chat_id), "user_id": user_id})
        
        if not chat or "queries" not in chat:
            yield f"data: {json.dumps({'type': 'error', 'message': 'Chat not found'})}\n\n"
            return

        queries = chat["queries"]

        if target_index >= len(queries) or target_index < 0:
            yield f"data: {json.dumps({'type': 'error', 'message': 'Invalid index'})}\n\n"
            return
            
        if queries[target_index]["sender"] != "user":
            yield f"data: {json.dumps({'type': 'error', 'message': 'Target index is not a user message'})}\n\n"
            return

        old_files = queries[target_index].get("files", [])
        truncated_queries = queries[:target_index]

        summary_collection.update_one(
            {"_id": ObjectId(chat_id), "user_id": user_id},
            {"$set": {"queries": truncated_queries}}
        )

        async for event in chat_stream(
            request=request,
            user_input=new_content, 
            user_id=user_id,
            chat_id=chat_id,
            files=old_files, 
            modal_name=modal_name
        ):
            yield event

    except Exception as e:
        import traceback
        traceback.print_exc()
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

# 🌟 FIX: Added `request` to the parameters here
async def private_chat_stream(request, user_input, files=None, modal_name=None, chat_history=None):
    """
    Streams a truly stateless chat response.
    No database tracking, no personal tool access (Notion, Drive, etc.).
    """
    
    mock_chat_doc = {"queries": chat_history if chat_history else []}
    
    messages = build_messages(
        chat=mock_chat_doc, 
        user_input=user_input, 
        memory_context="", 
        user_id="guest"
    )

    initial_state = {
        "messages": messages,
        "modal_name": modal_name,
        "available_apps": ["n8n"], 
        "selected_apps": [],
        "blocked": False,
        "is_new_chat": False, 
        "user_input": user_input,
        "user_id": "guest",
        "files": files
    }

    thinking_text = "" 

    try:
        final_state = {}

        async for event in agent_graph.astream_events(initial_state, version="v2"):
            # 🌟 NEW: Listen for client disconnects to cancel the stream early if they close the tab
            if await request.is_disconnected():
                print("Client disconnected. Aborting stream.")
                break

            kind = event["event"]
            name = event.get("name","")

            if kind == "on_chain_start" and name == "file_processor":
                if files:
                    msg = "📄 Analyzing attached files...\n"
                    thinking_text += msg
                    yield f"data: {json.dumps({'type': 'analyzing', 'data': msg})}\n\n"

            elif kind == "on_chain_end" and name == "file_processor":
                if files:
                    msg = "✅ File extraction complete.\n\n"
                    thinking_text += msg
                    yield f"data: {json.dumps({'type': 'analyzing', 'data': msg})}\n\n"

            elif kind == "on_chat_model_stream":
                chunk = event["data"]["chunk"]

                if hasattr(chunk, "additional_kwargs"):
                    reasoning = chunk.additional_kwargs.get("reasoning_content")
                    if reasoning:
                        yield f"data: {json.dumps({'type': 'thinking', 'data': reasoning})}\n\n"

                if hasattr(chunk, "content") and chunk.content:
                    yield f"data: {json.dumps({'type': 'token', 'data': chunk.content})}\n\n"

            elif kind == "on_tool_start":
                yield f"data: {json.dumps({'type': 'tool_status', 'tool': event['name'], 'status': 'running'})}\n\n"

            elif kind == "on_tool_end":
                yield f"data: {json.dumps({'type': 'tool_status', 'tool': event['name'], 'status': 'completed'})}\n\n"

            elif kind == "on_chain_end":
                output = event["data"]["output"]
                if isinstance(output, dict):
                    final_state.update(output)

        sources = final_state.get("sources", [])
        
        yield f"data: {json.dumps({'type': 'done', 'id': 'private', 'sources': sources})}\n\n"

    except Exception as e:
        import traceback
        traceback.print_exc()
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"