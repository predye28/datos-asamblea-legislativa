import sys
sys.path.append('.')
from database import fetchall

adm = '2014-2018'
query = """
SELECT
    p.codigo,
    COUNT(*) AS total_diputados
FROM historial_diputados h
JOIN partidos p ON p.id = h.partido_id
WHERE h.administracion = %s
  AND h.fecha_desde <= MAKE_DATE(SUBSTRING(%s FROM 1 FOR 4)::integer, 5, 1)
  AND (h.fecha_hasta IS NULL OR h.fecha_hasta >= MAKE_DATE(SUBSTRING(%s FROM 1 FOR 4)::integer, 5, 1))
GROUP BY 1
"""
rows = fetchall(query, (adm, adm, adm))
total = sum(r['total_diputados'] for r in rows)
print(f"Total Diputados 2014-2018: {total}")
for r in rows:
    print(dict(r))
