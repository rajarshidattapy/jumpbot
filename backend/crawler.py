import trafilatura
import playright.sync_api as pw

def crawl(url: str):
    with pw.sync_playwright() as p:
        browser = p.firefox.launch()
        page = browser.new_page()
        page.goto(url)
        html = page.content()
        browser.close()

    text = trafilatura.extract(html, include_links=False)
    if not text:
        raise ValueError("Page extraction failed")

    # produce DOM selector for each paragraph
    paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
    selectors = [f"jumpbot-section-{i}" for i in range(len(paragraphs))]
    return list(zip(paragraphs, selectors))
