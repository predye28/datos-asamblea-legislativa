import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("DATABASE_URL")
if not url:
    print("No DATABASE_URL found.")
    exit(1)

print("Connecting to Neon Postgres...")
conn = psycopg2.connect(url, sslmode="require")
conn.autocommit = True
cur = conn.cursor()

queries = [
    "CREATE INDEX IF NOT EXISTS idx_proyectos_fecha_inicio ON proyectos(fecha_inicio);",
    "CREATE INDEX IF NOT EXISTS idx_proyectos_numero_ley ON proyectos(numero_ley);",
    "CREATE INDEX IF NOT EXISTS idx_proyectos_vencimiento_cuatrienal ON proyectos(vencimiento_cuatrienal);",
    "CREATE INDEX IF NOT EXISTS idx_proponentes_proyecto_id ON proponentes(proyecto_id);",
    "CREATE INDEX IF NOT EXISTS idx_tramitacion_proyecto_id ON tramitacion(proyecto_id);",
    "CREATE INDEX IF NOT EXISTS idx_tramitacion_fecha_inicio ON tramitacion(fecha_inicio);"
]

for q in queries:
    print(f"Ejecutando: {q}")
    cur.execute(q)

cur.close()
conn.close()
print("¡Índices creados exitosamente!")
