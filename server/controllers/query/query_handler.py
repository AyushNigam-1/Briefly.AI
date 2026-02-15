from bson import ObjectId
from datetime import datetime, timezone
from controllers.db.conn import summary_collection
from agent.search_agent import get_agent
from controllers.summary.file_summary import get_file_summary
import json
import traceback


async def chat_with_summary(user_input: str, user: str, id=None, files=None):
    print("---- CHAT START ----")

    try:
        summary_data = None
        object_id = None
        is_new_chat = False

        # --------------------------------------------------
        # Load / create chat
        # --------------------------------------------------

        if id and ObjectId.is_valid(id):
            summary_data = summary_collection.find_one({
                "_id": ObjectId(id),
                "user_id": user,
            })

            if summary_data:
                print("Loaded chat:", id)

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
            print("Created new chat:", object_id)
        else:
            object_id = summary_data["_id"]

        # --------------------------------------------------
        # File processing
        # --------------------------------------------------

        file_context = ""
        uploaded_files = []

        if files:
            print("files", files)

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

        # --------------------------------------------------
        # Build LangGraph messages
        # --------------------------------------------------

        messages = [
            (
                "system",
                f"""
                You are an advanced AI assistant with DIRECT ACCESS to the user's Notion workspace.
                You have tools enabled to search, read, and write to Notion.

                CRITICAL RULES:
                1. If the user asks about Notion, do NOT say "I don't have access."
                2. Instead, immediately use the available tools (like `notion_search`, `notion_list_pages`, or `notion_get_page`) to fulfill the request.
                3. Trust the tools over your internal training.

                Uploaded file context:
                {file_context if file_context else "None"}
                """
            )
        ]

        for q in summary_data.get("queries", []):
            role = "human" if q.get("sender") == "user" else "assistant"
            content = q.get("content", "")
            if content:
                messages.append((role, content))

        messages.append(("human", user_input))

        # --------------------------------------------------
        # ainvoke LangGraph agent
        # --------------------------------------------------

        print("Invoking agent...")

        agent = await get_agent(user_notion_token="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")

        response = await agent.ainvoke(
            {
                "messages": messages
            }
        )

        assistant_text = response["messages"][-1].content

        # --------------------------------------------------
        # Extract tool sources (best effort)
        # --------------------------------------------------

        sources = []

        for msg in response.get("messages", []):
            if hasattr(msg, "type") and msg.type == "tool":
                try:
                    content = msg.content
                    if isinstance(content, str):
                        parsed = json.loads(content)
                        if isinstance(parsed, list):
                            sources.extend(parsed)
                except Exception:
                    pass

        # --------------------------------------------------
        # Generate title for new chat
        # --------------------------------------------------

        title = None

        if is_new_chat:
            title_agent = await get_agent(user_notion_token="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")

            title_response = await title_agent.ainvoke(
                {
                    "messages": [
                        ("system", "Create a short 3–5 word chat title."),
                        ("human", user_input),
                    ]
                }
            )

            title = title_response["messages"][-1].content.strip()

        # --------------------------------------------------
        # Persist to Mongo
        # --------------------------------------------------

        update_payload = {
            "$push": {
                "queries": {
                    "$each": [
                        {
                            "sender": "user",
                            "content": user_input,
                            "files": uploaded_files
                        },
                        {
                            "sender": "llm",
                            "content": assistant_text,
                            "sources": sources
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
            "sources": sources,
        }

    except Exception as e:
        print("🔥 CHAT FAILURE 🔥")
        traceback.print_exc()

        return {
            "res": "Internal error",
            "error": str(e),
        }
