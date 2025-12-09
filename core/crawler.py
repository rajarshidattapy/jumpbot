from urllib.parse import urljoin, urlparse
from playwright.sync_api import sync_playwright
import trafilatura

def get_links(page):
    return page.eval_on_selector_all("a[href]", "els => els.map(e => e.getAttribute('href'))")

def same_domain(base, link):
    try:
        return urlparse(base).netloc == urlparse(link).netloc
    except:
        return False

def extract_text(html):
    return trafilatura.extract(html, include_links=False)

def crawl_site(root_url: str, max_pages: int = 40):
    visited = set()
    queue = [root_url]
    results = []

    with sync_playwright() as p:
        browser = p.firefox.launch()
        page = browser.new_page()

        while queue and len(visited) < max_pages:
            url = queue.pop(0)
            if url in visited:
                continue
            visited.add(url)

            try:
                page.goto(url, timeout=60000)
                html = page.content()
            except:
                continue

            text = extract_text(html)
            if text:
                paras = [p.strip() for p in text.split("\n") if p.strip()]
                selectors = [f"{url}::jumpbot-section-{i}" for i in range(len(paras))]
                results += list(zip(paras, selectors))

            links = get_links(page)
            for link in links:
                full = urljoin(url, link)

                # ---- ignore websocket + local addresses ----
                if full.startswith("ws://") or full.startswith("wss://"):
                    continue
                if "localhost" in full or "127.0.0.1" in full:
                    continue

                # ---- queue only valid same-domain pages ----
                if same_domain(root_url, full) and full not in visited and full not in queue:
                    queue.append(full)

        browser.close()

    return results
