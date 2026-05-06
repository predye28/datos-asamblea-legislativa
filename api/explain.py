import sys
sys.path.append('.')
from database import fetchall

# Let's EXPLAIN the query that's slow
query = """
EXPLAIN ANALYZE
SELECT
    p.id
FROM proyectos p
WHERE EXISTS (
    SELECT 1 FROM proponentes pr
    JOIN historial_diputados h ON
        unaccent(LOWER(TRIM(COALESCE(pr.apellidos, '') || ' ' || COALESCE(pr.nombre, ''))))
            = unaccent(LOWER(TRIM(h.apellidos || ' ' || h.nombre)))
        AND (h.fecha_desde IS NULL OR p.fecha_inicio >= h.fecha_desde)
        AND (h.fecha_hasta IS NULL OR p.fecha_inicio <= h.fecha_hasta)
    WHERE pr.proyecto_id = p.id
      AND h.partido_id = 1
)
LIMIT 20
"""

for row in fetchall(query):
    print(row['QUERY PLAN'])
