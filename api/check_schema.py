import sys
from database import fetchall

def get_columns(table_name):
    query = """
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = %s
    """
    return fetchall(query, (table_name,))

print("--- partidos ---")
for col in get_columns("partidos"):
    print(col)

print("\n--- historial_diputados ---")
for col in get_columns("historial_diputados"):
    print(col)

# Also let's check a few rows
print("\n--- sample partidos ---")
for row in fetchall("SELECT * FROM partidos LIMIT 3"):
    print(row)

print("\n--- sample historial_diputados ---")
for row in fetchall("SELECT * FROM historial_diputados LIMIT 3"):
    print(row)
