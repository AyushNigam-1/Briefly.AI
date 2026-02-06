from bson.objectid import ObjectId
from controllers.db.conn import summary_collection
import json
from agent.search_agent import get_agent


# ------------------------------------------------------------------
# Main chat handler
# ------------------------------------------------------------------

def chat_with_summary(user_input: str, id: str):
    try:
        summary_data = summary_collection.find_one({"_id": ObjectId(id)})
        if not summary_data:
            return {"res": "Summary not found"}

        summarized_summary = summary_data.get("summarized_summary", "")
        if not summarized_summary:
            return {"res": "Summary empty"}

        chat_history = summary_data.get("queries", [])

        history_text = "\n".join(
            f"{q.get('sender')}: {q.get('content')}"
            for q in chat_history
        ) if chat_history else "None"

        system_prompt = f"""
            You are chatting with a summarized video.

            Video Summary:
            {summarized_summary}

            Conversation History:
            {history_text}

            Rules:

            1. Always answer from the Video Summary first.
            2. Only use search if user asks for:
            - current events
            - real world facts
            - things missing from summary.
            3. Never hallucinate.
            4. Be direct and concise.
            """

        agent = get_agent()

        response = agent.invoke({
            "messages": [
                ("system", system_prompt),
                ("human", user_input),
            ]
        })

        response_text = response["messages"][-1].content
        resources = []
        for msg in response["messages"]:
            if msg.type == "tool":
                try:
                    parsed = json.loads(msg.content)
                    if isinstance(parsed, list):
                        resources.extend(parsed)
                except Exception:
                    pass

        summary_collection.update_one(
            {"_id": ObjectId(id)},
            {
                "$push": {
                    "queries": {
                        "$each": [
                            {"sender": "user", "content": user_input},
                            {
                                "sender": "llm",
                                "content": response_text,
                                "sources": resources,
                            },
                        ]
                    }
                }
            },
        )

        return {
            "res": response_text,
            "sources": resources,   # 🔥 HERE
        }

    except Exception as e:
        return {"res": str(e)}
