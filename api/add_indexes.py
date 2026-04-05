"""
add_indexes.py
──────────────────────────────────────────────────────────────────────
Crea índices en PostgreSQL para optimizar las queries más frecuentes
del portal. Seguro de correr múltiples veces (IF NOT EXISTS).

Uso:
  python add_indexes.py
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

indexes = [
    # ── proyectos ────────────────────────────────────────────────────
    # ORDER BY fecha_inicio (listado principal)
    (
        "idx_proyectos_fecha_inicio",
        "CREATE INDEX IF NOT EXISTS idx_proyectos_fecha_inicio "
        "ON proyectos(fecha_inicio DESC NULLS LAST);"
    ),
    # Filtro solo_leyes / detección de ley
    (
        "idx_proyectos_numero_ley",
        "CREATE INDEX IF NOT EXISTS idx_proyectos_numero_ley "
        "ON proyectos(numero_ley) WHERE numero_ley IS NOT NULL;"
    ),
    # Widget proximos-vencer
    (
        "idx_proyectos_vencimiento",
        "CREATE INDEX IF NOT EXISTS idx_proyectos_vencimiento_cuatrienal "
        "ON proyectos(vencimiento_cuatrienal) WHERE numero_ley IS NULL;"
    ),
    # Filtro por tipo de expediente
    (
        "idx_proyectos_tipo",
        "CREATE INDEX IF NOT EXISTS idx_proyectos_tipo_expediente "
        "ON proyectos(tipo_expediente) WHERE tipo_expediente IS NOT NULL;"
    ),
    # ── proponentes ──────────────────────────────────────────────────
    # JOIN proyectos → proponentes
    (
        "idx_proponentes_proyecto_id",
        "CREATE INDEX IF NOT EXISTS idx_proponentes_proyecto_id "
        "ON proponentes(proyecto_id);"
    ),
    # Búsqueda de texto por nombre/apellidos
    (
        "idx_proponentes_apellidos",
        "CREATE INDEX IF NOT EXISTS idx_proponentes_apellidos "
        "ON proponentes(apellidos text_pattern_ops);"
    ),
    # ── tramitacion ──────────────────────────────────────────────────
    # Subquery correlated: estado_actual (último órgano por proyecto)
    # Este índice compuesto es el más importante para el listado.
    (
        "idx_tramitacion_pid_fecha",
        "CREATE INDEX IF NOT EXISTS idx_tramitacion_pid_fecha "
        "ON tramitacion(proyecto_id, fecha_inicio DESC NULLS LAST);"
    ),
    # Actividad semanal — filtro por fecha_inicio reciente
    (
        "idx_tramitacion_fecha_inicio",
        "CREATE INDEX IF NOT EXISTS idx_tramitacion_fecha_inicio "
        "ON tramitacion(fecha_inicio DESC NULLS LAST);"
    ),
    # ── proyecto_categorias ──────────────────────────────────────────
    # Batch query de categorías (idx_pc_proyecto ya existe, pero verificamos)
    (
        "idx_pc_proyecto",
        "CREATE INDEX IF NOT EXISTS idx_pc_proyecto "
        "ON proyecto_categorias(proyecto_id);"
    ),
    (
        "idx_pc_categoria",
        "CREATE INDEX IF NOT EXISTS idx_pc_categoria "
        "ON proyecto_categorias(categoria_id);"
    ),
]

print(f"\n{len(indexes)} índices a verificar:\n")
ok = 0
for name, sql in indexes:
    try:
        cur.execute(sql)
        print(f"  OK  {name}")
        ok += 1
    except Exception as exc:
        print(f"  ERR {name}: {exc}")

cur.close()
conn.close()
print(f"\n{ok}/{len(indexes)} índices verificados exitosamente.")
