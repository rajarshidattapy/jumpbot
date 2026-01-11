import requests
from config import OPENROUTER_API_KEY, MODEL

def ask_llm(context, question):
    """Standard ask function."""
    return find_highlighted(context, question)

def find_highlighted(context, question):
    """Asks AI to answer and wrap key phrases in **stars**."""
    r = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "model": MODEL,
            "messages": [
                {
                    "role": "system", 
                    "content": "You are a helpful assistant. Answer the question based on the context. CRITICAL: You MUST highlight the specific short phrases or sentences from the text that support your answer by surrounding them with double asterisks (**like this**). Do not use quotes."
                },
                {"role": "user", "content": f"Context:\n{context}\n\nQuestion:\n{question}"}
            ]
        }
    )
    return r.json()["choices"][0]["message"]["content"]