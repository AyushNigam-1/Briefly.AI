from bson import ObjectId
from datetime import datetime, timezone
from controllers.mongo import summary_collection
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
from agent.agent_factory import  run_agent , generate_chat_title , extract_sources , extract_memory , stream_agent
from controllers.memory_handler import get_user_memories, save_user_memories
from controllers.file_handler import process_files
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
    print("score",score)
    THRESHOLD = 0.1

    is_safe = score < THRESHOLD
    print(is_safe,"issafe")
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
        "thought": ""
    }

    res = summary_collection.insert_one(doc)
    doc["_id"] = res.inserted_id
    return doc, res.inserted_id, True


def build_messages(chat, user_input, file_context):
    messages = [
        (
            "system",
            f"""
                You are an advanced AI assistant.

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
    payload = {
        "$push": {
            "queries": {
                "$each": [
                    {"sender": "user", "content": user_input, "files": files},
                    {"sender": "llm", "content": assistant_text, "sources": sources},
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

    safe_input, _ = await run_guard(user_input)
    if not safe_input:
        yield json.dumps({"type": "blocked"}) + "\n"
        return

    messages = build_messages(chat_doc, user_input, file_context)

    assistant_text = ""

    try:
        async for chunk in stream_agent(messages):
            assistant_text += chunk
            yield json.dumps({"type": "token", "data": chunk}) + "\n"

        # post moderation
        safe_output, _ = await run_guard(assistant_text)
        if not safe_output:
            yield json.dumps({"type": "blocked"}) + "\n"
            return

        sources = []
        title = None
        if is_new:
            title = await generate_chat_title(user_input)

        save_chat_turn(chat_oid, user_input, assistant_text, uploaded_files, sources, title)

        yield json.dumps({
            "type": "done",
            "id": str(chat_oid),
            "title": title,
            "sources": sources
        }) + "\n"

    except Exception:
        traceback.print_exc()
        yield json.dumps({"type": "error"}) + "\n"

async def chat_stream(user_input, user_id, chat_id=None, files=None, modal_name=None):
    chat_doc, chat_oid, is_new = get_or_create_chat(chat_id, user_id)
    file_context, uploaded_files = await process_files(files, user_id)

    safe_input = await run_guard(user_input)
    if not safe_input:
        # ⚠️ FIX: Add 'data: ' prefix and '\n\n' suffix
        yield f"data: {json.dumps({'type': 'blocked'})}\n\n"
        return

    messages = build_messages(chat_doc, user_input, file_context)
    assistant_text = ""

    try:
        async for chunk in stream_agent(messages):
            assistant_text += chunk
            # ⚠️ FIX: Add 'data: ' prefix and '\n\n' suffix
            yield f"data: {json.dumps({'type': 'token', 'data': chunk})}\n\n"

        sources = []
        title = None
        if is_new:
            title = await generate_chat_title(user_input)

        save_chat_turn(chat_oid, user_input, assistant_text, uploaded_files, sources, title)

        # ⚠️ FIX: Add 'data: ' prefix and '\n\n' suffix
        yield f"data: {json.dumps({'type': 'done', 'id': str(chat_oid), 'title': title, 'sources': sources})}\n\n"

    except Exception:
        import traceback
        traceback.print_exc()
        # ⚠️ FIX: Add 'data: ' prefix and '\n\n' suffix
        yield f"data: {json.dumps({'type': 'error'})}\n\n"

def get_last_50_chats(id: str):
    try:
        if ObjectId.is_valid(id):
            query = {"_id": ObjectId(id)}
        else:
            query = {"id": id}  # Fallback for custom string IDs

        result = summary_collection.find_one(
            query,
            {"queries": {"$slice": -50}, "_id": 0} 
        )

        if result:
            return result["queries"]
        
        return []

    except Exception as e:
        print(f"Error fetching history: {e}")
        raise e
    
def get_chats_by_user(user_id: str):
    print(user_id)
    summaries = list(
        summary_collection.find(
            {"user_id": user_id},
            {"_id": 1, "title": 1, "timestamp": 1, "url": 1, "queries": 1, "type": 1, "thumbnail": 1},
        )
    )
    result = []
    for summary in summaries:
        result.append({
            "id": str(summary["_id"]),
            "title": summary["title"],
            "timestamp": summary["timestamp"],
            "queries": len(summary.get("queries", [])),
        })
    

    return result