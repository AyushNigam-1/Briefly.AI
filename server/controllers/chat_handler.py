from bson import ObjectId
from datetime import datetime, timezone
from controllers.mongo import summary_collection
from agent.agent_factory import  run_agent , generate_chat_title , extract_sources , extract_memory
from controllers.memory_handler import get_user_memories, save_user_memories
from controllers.file_handler import process_files
import traceback

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

async def chat(user_input: str, user_id: str, chat_id=None, files=None):
    try:
        chat_doc, chat_oid, is_new = get_or_create_chat(chat_id, user_id)

        file_context, uploaded_files = await process_files(files, user_id)

        messages = build_messages(chat_doc, user_input, file_context)

        assistant_text, raw_msgs = await run_agent(messages)

        sources = extract_sources(raw_msgs)

        try:
            existing = get_user_memories(user_id)
            new_memories = await extract_memory(user_input, assistant_text, existing)
            save_user_memories(user_id, new_memories)
        except:
            pass
    
        title = None
        if is_new:
            title = await generate_chat_title(user_input)

        save_chat_turn(chat_oid, user_input, assistant_text, uploaded_files, sources, title)

        return {
            "id": str(chat_oid),
            "res": assistant_text,
            "title": title,
            "sources": sources,
        }

    except Exception as e:
        traceback.print_exc()
        return {"res": "Internal error", "error": str(e)}

def get_last_50_chats(id: str):
    try:
        # Check if the provided ID is a valid MongoDB ObjectId
        if ObjectId.is_valid(id):
            query = {"_id": ObjectId(id)}
        else:
            query = {"id": id}  # Fallback for custom string IDs

        # Projection: 
        # 1. Exclude _id ("_id": 0) if you don't want to return it
        # 2. Slice 'chat_history' to get the last 50 elements ("$slice": -50)
        # Note: Replace 'chat_history' with the actual name of your array field in MongoDB
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