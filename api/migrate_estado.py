"""
migrate_estado.py
──────────────────────────────────────────────────────────────────────
Migración única: agrega las columnas estado_actual y estado_grupo a
la tabla proyectos, y hace backfill leyendo el último trámite de
cada proyecto desde tramitacion.

Idempotente y bulk (no row-by-row).

Uso:
  python migrate_estado.py
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

    print("1. Agregando columnas si no existen...", flush=True)
    cur.execute("ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS estado_actual TEXT;")
    cur.execute("ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS estado_grupo  TEXT;")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_proy_estado_grupo ON proyectos(estado_grupo);")
    conn.commit()

    print("2. Backfill estado_actual desde último trámite...", flush=True)
    cur.execute("""
        UPDATE proyectos p
        SET estado_actual = sub.organo
        FROM (
            SELECT DISTINCT ON (proyecto_id)
                proyecto_id, organo
            FROM tramitacion
            WHERE organo IS NOT NULL
            ORDER BY proyecto_id, fecha_inicio DESC NULLS LAST
        ) sub
        WHERE p.id = sub.proyecto_id
          AND p.estado_actual IS DISTINCT FROM sub.organo;
    """)
    print(f"   {cur.rowcount} proyectos con estado_actual actualizado.", flush=True)
    conn.commit()

    print("3. Backfill estado_grupo en SQL puro (bulk)...", flush=True)
    # CASE basado en regex para mantener una sola fuente de verdad sin
    # tener que iterar 20K filas en Python.
    cur.execute("""
        UPDATE proyectos
        SET estado_grupo = CASE
            WHEN numero_ley IS NOT NULL THEN 'ley'
            WHEN estado_actual IS NULL THEN 'otro'
            WHEN UPPER(estado_actual) ~ 'ARCHIV|DESECH' THEN 'archivado'
            WHEN UPPER(estado_actual) ~ 'COMISI|PLENARIO|ESTUDIO|TRAMIT|PRIMER DEBATE|SEGUNDO DEBATE|DICTAMEN' THEN 'discusion'
            ELSE 'otro'
        END
        WHERE estado_grupo IS DISTINCT FROM CASE
            WHEN numero_ley IS NOT NULL THEN 'ley'
            WHEN estado_actual IS NULL THEN 'otro'
            WHEN UPPER(estado_actual) ~ 'ARCHIV|DESECH' THEN 'archivado'
            WHEN UPPER(estado_actual) ~ 'COMISI|PLENARIO|ESTUDIO|TRAMIT|PRIMER DEBATE|SEGUNDO DEBATE|DICTAMEN' THEN 'discusion'
            ELSE 'otro'
        END;
    """)
    print(f"   {cur.rowcount} proyectos con estado_grupo actualizado.", flush=True)
    conn.commit()

    cur.execute("""
        SELECT estado_grupo, COUNT(*)
        FROM proyectos
        GROUP BY estado_grupo
        ORDER BY 2 DESC
    """)
    print("4. Distribución resultante:", flush=True)
    for grupo, count in cur.fetchall():
        print(f"   {grupo}: {count:,}", flush=True)

    cur.close()
    conn.close()
    print("Migración completada.", flush=True)


if __name__ == "__main__":
    main()
    sys.stdout.flush()
