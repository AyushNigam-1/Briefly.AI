import os
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec
from sklearn.metrics.pairwise import cosine_similarity

load_dotenv()

pc = Pinecone(api_key=os.environ.get("pinecone_api_key"))

if 'text-summary' not in pc.list_indexes().names():
    pc.create_index(
        name='text-summary',
        dimension=768,  
        metric='cosine',  
        spec=ServerlessSpec(cloud='aws', region='us-east-1')
    )

index = pc.Index('text-summary')

def store_embedding(video_id: str, vector):
    """Stores the embedding vector in Pinecone."""
    index.upsert([(video_id, vector)])

def query_embeddings(video_id,query_vector, top_k=5):
    """Queries Pinecone for relevant embeddings."""
    
    embedding_data = index.fetch([video_id])  
    if video_id in embedding_data:
        paragraph_vector = embedding_data[video_id] 
        similarity_score = cosine_similarity([paragraph_vector], [query_vector])[0][0]
        print("Similarity Score:", similarity_score)
    else:
        print(f"Embedding for video_id {video_id} not found.")
