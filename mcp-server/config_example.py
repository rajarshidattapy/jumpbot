import os
from dotenv import load_dotenv
load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY","")
MODEL = os.getenv("MODEL", "amazon/nova-2-lite-v1:free")
DB_DIR = "./faiss_db"