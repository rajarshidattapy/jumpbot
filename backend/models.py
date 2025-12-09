from pydantic import BaseModel

class CrawlRequest(BaseModel):
    url: str

class ChatRequest(BaseModel):
    url: str
    question: str
