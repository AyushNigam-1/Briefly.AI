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

# Initialize memory using ConversationBufferMemory (or you can use BaseMemory if needed)
memory = ConversationBufferMemory()

# Define the prompt template
prompt_template = PromptTemplate(
    input_variables=["summary", "history", "user_query"],
    template="""
    Video Summary:
    {summary}

    Chat History:
    {history}

    User Query:
    {user_query}

    Response:
    """
)

def chat_with_summary(user_input: str, id: str):
    """
    Handles user queries using hybrid memory (static + dynamic).
    Combines a static summary with the chat history for a context-aware response.
    """
    try:
        # Retrieve the video summary from MongoDB
        summary_data = summary_collection.find_one({"_id": ObjectId(id)})
        if not summary_data:
            return "Could not find a summary associated with the given ID."
        

        summarized_summary = summary_data.get("summarized_summary", "")
        if not summarized_summary:
            return "The summary is empty or not available."
        print(summarized_summary)

        # Retrieve chat history from memory
        chat_history = memory.load_memory_variables({})
        print(chat_history)

        # Create a prompt with static and dynamic memory
        prompt = prompt_template.format(
            summary=summarized_summary,
            history=chat_history.get("history", ""),
            user_query=user_input
        )

        # Generate the response
        response = llm.invoke(prompt)
        print("response", response.content)
  
        # Update memory with the new interaction
        memory.save_context({"input": "User Query"}, {"output": user_input})
        memory.save_context({"input": "AI Response"}, {"output": response.content})

        # Update the database document to include the new query entries
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
        # Handle exceptions and log errors
        return f"An error occurred: {str(e)}"
