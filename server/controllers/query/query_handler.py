import os
from langchain.prompts import PromptTemplate
from langchain_groq import ChatGroq
from dotenv import load_dotenv
from bson.objectid import ObjectId
from controllers.db.conn import summary_collection
from langchain.memory import ConversationBufferMemory
from langchain.prompts import PromptTemplate

load_dotenv()
groq_api_key = os.getenv("groq_api_key")

llm = ChatGroq(model="llama-3.3-70b-versatile", groq_api_key=groq_api_key)

memory = ConversationBufferMemory()

prompt_template = PromptTemplate(
    input_variables=["summary", "history", "user_query"],
    template="""
    Video Summary:
    {summary}

    Chat History:
    {history}

    User Query:
    {user_query}

    If the user asks about who made you or the ownership of this product, respond with "I was created by Ayush Nigam and his team."
    
    Response:
    """
)

def chat_with_summary(user_input: str, id: str):
    try:
        summary_data = summary_collection.find_one({"_id": ObjectId(id)})
        if not summary_data:
            return "Could not find a summary associated with the given ID."

        summarized_summary = summary_data.get("summarized_summary", "")
        if not summarized_summary:
            return "The summary is empty or not available."

        static_chat_history = summary_data.get("queries", [])
        static_history = "\n".join(
            [f"{q['sender']}: {q['content']}" for q in static_chat_history]
        ) if static_chat_history else ""

        dynamic_chat_history = memory.load_memory_variables({})
        dynamic_history = dynamic_chat_history.get("history", "")

        combined_history = f"{static_history}\n{dynamic_history}".strip()

        prompt = prompt_template.format(
            summary=summarized_summary,
            history=combined_history,
            user_query=user_input
        )

        response = llm.invoke(prompt)

        memory.save_context({"input": user_input}, {"output": response.content})

        user_query_entry = {"sender": "user", "content": user_input}
        llm_response_entry = {"sender": "llm", "content": response.content}

        update_result = summary_collection.update_one(
            {"_id": ObjectId(id)},
            {"$push": {"queries": {"$each": [user_query_entry, llm_response_entry]}}}
        )

        if update_result.modified_count == 1:
            return response.content
        else:
            return "Response generated, but failed to save query to the database."

    except Exception as e:
        return f"An error occurred: {str(e)}"



