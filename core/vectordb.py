import os, pickle, faiss, numpy as np
from config import DB_DIR
os.makedirs(DB_DIR, exist_ok=True)

def _paths(url):
    name = url.replace("https://","").replace("http://","").replace("/","_")
    return f"{DB_DIR}/{name}.index", f"{DB_DIR}/{name}.pkl"

def load(url, dim):
    index_path, meta_path = _paths(url)
    if os.path.exists(index_path):
        index = faiss.read_index(index_path)
        meta = pickle.load(open(meta_path, "rb"))
    else:
        index = faiss.IndexFlatL2(dim)
        meta = []
    return index, meta

def save(url, index, meta):
    index_path, meta_path = _paths(url)
    faiss.write_index(index, index_path)
    pickle.dump(meta, open(meta_path, "wb"))

def add(url, vectors, texts, selectors):
    dim = len(vectors[0])
    index, meta = load(url, dim)
    index.add(np.array(vectors).astype("float32"))
    meta += [{"text": t, "selector": s} for t, s in zip(texts, selectors)]
    save(url, index, meta)

def search(url, vector, k=4):
    dim = len(vector)
    index, meta = load(url, dim)
    if index.ntotal == 0: return []
    _, idxs = index.search(np.array([vector]).astype("float32"), k)
    return [meta[i] for i in idxs[0] if i < len(meta)]
