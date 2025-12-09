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
5. Interact with the system via WebSocket at ws://localhost:8765.