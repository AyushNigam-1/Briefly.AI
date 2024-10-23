import pinecone
import os
from dotenv import load_dotenv

load_dotenv()

pinecone.init(api_key=os.getenv("pinecone_api_key"), environment=os.getenv("us-east-1"))
index = pinecone.Index("youtube-chat-history")

def store_embedding(user_id: str, vector):
    """Stores the embedding vector in Pinecone."""
    index.upsert([(user_id, vector)])

def query_embeddings(query_vector, top_k=5):
    """Queries Pinecone for relevant embeddings."""
    results = index.query(query_vector, top_k=top_k, include_metadata=True)
    return results
