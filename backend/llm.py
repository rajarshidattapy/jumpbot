import requests
from config import OPENROUTER_API_KEY, MODEL

def ask_llm(question: str, context: str):
    url = "https://openrouter.ai/api/v1/chat/completions"
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content":
                "You are JumpBot. Only answer using given context. "
                "If unknown, say you don't know. Also return which block is relevant."
            },
            {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"}
        ]
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": "https://jumpbot.ai"
    }

    r = requests.post(url, json=payload, headers=headers)
    return r.json()["choices"][0]["message"]["content"]
