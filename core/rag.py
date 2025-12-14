from core.embedding import embed
from core.vectordb import add, search

def index_page(url: str, blocks: list):
    # SAFETY CHECK: If no text was found, stop immediately
    if not blocks:
        print(f"⚠️ Warning: No content found on {url}. Skipping indexing.")
        return

    # Extract text and selectors safely
    texts = [b['text'] for b in blocks]
    selectors = [b['selector'] for b in blocks]
    
    # Create vectors
    vectors = [embed(t) for t in texts]
    
    # Only add to DB if we actually have vectors
    if vectors:
        add(url, vectors, texts, selectors)
    else:
        print(f"⚠️ Warning: No vectors generated for {url}")

def query_page(url: str, question: str):
    v = embed(question)
    return search(url, v)