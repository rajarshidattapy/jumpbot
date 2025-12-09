from fastapi import FastAPI
from models import CrawlRequest, ChatRequest
from backend.crawler import crawl
from rag import index_page, search
from backend.llm import ask_llm

app = FastAPI()

@app.post("/crawl")
def crawl_page(req: CrawlRequest):
    blocks = crawl(req.url)
    index_page(req.url, blocks)
    return {"status": "indexed", "blocks": len(blocks)}

@app.post("/chat")
def chat(req: ChatRequest):
    hits = search(req.url, req.question)
    context = "\n\n".join([h["text"] for h in hits])
    answer = ask_llm(req.question, context)

    best = hits[0]["selector"]
    return {
        "answer": answer,
        "selector": best  # frontend scrolls/highlights this
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)