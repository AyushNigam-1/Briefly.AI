from bson import ObjectId
from datetime import datetime, timezone
from controllers.db.conn import summary_collection
from agent.search_agent import get_agent
from controllers.summary.file_summary import get_file_summary
import json

async def chat_with_summary(user_input: str, user: str, id=None, files=None):
    summary_data = None
    object_id = None
    is_new_chat = False

    # 1️⃣ Try loading existing conversation
    if id and ObjectId.is_valid(id):
        summary_data = summary_collection.find_one({
            "_id": ObjectId(id),
            "user_id": user,
        })

    # 2️⃣ Create new conversation if not found
    if not summary_data:
        is_new_chat = True
        summary_data = {
            "user_id": user,
            "queries": [],
            "timestamp": datetime.now(timezone.utc),
            "title": "New Chat",
            "thought": ""
        }
        insert_result = summary_collection.insert_one(summary_data)
        object_id = insert_result.inserted_id
    else:
        object_id = summary_data["_id"]

    file_context = ""
    uploaded_files = []

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

            uploaded_files.append({
                "name": file.filename,
                "type": file.content_type,
                "size": file.size,
                "url": "",
            })

            file_context += f"\nFile ({file.filename}):\n{result}\n"

    messages = [
        ("system", f"""
        You are a helpful AI assistant. Be concise. Never hallucinate.

        Uploaded file context:
        {file_context if file_context else "None"}
        """)
    ]

    for q in summary_data.get("queries", []):
        role = "human" if q.get("sender") == "user" else "assistant"
        content = q.get("content", "")
        if content:
            messages.append((role, content))

    messages.append(("human", user_input))

    agent = get_agent()
    response = agent.invoke({"messages": messages},return_intermediate_steps=True)
    assistant_text = response["messages"][-1].content
    sources = [] 
    for msg in response["messages"]: 
        if hasattr(msg, 'type') and msg.type == "tool": 
            try: # Handle tool output parsing safely
                content = msg.content 
                print("content",content)
                if isinstance(content, str):
                    parsed = json.loads(content)
                    if isinstance(parsed, list): 
                        sources.extend(parsed) 
            except Exception:
                pass

    title = None
    print(sources)
    if is_new_chat:
        title_prompt = f"""
            Create a short 3–5 word title for this conversation.

            User:
            {user_input}

            Assistant:
            {assistant_text}

            Return ONLY the title.
            """

        title_agent = get_agent()

        title_response = title_agent.invoke({
            "messages": [
                ("system", "You generate short conversation titles."),
                ("human", title_prompt),
            ]
        })

        title = title_response["messages"][-1].content.strip()

    update_payload = {
        "$push": {
            "queries": {
                "$each": [
                    {
                        "sender": "user",
                        "content": user_input,
                        "files": uploaded_files if uploaded_files else []
                    },
                    {
                        "sender": "llm",
                        "content": assistant_text,
                        "sources":sources
                    },
                ]
            }
        },
        "$set": {
            "timestamp": datetime.now(timezone.utc)
        }
    }

    if title:
        update_payload["$set"]["title"] = title

    summary_collection.update_one({"_id": object_id}, update_payload)

    return {
        "id": str(object_id),
        "res": assistant_text,
        "title": title,
        "sources":sources
    }
