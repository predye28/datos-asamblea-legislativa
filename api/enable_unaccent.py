"""
enable_unaccent.py
──────────────────────────────────────────────────────────────────────
Habilita la extensión `unaccent` de PostgreSQL para permitir búsquedas
insensibles a tildes (ej. "Munoz" encuentra a "Muñoz", "Jose" encuentra
a "José"). Seguro de correr múltiples veces.

Uso:
  python enable_unaccent.py
"""

import os

import psycopg2
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("DATABASE_URL")
if not url:
    print("No DATABASE_URL encontrada. Revisá tu .env")
    exit(1)

print("Conectando a PostgreSQL...")
conn = psycopg2.connect(url, sslmode="require")
conn.autocommit = True
cur = conn.cursor()

try:
    cur.execute("CREATE EXTENSION IF NOT EXISTS unaccent;")
    print("OK  extensión 'unaccent' habilitada.")
except Exception as exc:
    print(f"ERR no se pudo habilitar unaccent: {exc}")
    exit(1)

cur.close()
conn.close()
