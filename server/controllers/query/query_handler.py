from bson import ObjectId
from datetime import datetime, timezone
import json
from controllers.db.conn import summary_collection
from agent.search_agent import get_agent 

def chat_with_summary(user_input: str, id: str = None):
    try:
        summary_data = None
        object_id = None

        # Validate frontend id
        if id and ObjectId.is_valid(id):
            object_id = ObjectId(id)
            summary_data = summary_collection.find_one({"_id": object_id})

        # If not found -> create NEW using frontend id
        if not summary_data:

            # If frontend didn't send id, generate one
            if not object_id:
                object_id = ObjectId()

            summary_data = {
                "_id": object_id,          # 👈 IMPORTANT
                "user_id": "",
                "thumbnail": "",
                "url": "",
                "type": "General Chat",
                "thought": "",
                "original_summary": "",
                "summarized_summary": "",
                "queries": [],
                "timestamp": datetime.now(timezone.utc),
                "title": "New Chat",
            }

            summary_collection.insert_one(summary_data)

        id = str(object_id)

        # History
        chat_history = summary_data.get("queries", [])

        history_text = "\n".join(
            f"{q.get('sender')}: {q.get('content')}"
            for q in chat_history
        ) if chat_history else "None"

        current_summary = summary_data.get("summarized_summary", "")

        system_prompt = f"""
You are chatting.

Context:
{current_summary or "No summary."}

History:
{history_text}

Rules:
- Be concise
- Never hallucinate
"""

        agent = get_agent()

        response = agent.invoke({
            "messages": [
                ("system", system_prompt),
                ("human", user_input),
            ]
        })

        response_text = response["messages"][-1].content

        summary_collection.update_one(
            {"_id": object_id},
            {
                "$push": {
                    "queries": {
                        "$each": [
                            {"sender": "user", "content": user_input},
                            {"sender": "llm", "content": response_text},
                        ]
                    }
                }
            },
        )

        return {
            "id": id,
            "res": response_text,
        }

    except Exception as e:
        print(e)
        return {"res": "Error", "error": str(e)}
