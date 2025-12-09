from sentence_transformers import SentenceTransformer

model = SentenceTransformer("mixedbread-ai/mxbai-embed-large-v1")

def embed(text: str) -> list:
    return model.encode(text).tolist()
