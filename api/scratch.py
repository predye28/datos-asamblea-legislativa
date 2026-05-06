import sys
sys.path.append('.')
from database import fetchall

for year in range(1990, 2026, 4):
    adm = f"{year}-{year+4}"
    query = """
    SELECT COUNT(*) as count
    FROM historial_diputados h
    WHERE h.administracion = %s
      AND h.fecha_desde <= MAKE_DATE(SUBSTRING(%s FROM 1 FOR 4)::integer, 5, 1)
      AND (h.fecha_hasta IS NULL OR h.fecha_hasta >= MAKE_DATE(SUBSTRING(%s FROM 1 FOR 4)::integer, 5, 1))
    """
    rows = fetchall(query, (adm, adm, adm))
    print(f"{adm}: {rows[0]['count']}")
