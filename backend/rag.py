from backend.embedding import embed
from vectordb import add_vectors, search_vectors

def index_page(url: str, blocks: list):
    texts = [b[0] for b in blocks]
    selectors = [b[1] for b in blocks]
    vectors = [embed(t) for t in texts]
    add_vectors(url, vectors, selectors, texts)
    return True

def search(url: str, query: str, k=4):
    v = embed(query)
    return search_vectors(url, v, k)
