from utils.query.embeddings import generate_embedding
from utils.query.pinecone_db import store_embedding
def save_summary_with_embedding(summary: str, video_id: str):
    embedding = generate_embedding(summary)
    if embedding is None:
        print("Failed to generate embedding. Skipping storage.")
        return

    store_embedding(embedding, video_id, summary)