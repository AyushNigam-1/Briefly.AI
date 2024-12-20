import os
from langchain.prompts import PromptTemplate
from langchain.chains.question_answering import load_qa_chain
from langchain.schema import Document
from langchain_groq import ChatGroq
from dotenv import load_dotenv
from controllers.query.embeddings import generate_embedding
from controllers.query.pinecone_db import query_embeddings
from bson.objectid import ObjectId
from controllers.db.conn import summary_collection

load_dotenv()
groq_api_key = os.getenv("groq_api_key")

llm = ChatGroq(model="llama-3.3-70b-versatile", groq_api_key=groq_api_key)

prompt_template = """
You are an expert AI assistant. Based on the following summarized information and user query, provide a concise, human-like response without headings or unnecessary structure:

: {query}
Summarized Information: {context}

Keep the response natural, to the point, and conversational.
"""

prompt = PromptTemplate(
    template=prompt_template,
    input_variables=["query", "context"]
)

def chat_with_summary(user_input: str, id: str):
    """
    Retrieves the summarized summary from MongoDB for a given ID and combines it with the user's input
    to generate a detailed response using the LLM. The user query and AI response are saved to the query array in MongoDB.
    """
    summary_data = summary_collection.find_one({"_id": ObjectId(id)})
    if not summary_data:
        return "Could not find a summary associated with the given ID."

    summarized_summary = summary_data.get("summarized_summary", "")
    if not summarized_summary:
        return "The summary is empty or not available."

    docs = [Document(page_content=summarized_summary)]
    qa_chain = load_qa_chain(llm, chain_type="stuff", prompt=prompt)
    input_data = {"input_documents": docs, "query": user_input}

    response = qa_chain.run(input_data)

    user_query_entry = {"sender": "user", "content": user_input}
    llm_response_entry = {"sender": "llm", "content": response}

    # Update the database document to include the new query entries
    update_result = summary_collection.update_one(
        {"_id": ObjectId(id)},
        {"$push": {"queries": {"$each": [user_query_entry, llm_response_entry]}}}
    )

    if update_result.modified_count == 1:
        return response
    else:
        return "Response generated, but failed to save query to the database."
