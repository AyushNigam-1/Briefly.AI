import os
from langchain.prompts import PromptTemplate
from langchain.chains.question_answering import load_qa_chain
from langchain.schema import Document
from langchain_groq import ChatGroq
from dotenv import load_dotenv
from controllers.query.embeddings import generate_embedding
from controllers.query.pinecone_db import query_embeddings

load_dotenv()
groq_api_key = os.getenv("groq_api_key")

llm = ChatGroq(model="Gemma-7b-It", groq_api_key=groq_api_key)

prompt_template = """
You are an expert AI assistant. Based on the following information retrieved from similarity search, provide a detailed, well-structured, and natural language response to the user query: 

Query: {query}
Relevant Information: {context}

Ensure your response is clear, informative, and concise.
"""

prompt = PromptTemplate(
    template=prompt_template,
    input_variables=["query", "context"]
)

def chat_with_summary(user_input: str):
    query_vector = generate_embedding(user_input)

    results = query_embeddings(query_vector)

    if not results['matches']:
        return "I couldn't find anything relevant. Try asking something else."

    docs = [Document(page_content=match.get('metadata', {}).get('text', '')) for match in results['matches']]

    qa_chain = load_qa_chain(llm, chain_type="stuff", prompt=prompt)

    input_data = {"input_documents": docs, "query": user_input}
    response = qa_chain.run(input_data)

    return response
