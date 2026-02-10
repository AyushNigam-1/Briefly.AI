from bson import ObjectId
from datetime import datetime, timezone
from controllers.db.conn import summary_collection
from agent.search_agent import get_agent

def chat_with_summary(user_input: str, user: str, id: str | None):

    summary_data = None
    object_id = None

    # 1️⃣ Try loading existing conversation
    if id:
        try:
            object_id = ObjectId(id)
            summary_data = summary_collection.find_one({
                "_id": object_id,
                "user_id": user,   # IMPORTANT: ownership check
            })
        except:
            summary_data = None

    # 2️⃣ Create new conversation if not found
    if not summary_data:
        object_id = ObjectId()
        summary_data = {
            "_id": object_id,
            "user_id": user,
            "queries": [],
            "timestamp": datetime.now(timezone.utc),
        }
        summary_collection.insert_one(summary_data)

    # 3️⃣ Build conversation history
    messages = [
        ("system", "Be concise. Never hallucinate.")
    ]

    for q in summary_data.get("queries", []):
        role = "human" if q["sender"] == "user" else "assistant"
        messages.append((role, q["content"]))

    # 4️⃣ Add current user message
    messages.append(("human", user_input))

    # 5️⃣ Call agent with FULL context
    agent = get_agent()
    response = agent.invoke({"messages": messages})
    assistant_text = response["messages"][-1].content

    # 6️⃣ Persist messages
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
            }
        },
    )

    # 7️⃣ Return stable conversation ID
    return {
        "id": str(object_id),
        "res": assistant_text,
    }
