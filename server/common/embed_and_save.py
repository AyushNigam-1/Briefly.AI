from controllers.query.embeddings import generate_embedding
from controllers.query.pinecone_db import store_embedding

def embed_and_save(summary: str, video_id: str):
    print(video_id)
    embedding = generate_embedding(summary)
    print("embedding --> ", embedding)
    if embedding is None:
        print("Failed to generate embedding. Skipping storage.")
        return

    store_embedding(video_id,embedding)