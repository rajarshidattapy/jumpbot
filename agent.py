from fastmcp import FastMCP
from core.crawler import crawl_site as crawl
from core.rag import index_page, query_page
from core.llm import ask_llm
from core.crawler import crawl_site

mcp = FastMCP("JumpBot")

@mcp.tool()
def crawl_page(url: str) -> dict:
    """
    Crawl and index a documentation page.
    """
    blocks = crawl(url)
    index_page(url, blocks)
    return {"indexed_blocks": len(blocks)}

@mcp.tool()
def query_page_tool(url: str, question: str) -> dict:
    """
    Ask a question about a crawled page.
    """
    hits = query_page(url, question)
    if not hits:
        return {"answer": "Nothing found", "selector": None}

    context = "\n\n".join([h["text"] for h in hits])
    answer = ask_llm(context, question)
    selector = hits[0]["selector"]
    return {"answer": answer, "selector": selector}

@mcp.tool()
def crawl_page(url: str) -> dict:
    blocks = crawl_site(url, max_pages=40)
    index_page(url, blocks)
    return {"indexed_blocks": len(blocks), "pages": "multiple"}


if __name__ == "__main__":
    mcp.run()
