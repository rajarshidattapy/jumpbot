export async function scrapeWebsite(url) {
    const res = await fetch("http://localhost:8000/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url })
    });
  
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }
  
    return await res.json();
  }
  