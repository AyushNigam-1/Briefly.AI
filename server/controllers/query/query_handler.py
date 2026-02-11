from bson import ObjectId
from datetime import datetime, timezone
from controllers.db.conn import summary_collection
from agent.search_agent import get_agent
from controllers.summary.file_summary import get_file_summary

async def chat_with_summary(user_input: str, user: str, id=None, files=None):
    summary_data = None
    object_id = None

    # 1️⃣ Try loading existing conversation (Only if ID is valid)
    if id and ObjectId.is_valid(id):
        summary_data = summary_collection.find_one({
            "_id": ObjectId(id),
            "user_id": user,   # Ownership check
        })

    # 2️⃣ Create new conversation if not found (or ID was invalid/None)
    if not summary_data:
        summary_data = {
            "user_id": user,
            "queries": [],
            "timestamp": datetime.now(timezone.utc),
            "title": "New Chat",
            "thumbnail": "",
            "url": "",
            "type": "General Chat",
            "original_summary": "",
            "summarized_summary": "",
            "thought": ""
        }
        # Insert immediately to get the generated _id
        insert_result = summary_collection.insert_one(summary_data)
        object_id = insert_result.inserted_id
    else:
        object_id = summary_data["_id"]

    
    file_context = ""

    if files:
        for file in files:
            result = await get_file_summary(
                url="",
                file=file,
                lang="en",
                format="",
                title=file.filename,
                current_user={"user_id": user},
            )

            file_context += f"\nFile ({file.filename}):\n{result['summary']}\n"

    messages = [
    ("system", f"""
    You are a helpful AI assistant. Be concise. Never hallucinate.

    Uploaded file context:
    {file_context if file_context else "None"}
    """)
    ]
    # Add existing history (safely handle missing keys)
    for q in summary_data.get("queries", []):
        role = "human" if q.get("sender") == "user" else "assistant"
        content = q.get("content", "")
        if content:
            messages.append((role, content))

    # 4️⃣ Add current user message
    messages.append(("human", user_input))

    # 5️⃣ Call agent
    agent = get_agent()
    response = agent.invoke({"messages": messages})
    assistant_text = response["messages"][-1].content

    # 6️⃣ Persist messages & Update Timestamp
    summary_collection.update_one(
        {"_id": object_id},
        {
            "$push": {
                "queries": {
                    "$each": [
                        {"sender": "user", "content": user_input},
                        {"sender": "llm", "content": assistant_text},
                    ]
                }
            },
            # Update timestamp so it moves to the top of the list
            "$set": {"timestamp": datetime.now(timezone.utc)}
        },
    )

    # 7️⃣ Return data
    return {
        "id": str(object_id),
        "res": assistant_text,
    }