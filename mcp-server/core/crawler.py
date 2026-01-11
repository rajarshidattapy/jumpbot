import os
import sys
import asyncio
# Force stdout/stderr to print immediately
sys.stderr.reconfigure(encoding='utf-8')

def log(msg):
    sys.stderr.write(f"\n🔴 [DEBUG] {msg}\n")
    sys.stderr.flush()

# --- HARDCODED PATH CHECK ---
# Based on your screenshot path
BASE_DIR = r"C:\Users\asus\Desktop\jumpbot\client"
if not os.path.exists(BASE_DIR):
    # Fallback to relative if hardcoded path fails
    BASE_DIR = os.path.join(os.getcwd(), "client")

log(f"SAVING FILES TO: {BASE_DIR}")

async def crawl_site(start_url, max_pages=1):
    log(f"STARTING CRAWL: {start_url}")
    
    mirror_path = os.path.join(BASE_DIR, "mirror.html")
    
    # 1. WRITE LOADING PLACEHOLDER
    try:
        loading_html = f"""
        <html><body style='background:#222;color:#0f0;font-family:monospace;padding:20px'>
        <h2>🕷️ JumpBot is crawling...</h2>
        <p>Target: {start_url}</p>
        </body></html>
        """
        with open(mirror_path, "w", encoding="utf-8") as f:
            f.write(loading_html)
    except Exception as e:
        log(f"❌ FAILED TO WRITE FILE: {e}")

    # 2. RUN PLAYWRIGHT
    from playwright.async_api import async_playwright
    from bs4 import BeautifulSoup # Import here to be safe
    
    all_blocks = []

    try:
        log("Launching Browser...")
        async with async_playwright() as p:
            browser = await p.firefox.launch(headless=True)
            page = await browser.new_page()
            
            log(f"Navigating to {start_url}...")
            try:
                await page.goto(start_url, timeout=60000, wait_until="domcontentloaded")
                html = await page.content()
                
                # --- CSS RESCUE START ---
                soup = BeautifulSoup(html, "html.parser")
                
                # A. Inject Base Tag (Correctly)
                if soup.head:
                    # Remove old base tags if any
                    for b in soup.head.find_all("base"):
                        b.decompose()
                    
                    # Create new base tag
                    new_base = soup.new_tag("base", href=start_url)
                    soup.head.insert(0, new_base)
                
                # B. Force HTTPS on all links (Fixes the "No CSS" bug)
                html_str = str(soup)
                html_str = html_str.replace('src="//', 'src="https://')
                html_str = html_str.replace('href="//', 'href="https://')
                html_str = html_str.replace('content="//', 'content="https://')
                # ------------------------

                # Overwrite the test file with real content
                with open(mirror_path, "w", encoding="utf-8") as f:
                    f.write(html_str)
                log(f"✅ REAL CONTENT SAVED ({len(html_str)} bytes)")
                
                # Extract text for the agent
                # We re-parse the *modified* html to be consistent
                clean_soup = BeautifulSoup(html_str, 'html.parser')
                
                # Remove junk for the AI (scripts, styles)
                for script in clean_soup(["script", "style", "svg", "path", "nav", "footer"]):
                    script.decompose()

                # Get clean text blocks
                for elem in clean_soup.find_all(['p', 'h1', 'h2', 'h3']):
                    text = elem.get_text(strip=True)
                    if len(text) > 20:
                        all_blocks.append({'text': text, 'url': start_url, 'selector': 'body'})
                
            except Exception as e:
                log(f"❌ Navigation Error: {e}")
                
            await browser.close()
            
    except Exception as e:
        log(f"❌ Playwright Crash: {e}")

    return all_blocks