import json
import logging
import uuid
import traceback

from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm
from livekit.agents import Agent, AgentSession
from livekit.agents.llm import ChatChunk, ChoiceDelta
from livekit.plugins import silero, deepgram

from agent.agent_graph import agent_graph
from controllers.chat_handler import get_or_create_chat, save_chat_turn
from controllers.mongo import summary_collection

logging.getLogger("pymongo").setLevel(logging.WARNING)


async def entrypoint(ctx: JobContext):
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    participant = await ctx.wait_for_participant()

    user_id = str(participant.identity)

    try:
        metadata = json.loads(participant.metadata or "{}")
    except Exception:
        metadata = {}

    session_state = {
        "chat_id": metadata.get("chat_id")
    }

    def build_langgraph_messages_from_mongo(chat_doc):
        """
        Convert Mongo chat_doc["queries"] to LangGraph messages:
        - user sender => ("human", content)
        - llm sender  => ("ai", content)
        """
        messages = []
        for q in chat_doc.get("queries", []):
            sender = q.get("sender")
            content = q.get("content", "")
            if sender == "user":
                messages.append(("human", str(content)))
            elif sender == "llm":
                messages.append(("ai", str(content)))
        return messages

    class LangGraphLLMStream(llm.LLMStream):
        def __init__(self, *, llm_instance, chat_ctx, tools, conn_options, room):
            super().__init__(
                llm=llm_instance,
                chat_ctx=chat_ctx,
                tools=tools,
                conn_options=conn_options,
            )
            self.room = room
            self._generator = self._run()

        async def _run(self):
            # The voice session may only have current transcript; we still need Mongo history.
            # We'll extract ONLY the current user_input from chat_ctx,
            # and use Mongo for the rest of conversation.
            livekit_messages = self.chat_ctx.messages()  # must be called

            # Current user utterance = last user message in THIS voice session
            current_user_text = ""
            for msg in livekit_messages:
                if msg.role == "user":
                    content = msg.content[0] if isinstance(msg.content, list) else msg.content
                    current_user_text = str(content)

            # Track/restore chat id
            current_chat_id = session_state.get("chat_id")
            chat_doc, chat_oid, is_new = get_or_create_chat(current_chat_id, user_id)

            # Ensure session_state is set for subsequent turns
            if not current_chat_id:
                session_state["chat_id"] = str(chat_oid)

            # Reload latest chat document from Mongo (so we get all history reliably)
            # (get_or_create_chat returns doc, but we want the full latest state)
            mongo_chat = summary_collection.find_one(
                {"_id": chat_oid, "user_id": user_id}
            )

            if not mongo_chat:
                # Fallback: use what we got from get_or_create_chat
                mongo_chat = chat_doc

            # Build conversation context from Mongo history
            messages = build_langgraph_messages_from_mongo(mongo_chat)

            # Append current user input as last message if it's not already the last entry
            # (Prevents occasional duplication if chat_ctx captured it earlier than expected.)
            if current_user_text:
                if not messages or messages[-1][0] != "human" or messages[-1][1] != current_user_text:
                    messages.append(("human", current_user_text))

            user_input = current_user_text

            initial_state = {
                "messages": messages,
                "modal_name": "llama-3.1-8b-instant",
                "available_apps": [],
                "selected_apps": [],
                "user_input": user_input,
                "user_id": user_id,
                "chat_id": str(chat_oid),
                "is_new_chat": is_new,
            }

            try:
                final_state = await agent_graph.ainvoke(initial_state)

                response_text = final_state.get("response", "Sorry, I couldn't process that.")
                sources = final_state.get("sources", [])
                title = final_state.get("title")

                # Save to Mongo (your controller does the DB push)
                save_chat_turn(
                    chat_id=chat_oid,
                    user_input=user_input,
                    assistant_text=response_text,
                    files=[],
                    sources=sources,
                    title=title,
                    thinking_text=None
                )
                print(f"✅ Saved voice turn to DB. Chat ID: {chat_oid}")

                # Broadcast new_chat title to React
                if is_new and title:
                    event_payload = json.dumps({
                        "type": "new_chat",
                        "id": str(chat_oid),
                        "title": title
                    })
                    await self.room.local_participant.publish_data(
                        event_payload.encode("utf-8"),
                        topic="chat_events"
                    )

                yield ChatChunk(
                    id=str(uuid.uuid4()),
                    delta=ChoiceDelta(role="assistant", content=response_text)
                )

            except Exception:
                traceback.print_exc()
                yield ChatChunk(
                    id=str(uuid.uuid4()),
                    delta=ChoiceDelta(role="assistant", content="I had a slight issue processing that.")
                )

        async def __anext__(self):
            return await self._generator.__anext__()

        async def aclose(self):
            pass

    class LangGraphLLM(llm.LLM):
        def __init__(self, room):
            super().__init__()
            self.room = room

        def chat(self, *, chat_ctx, tools=[], conn_options=None, **kwargs):
            return LangGraphLLMStream(
                llm_instance=self,
                chat_ctx=chat_ctx,
                tools=tools,
                conn_options=conn_options,
                room=self.room
            )

    session = AgentSession(
        vad=silero.VAD.load(),
        stt=deepgram.STT(),
        llm=LangGraphLLM(room=ctx.room),
        tts=deepgram.TTS(model="aura-2-odysseus-en"),
    )

    await session.start(
        room=ctx.room,
        agent=Agent(instructions="You are a helpful voice assistant."),
    )
    await session.say(
        "I am connected and ready. What's up?",
        allow_interruptions=True,
    )


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))