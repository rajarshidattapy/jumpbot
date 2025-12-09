import faiss
import numpy as np
import pickle
import os

DB_DIR = "./faiss_db"
os.makedirs(DB_DIR, exist_ok=True)

def _paths(url):
    name = url.replace("https://", "").replace("http://", "").replace("/", "_")
    return {
        "index": f"{DB_DIR}/{name}.index",
        "meta": f"{DB_DIR}/{name}.pkl"
    }

def load_or_create(url, dim):
    paths = _paths(url)
    if os.path.exists(paths["index"]):
        index = faiss.read_index(paths["index"])
        with open(paths["meta"], "rb") as f:
            meta = pickle.load(f)
    else:
        index = faiss.IndexFlatL2(dim)
        meta = []
    return index, meta

def save(url, index, meta):
    paths = _paths(url)
    faiss.write_index(index, paths["index"])
    with open(paths["meta"], "wb") as f:
        pickle.dump(meta, f)

def add_vectors(url, vectors, selectors, texts):
    dim = len(vectors[0])
    index, meta = load_or_create(url, dim)
    index.add(np.array(vectors).astype("float32"))
    for s, t in zip(selectors, texts):
        meta.append({"selector": s, "text": t})
    save(url, index, meta)

def search_vectors(url, vector, k=4):
    dim = len(vector)
    index, meta = load_or_create(url, dim)
    if index.ntotal == 0:
        return []
    d, i = index.search(np.array([vector]).astype("float32"), k)
    results = []
    for idx in i[0]:
        if idx < len(meta):
            results.append(meta[idx])
    return results
