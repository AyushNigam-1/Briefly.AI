import os
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec

load_dotenv()

pc = Pinecone(api_key=os.environ.get("pinecone_api_key"))

if 'text-summary' not in pc.list_indexes().names():
    pc.create_index(
        name='text-summary',
        dimension=384,  
        metric='cosine',  
        spec=ServerlessSpec(cloud='aws', region='us-east-1')
    )

index = pc.Index('text-summary')

def store_embedding(video_id: str, vector):
    """Stores the embedding vector in Pinecone."""
    index.upsert([(video_id, vector)])

def query_embeddings(query_vector, top_k=5):
    """Queries Pinecone for relevant embeddings."""
    results = index.query(vector=query_vector, top_k=top_k, include_metadata=True)
    print(results)
    return results
