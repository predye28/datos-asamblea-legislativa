import sys
sys.path.append('.')
from database import fetchall

print("--- INDEXES ---")
indexes = fetchall("SELECT tablename, indexname, indexdef FROM pg_indexes WHERE tablename IN ('proyectos', 'proponentes', 'historial_diputados', 'partidos')")
for idx in indexes:
    print(idx)

print("--- PROPONENTES COLUMNS ---")
cols1 = fetchall("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'proponentes'")
for col in cols1:
    print(col)

print("--- HISTORIAL_DIPUTADOS COLUMNS ---")
cols2 = fetchall("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'historial_diputados'")
for col in cols2:
    print(col)
