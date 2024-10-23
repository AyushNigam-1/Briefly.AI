from langchain_community.embeddings.huggingface import HuggingFaceEmbeddings

embedding_model = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

def generate_embedding(text: str):
    """Generates an embedding vector for the given text."""
    return embedding_model.embed_query(text)
