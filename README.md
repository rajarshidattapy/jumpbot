## JumpBot — AI Access to Any Website

**JumpBot** is a modular system that gives AI models **structured, queryable access to arbitrary websites** — without custom integrations per site.

It works in two complementary modes:

---

## 1️⃣ Chrome Extension (User-facing)

An in-browser AI layer that lets users interact with *any webpage* in real time.

### Features

* **Instant summaries** (brief & detailed)
* **Context-aware Q&A** about the current page
* **YouTube transcript fetching & analysis**
* **Document-aware chat** with phrase-level highlighting
* **Side panel UI** for continuous interaction
* **Model routing via OpenRouter**

**Use case:**
End users want AI *on top of the web*, not behind another app.

🎥 **Demo Video**
<iframe>https://github.com/user-attachments/assets/3436d817-89c4-4b5b-a416-07c3d6650a79<iframe>


---

## 2️⃣ MCP-based Crawling & Indexing Server (Infra)

A backend service built on **Model Context Protocol (fastmcp)** that:

* Crawls arbitrary webpages
* Extracts clean, structured text
* Indexes content as queryable context
* Exposes it to AI agents via MCP tools

### Capabilities

* Website crawling & content normalization
* Page → context transformation
* Query-based retrieval (not raw scraping)
* Designed for **agent consumption**, not humans

**Use case:**
Agents need *reliable, structured web context*, not brittle HTML dumps.

🧠 **Architecture Overview**

<img width="1600" height="900" alt="JumpBot MCP Architecture" src="https://github.com/user-attachments/assets/b45a0c48-8a1b-4645-a92e-5cd82498d800" />

---

## Why JumpBot Exists (Straight Talk)

* Browsers are full of information → **AI can’t see it**
* Scrapers are brittle → **agents break**
* RAG pipelines are static → **the web is dynamic**

**JumpBot bridges that gap** by making the web:

* Agent-readable
* Queryable
* Modular
* Real-time

---

## Repo Structure (suggest adding this)

```
jumpbot/
├── chrome_extension/    # Browser-side AI interface
├── mcp_server/          # MCP crawler + indexer
└── README.md
```

