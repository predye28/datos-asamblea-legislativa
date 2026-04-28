"""
migrate_drop_documentos.py
──────────────────────────────────────────────────────────────────────
Migración única: elimina la tabla `documentos` (siempre estuvo vacía,
los scrapers ya no descargan PDFs, y el API ya no la referencia).

Idempotente: si la tabla no existe, no hace nada.

Antes de borrar:
  - Cuenta filas para asegurarse de que esté vacía
  - Si tiene filas, ABORTA y muestra el conteo (decisión humana)

Uso:
  python migrate_drop_documentos.py
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv

load_dotenv()


def main():
    url = os.getenv("DATABASE_URL")
    if not url:
        raise SystemExit("DATABASE_URL no definida")

    conn = psycopg2.connect(url, sslmode="require")
    conn.autocommit = False
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_name = 'documentos'
            )
        """)
        existe = cur.fetchone()[0]

        if not existe:
            print("La tabla 'documentos' no existe. Nada que hacer.")
            return

        cur.execute("SELECT COUNT(*) FROM documentos")
        n = cur.fetchone()[0]

        if n > 0:
            print(f"ABORTA: la tabla 'documentos' tiene {n} fila(s).")
            print("Revisá los datos antes de borrarla. No se modificó nada.")
            sys.exit(1)

        print("Tabla 'documentos' está vacía. Eliminando...")
        cur.execute("DROP TABLE documentos")
        conn.commit()
        print("Tabla 'documentos' eliminada.")

    except Exception as e:
        conn.rollback()
        print(f"ERROR: {e}")
        sys.exit(1)
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
