"""
exportar_csv.py
══════════════════════════════════════════════════════════════════════
Exporta todas las tablas de PostgreSQL (Neon) a archivos CSV
y genera un archivo de relaciones (relaciones.json).

Uso:
    python exportar_csv.py

Variables de entorno requeridas:
    DATABASE_URL  → connection string de Neon
                    (se lee del .env automáticamente)

Salida:
    exports/
    ├── proyectos.csv
    ├── proponentes.csv
    ├── tramitacion.csv
    ├── documentos.csv
    ├── scraper_estado.csv
    ├── categorias.csv
    ├── proyecto_categorias.csv
    └── relaciones.json
══════════════════════════════════════════════════════════════════════
"""

import csv
import json
import os
from datetime import datetime
from pathlib import Path

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

# ── Configuración ──────────────────────────────────────────────────────

CARPETA_SALIDA = Path("exports")


# ── Conexión ───────────────────────────────────────────────────────────

def conectar():
    """
    Abre y retorna una conexión a la base de datos usando DATABASE_URL.
    SSL requerido para Neon.
    """
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise EnvironmentError(
            "Variable DATABASE_URL no encontrada. "
            "Revisá tu archivo .env."
        )
    print("📡 Conectando a la base de datos...")
    conn = psycopg2.connect(database_url, sslmode="require")
    print("✅ Conexión establecida.\n")
    return conn


# ── Obtener lista de tablas ────────────────────────────────────────────

def obtener_tablas(conn) -> list[str]:
    """
    Obtiene automáticamente todas las tablas del schema 'public'.
    Excluye vistas y tablas internas de Postgres.
    """
    query = """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type   = 'BASE TABLE'
        ORDER BY table_name;
    """
    with conn.cursor() as cur:
        cur.execute(query)
        tablas = [row[0] for row in cur.fetchall()]

    print(f"📋 Tablas encontradas ({len(tablas)}): {', '.join(tablas)}\n")
    return tablas


# ── Exportar una tabla a CSV ───────────────────────────────────────────

def exportar_tabla(conn, nombre_tabla: str) -> int:
    """
    Exporta el contenido completo de una tabla a un CSV.

    Args:
        conn:          Conexión activa a la base de datos.
        nombre_tabla:  Nombre de la tabla a exportar.

    Returns:
        Número de filas exportadas.
    """
    ruta_csv = CARPETA_SALIDA / f"{nombre_tabla}.csv"

    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(f'SELECT * FROM "{nombre_tabla}"')
        filas = cur.fetchall()
        columnas = [desc[0] for desc in cur.description] if cur.description else []

    if not columnas:
        print(f"  ⚠️  {nombre_tabla}: tabla vacía o sin columnas.")
        return 0

    with open(ruta_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=columnas,
            quoting=csv.QUOTE_ALL,      # Comillas en todos los campos (seguro para IA)
            extrasaction="ignore",
            lineterminator="\n",
        )
        writer.writeheader()

        for fila in filas:
            # Convertir valores None → "" y datetimes → ISO string
            fila_limpia = {}
            for k, v in fila.items():
                if v is None:
                    fila_limpia[k] = ""
                elif isinstance(v, datetime):
                    fila_limpia[k] = v.isoformat()
                else:
                    fila_limpia[k] = v
            writer.writerow(fila_limpia)

    print(f"  ✅ {nombre_tabla}.csv — {len(filas):,} filas exportadas")
    return len(filas)


# ── Obtener relaciones (Foreign Keys) ─────────────────────────────────

def obtener_relaciones(conn) -> list[dict]:
    """
    Consulta el catálogo de PostgreSQL para obtener todas las
    foreign keys del schema 'public'.

    Returns:
        Lista de dicts con estructura:
        {
            "constraint_name": str,
            "tabla_origen": str,
            "columna_origen": str,
            "tabla_destino": str,
            "columna_destino": str,
            "on_delete": str,
        }
    """
    query = """
        SELECT
            tc.constraint_name,
            tc.table_name         AS tabla_origen,
            kcu.column_name       AS columna_origen,
            ccu.table_name        AS tabla_destino,
            ccu.column_name       AS columna_destino,
            rc.delete_rule        AS on_delete
        FROM information_schema.table_constraints       AS tc
        JOIN information_schema.key_column_usage         AS kcu
            ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema     = kcu.table_schema
        JOIN information_schema.constraint_column_usage  AS ccu
            ON tc.constraint_name = ccu.constraint_name
           AND tc.table_schema     = ccu.table_schema
        JOIN information_schema.referential_constraints  AS rc
            ON tc.constraint_name = rc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema    = 'public'
        ORDER BY tabla_origen, columna_origen;
    """
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(query)
        relaciones = [dict(row) for row in cur.fetchall()]

    return relaciones


def guardar_relaciones(relaciones: list[dict]):
    """
    Guarda las relaciones en un JSON estructurado y un CSV
    para análisis con IA.
    """
    # -- JSON
    ruta_json = CARPETA_SALIDA / "relaciones.json"
    with open(ruta_json, "w", encoding="utf-8") as f:
        json.dump(relaciones, f, ensure_ascii=False, indent=2)

    # -- CSV
    ruta_csv = CARPETA_SALIDA / "relaciones.csv"
    if relaciones:
        with open(ruta_csv, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(
                f,
                fieldnames=relaciones[0].keys(),
                quoting=csv.QUOTE_ALL,
                lineterminator="\n",
            )
            writer.writeheader()
            writer.writerows(relaciones)

    print(f"\n  ✅ relaciones.json y relaciones.csv — {len(relaciones)} FK encontradas")


# ── Función principal ──────────────────────────────────────────────────

def main():
    inicio = datetime.now()
    print("=" * 60)
    print("      EXPORTADOR CSV — Asamblea Legislativa DB")
    print(f"      {inicio.strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60 + "\n")

    # Crear carpeta de salida si no existe
    CARPETA_SALIDA.mkdir(parents=True, exist_ok=True)
    print(f"📁 Carpeta de salida: {CARPETA_SALIDA.resolve()}\n")

    conn = None
    total_filas = 0

    try:
        conn = conectar()

        # 1. Obtener tablas automáticamente
        tablas = obtener_tablas(conn)

        # 2. Exportar cada tabla
        print("📤 Exportando tablas...\n")
        for tabla in tablas:
            try:
                filas = exportar_tabla(conn, tabla)
                total_filas += filas
            except Exception as e:
                print(f"  ❌ Error exportando '{tabla}': {e}")

        # 3. Obtener y guardar relaciones
        print("\n🔗 Exportando relaciones (Foreign Keys)...")
        try:
            relaciones = obtener_relaciones(conn)
            guardar_relaciones(relaciones)
        except Exception as e:
            print(f"  ❌ Error exportando relaciones: {e}")

    except EnvironmentError as e:
        print(f"\n❌ Error de configuración: {e}")
        return

    except psycopg2.Error as e:
        print(f"\n❌ Error de conexión a la base de datos: {e}")
        return

    finally:
        if conn and not conn.closed:
            conn.close()
            print("\n🔌 Conexión cerrada correctamente.")

    # Resumen final
    duracion = (datetime.now() - inicio).total_seconds()
    print("\n" + "=" * 60)
    print("  RESUMEN DE EXPORTACIÓN")
    print("=" * 60)
    print(f"  Tablas exportadas: {len(tablas)}")
    print(f"  Filas totales:     {total_filas:,}")
    print(f"  Duración:          {duracion:.1f}s")
    print(f"  Archivos en:       {CARPETA_SALIDA.resolve()}")
    print("=" * 60)


if __name__ == "__main__":
    main()
