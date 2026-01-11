import sys
import os

# --- FORCE UNBUFFERED OUTPUT (So logs appear instantly) ---
sys.stderr.reconfigure(encoding='utf-8')

def debug_log(msg):
    sys.stderr.write(f"\n🔵 [AGENT] {msg}\n")
    sys.stderr.flush()

debug_log("LOADING AGENT...")

from fastmcp import FastMCP
from core.crawler import crawl_site
from core.rag import index_page, query_page
from core.llm import find_highlighted
from core.highlighter import inject_highlights

mcp = FastMCP("JumpBot")

@mcp.tool()
async def crawl_page(url: str) -> dict:
    """Crawl a single page."""
    debug_log(f"RECEIVED REQUEST TO CRAWL: {url}")
    
    # 1. CALL CRAWLER
    debug_log("Calling crawl_site() now...")
    try:
        # We await the crawler you just built
        blocks = await crawl_site(url, max_pages=1)
        debug_log(f"Crawl finished! Found {len(blocks)} blocks.")
    except Exception as e:
        debug_log(f"❌ CRAWL FAILED: {e}")
        return {"error": str(e)}

    # 2. INDEXING
    debug_log("Starting indexing...")
    try:
        index_page(url, blocks)
        debug_log("Indexing complete.")
    except Exception as e:
        debug_log(f"❌ INDEXING FAILED: {e}")
    
    return {"indexed_blocks": len(blocks), "pages": "single"}

@mcp.tool()
def query_page_tool(url: str, question: str) -> dict:
    """Ask a question."""
    debug_log(f"RECEIVED QUESTION: {question}")
    
    hits = query_page(url, question)
    if not hits:
        return {"answer": "Nothing found", "highlight_file": None}

    context = "\n\n".join([h["text"] for h in hits])
    
    # Get Answer
    raw_answer = find_highlighted(context, question)
    
    # Highlight
    import re
    phrases = re.findall(r'\*\*(.*?)\*\*|"(.*?)"', raw_answer)
    clean_phrases = [p[0] or p[1] for p in phrases if p[0] or p[1]]

    # Inject
    mirror_path = os.path.join("client", "mirror.html")
    new_file = None
    if clean_phrases:
        new_file = inject_highlights(mirror_path, clean_phrases)

    return {
        "answer": raw_answer.replace("**", ""), 
        "highlight_file": new_file 
    }

if __name__ == "__main__":
    debug_log("Agent Main Loop Starting...")
    mcp.run(transport="stdio")