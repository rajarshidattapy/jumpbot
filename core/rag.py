from core.embedding import embed
from core.vectordb import add, search

def index_page(url: str, blocks: list):
    texts = [b[0] for b in blocks]
    selectors = [b[1] for b in blocks]
    vectors = [embed(t) for t in texts]
    add(url, vectors, texts, selectors)

def query_page(url: str, question: str):
    v = embed(question)
    return search(url, v)
