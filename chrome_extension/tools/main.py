from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import time

app = FastAPI()


class ScrapeRequest(BaseModel):
    url: str


known_file_exts = (
    ".js", ".ts", ".json", ".py", ".html", ".css",
    ".md", ".yaml", ".yml", ".toml"
)


def scrape_page(url: str):
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-blink-features=AutomationControlled")

    service = Service(ChromeDriverManager().install())

    driver = webdriver.Chrome(
        service=service,
        options=options
    )

    try:
        driver.get(url)
        time.sleep(2)

        body_text = driver.find_element(By.TAG_NAME, "body").text

        detected_files = sorted({
            word for word in body_text.split()
            if word.lower().endswith(known_file_exts)
        })

        return {
            "url": url,
            "title": driver.title,
            "text": body_text[:15000],
            "mentioned_files": detected_files
        }

    finally:
        driver.quit()



@app.post("/scrape")
def scrape(req: ScrapeRequest):
    if not req.url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="Invalid URL")

    return scrape_page(req.url)

if __name__ == "__main__":
    import uvicorn
    import os
    
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False  # Disable reload in production
    )