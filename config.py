import os
from dotenv import load_dotenv
load_dotenv()

OPENROUTER_API_KEY = os.getenv("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")
MODEL = os.getenv("MODEL", "amazon/nova-2-lite-v1:free")
DB_DIR = "./faiss_db"
