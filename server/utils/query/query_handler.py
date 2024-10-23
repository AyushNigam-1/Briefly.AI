from embeddings.embed import generate_embedding
from pinecone_db import query_embeddings

def chat_with_summary(user_input: str):
    query_vector = generate_embedding(user_input)
    results = query_embeddings(query_vector)

    if results['matches']:
        return results['matches'][0]['metadata'].get('text', "No relevant text found.")
    else:
        return "I couldn't find anything relevant. Try asking something else."
