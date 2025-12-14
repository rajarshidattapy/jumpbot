# JumpBot

JumpBot is a documentation crawler and query tool that leverages modern AI techniques to index and query documentation pages. It provides a WebSocket interface to interact with the system and supports tools for crawling, indexing, and querying documentation.

## Features

- **Crawling**: Extracts and processes content from documentation pages.
- **Indexing**: Embeds and stores content for efficient retrieval.
- **Querying**: Answers questions based on indexed content using an LLM.
- **WebSocket Gateway**: Provides a bridge for real-time communication with the system.

## Project Structure

- `agent.py`: Main entry point for the FastMCP agent.
- `core/`: Core functionalities including crawling, embedding, indexing, and querying.
  - `crawler.py`: Handles web crawling and content extraction.
  - `embedding.py`: Generates embeddings for text using Sentence Transformers.
  - `rag.py`: Implements retrieval-augmented generation (RAG) for indexing and querying.
  - `vectordb.py`: Manages vector database operations using FAISS.
- `server/`: WebSocket server for interacting with the agent.
  - `websocket_gateway.py`: Bridges WebSocket communication with the MCP agent.
- `client/`: Frontend files (if applicable).
- `faiss_db/`: Directory for storing FAISS index files.

## Requirements

- Python 3.8+
- Dependencies listed in `req.txt`

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/rajarshidattapy/jumpbot.git
   cd jumpbot
```

2. Install dependencies:
```bash
pip install -r req.txt
```

3. Set up environment variables:

Create a config.py.

4.Start the WebSocket server:
```bash
python server/websocket_gateway.py
```
interact with the system via WebSocket at ws://localhost:8765.
5. Open the file explorer and find the jumpbot folder. and navigate into client folder and opn index.html manually in any off ur browser

6. In the browser, you should see the JumpBot interface.
7.paste the url of the documentation page you want to crawl and index.
8. Click the "Crawl and Index" button to start the process.
9. Once the process is complete, you can query the indexed content using the "Query" input field.
10.wait for some time things might take some minimal amount of time depending on the size of the documentation page.
