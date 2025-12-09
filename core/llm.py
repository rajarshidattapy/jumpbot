import requests
from config import OPENROUTER_API_KEY, MODEL

def ask_llm(context, question):
    r = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "model": MODEL,
            "messages": [
                {"role": "system", "content": "Answer strictly from context."},
                {"role": "user", "content": f"Context:\n{context}\n\nQuestion:\n{question}"}
            ]
        }
    )
    return r.json()["choices"][0]["message"]["content"]
