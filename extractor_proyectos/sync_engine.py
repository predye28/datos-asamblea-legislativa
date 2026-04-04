"""
sync_engine.py
══════════════════════════════════════════════════════════════════════
Responsabilidad única: sincronizar proyectos scrapeados contra
PostgreSQL (Neon) y gestionar el checkpoint de Fase 2.

Tablas que gestiona
───────────────────
  proyectos       → datos maestros del proyecto
  proponentes     → firmantes/proponentes (N por proyecto)
  tramitacion     → historial de órganos (N por proyecto)
  documentos      → ruta del PDF/DOCX descargado (0-1 por proyecto)
  scraper_estado  → checkpoint de Fase 2 (página actual)

Variables de entorno requeridas
────────────────────────────────
  DATABASE_URL   → connection string de Neon, ej:
                   postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname

Dependencias: psycopg2-binary, python-dotenv
"""

import os
from datetime import date, datetime

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

# ══════════════════════════════════════════════════════════════════════
# CONEXIÓN
# ══════════════════════════════════════════════════════════════════════

def get_connection():
    """
    Abre y retorna una conexión a la base de datos usando DATABASE_URL.
    SSL requerido (Neon lo exige).
    """
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise EnvironmentError(
            "Variable DATABASE_URL no encontrada. "
            "Revisá tu archivo .env o los Secrets de GitHub Actions."
        )
    return psycopg2.connect(database_url, sslmode="require")


# ══════════════════════════════════════════════════════════════════════
# DDL — CREACIÓN DE TABLAS
# ══════════════════════════════════════════════════════════════════════

def crear_tablas():
    """
    Crea todas las tablas si no existen.
    Seguro correr en cada ejecución — no modifica datos existentes.
    """
    ddl = """
    CREATE TABLE IF NOT EXISTS proyectos (
        id                     SERIAL PRIMARY KEY,
        numero_expediente      INTEGER UNIQUE NOT NULL,
        titulo                 TEXT,
        tipo_expediente        TEXT,
        fecha_inicio           DATE,
        vencimiento_cuatrienal DATE,
        fecha_publicacion      DATE,
        numero_gaceta          TEXT,
        numero_ley             TEXT,
        creado_en              TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS proponentes (
        id           SERIAL PRIMARY KEY,
        proyecto_id  INTEGER REFERENCES proyectos(id) ON DELETE CASCADE,
        secuencia    INTEGER,
        apellidos    TEXT,
        nombre       TEXT
    );

    CREATE TABLE IF NOT EXISTS tramitacion (
        id            SERIAL PRIMARY KEY,
        proyecto_id   INTEGER REFERENCES proyectos(id) ON DELETE CASCADE,
        organo        TEXT,
        fecha_inicio  DATE,
        fecha_termino DATE,
        tipo_tramite  TEXT
    );

    CREATE TABLE IF NOT EXISTS documentos (
        id            SERIAL PRIMARY KEY,
        proyecto_id   INTEGER REFERENCES proyectos(id) ON DELETE CASCADE,
        tipo          TEXT,
        ruta_archivo  TEXT,
        descargado_en TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS scraper_estado (
        id              SERIAL PRIMARY KEY,
        fase            TEXT NOT NULL DEFAULT 'fase2',
        pagina_actual   INTEGER NOT NULL DEFAULT 4,
        ultima_ejecucion TIMESTAMP DEFAULT NOW(),
        UNIQUE (fase)
    );
    """
    print("Verificando esquema de base de datos...")
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(ddl)
        conn.commit()
    print("Tablas verificadas.\n")


# ══════════════════════════════════════════════════════════════════════
# CHECKPOINT — FASE 2
# ══════════════════════════════════════════════════════════════════════

PAGINA_INICIO_FASE2 = 4   # Fase 1 cubre páginas 1-3


def leer_checkpoint_db() -> int:
    """
    Lee la página actual del checkpoint de Fase 2 desde la DB.
    Si no existe un registro todavía, retorna PAGINA_INICIO_FASE2.
    """
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT pagina_actual FROM scraper_estado WHERE fase = 'fase2'"
                )
                row = cur.fetchone()
                if row:
                    pagina = row[0]
                    print(f"Checkpoint leído de DB: página {pagina}.")
                    return pagina
                else:
                    print(f"Sin checkpoint previo. Iniciando desde página {PAGINA_INICIO_FASE2}.")
                    return PAGINA_INICIO_FASE2
    except Exception as e:
        print(f"Error leyendo checkpoint de DB: {e}. Usando página {PAGINA_INICIO_FASE2}.")
        return PAGINA_INICIO_FASE2


def guardar_checkpoint_db(pagina: int):
    """
    Guarda (o actualiza) el checkpoint de Fase 2 en la DB.
    Usa INSERT ... ON CONFLICT para hacer upsert.

    Args:
        pagina: próxima página a procesar en el siguiente run.
    """
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO scraper_estado (fase, pagina_actual, ultima_ejecucion)
                    VALUES ('fase2', %s, NOW())
                    ON CONFLICT (fase) DO UPDATE SET
                        pagina_actual    = EXCLUDED.pagina_actual,
                        ultima_ejecucion = EXCLUDED.ultima_ejecucion
                    """,
                    (pagina,)
                )
            conn.commit()
        print(f"Checkpoint guardado en DB: página {pagina}.")
    except Exception as e:
        print(f"ERROR guardando checkpoint en DB: {e}")
        print(f"  (La página {pagina} se perdió — el próximo run puede repetir trabajo)")


# ══════════════════════════════════════════════════════════════════════
# PARSEO DE FECHAS
# ══════════════════════════════════════════════════════════════════════

MESES = {
    "ene": 1, "feb": 2, "mar": 3, "abr": 4,
    "may": 5, "jun": 6, "jul": 7, "ago": 8,
    "set": 9, "sep": 9,
    "oct": 10, "nov": 11, "dic": 12,
}


def parsear_fecha(texto: str) -> date | None:
    """
    Convierte una cadena de fecha al tipo date.
    Soporta "26/03/2026" y "25-mar.-2026".
    """
    if not texto or not isinstance(texto, str) or not texto.strip():
        return None
    texto = texto.strip().lower()

    # Formato nuevo: "26/03/2026"
    if "/" in texto:
        try:
            partes = texto.split("/")
            return date(int(partes[2]), int(partes[1]), int(partes[0]))
        except Exception:
            pass

    # Formato viejo: "25-mar.-2026"
    try:
        partes = texto.replace(".", "").split("-")
        dia  = int(partes[0])
        mes  = MESES.get(partes[1][:3])
        anio = int(partes[2])
        if mes:
            return date(anio, mes, dia)
    except Exception:
        pass

    return None


# ══════════════════════════════════════════════════════════════════════
# SYNC PRINCIPAL
# ══════════════════════════════════════════════════════════════════════

def sync_proyectos(proyectos: list) -> dict:
    """
    Sincroniza una lista de proyectos scrapeados contra PostgreSQL.

    Estrategia: upsert en proyectos + inserción condicional de hijos
    (proponentes, tramitación) para evitar duplicados.

    Args:
        proyectos: lista de dicts con estructura:
            {
              "numero_expediente": "12345",
              "titulo": "...",
              "general":      { "Tipo de expediente": ..., ... },
              "proponentes":  [ {"Firma": ..., "Nombre": ...} ],
              "tramitacion":  [ {"Órgano": ..., "Fecha Inicio": ..., ...} ],
            }

    Returns:
        { "actualizados": int, "errores": int }
    """
    stats = {"actualizados": 0, "errores": 0}
    total = len(proyectos)

    print(f"Sincronizando {total} proyecto(s)...\n")

    with get_connection() as conn:
        with conn.cursor() as cur:

            for idx, proy in enumerate(proyectos, start=1):
                num_exp = proy.get("numero_expediente")

                if not num_exp or not str(num_exp).isdigit():
                    print(f"  [{idx:>4}/{total}] Expediente inválido ({repr(num_exp)}), omitiendo.")
                    stats["errores"] += 1
                    continue

                try:
                    det = proy.get("general") or proy.get("detalle") or {}

                    num_gaceta = det.get("Número de gaceta") or det.get("Número de Gaceta")
                    num_ley    = det.get("Número de ley que generó") or det.get("Número de Ley")
                    num_gaceta = None if num_gaceta == "NO" else num_gaceta
                    num_ley    = None if num_ley    == "NO" else num_ley

                    # ── Upsert del proyecto ──────────────────────────
                    cur.execute(
                        """
                        INSERT INTO proyectos
                            (numero_expediente, titulo, tipo_expediente,
                             fecha_inicio, vencimiento_cuatrienal,
                             fecha_publicacion, numero_gaceta, numero_ley)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (numero_expediente) DO UPDATE SET
                            titulo                 = EXCLUDED.titulo,
                            tipo_expediente        = EXCLUDED.tipo_expediente,
                            fecha_inicio           = EXCLUDED.fecha_inicio,
                            vencimiento_cuatrienal = EXCLUDED.vencimiento_cuatrienal,
                            fecha_publicacion      = EXCLUDED.fecha_publicacion,
                            numero_gaceta          = EXCLUDED.numero_gaceta,
                            numero_ley             = EXCLUDED.numero_ley
                        RETURNING id;
                        """,
                        (
                            int(num_exp),
                            proy.get("titulo"),
                            det.get("Tipo de expediente") or det.get("Tipo de Expediente"),
                            parsear_fecha(det.get("Fecha de iniciación") or det.get("Fecha de Inicio", "")),
                            parsear_fecha(det.get("Fecha de vencimiento cuatrienal") or det.get("Vencimiento Cuatrienal", "")),
                            parsear_fecha(det.get("Fecha de publicación") or det.get("Fecha de Publicación", "")),
                            num_gaceta,
                            num_ley,
                        ),
                    )
                    proyecto_id = cur.fetchone()[0]

                    # ── Proponentes (solo nuevos) ────────────────────
                    prop_nuevos = 0
                    for prop in proy.get("proponentes", []):
                        cur.execute(
                            """
                            INSERT INTO proponentes (proyecto_id, secuencia, apellidos, nombre)
                            SELECT %s, %s, %s, %s
                            WHERE NOT EXISTS (
                                SELECT 1 FROM proponentes
                                WHERE proyecto_id = %s
                                  AND secuencia = %s
                                  AND (nombre = %s OR apellidos = %s)
                            )
                            """,
                            (
                                proyecto_id,
                                int(prop.get("Firma") or prop.get("Secuencia", 0) or 0),
                                prop.get("Apellidos"),
                                prop.get("Nombre"),
                                proyecto_id,
                                int(prop.get("Firma") or prop.get("Secuencia", 0) or 0),
                                prop.get("Nombre"),
                                prop.get("Apellidos"),
                            ),
                        )
                        if cur.rowcount > 0:
                            prop_nuevos += 1

                    # ── Tramitación (solo nuevos) ────────────────────
                    tram_nuevos = 0
                    for tram in proy.get("tramitacion", []):
                        cur.execute(
                            """
                            INSERT INTO tramitacion
                                (proyecto_id, organo, fecha_inicio, fecha_termino, tipo_tramite)
                            SELECT %s, %s, %s, %s, %s
                            WHERE NOT EXISTS (
                                SELECT 1 FROM tramitacion
                                WHERE proyecto_id = %s
                                  AND organo = %s
                                  AND (fecha_inicio IS NOT DISTINCT FROM %s)
                                  AND tipo_tramite = %s
                            )
                            """,
                            (
                                proyecto_id,
                                tram.get("Órgano"),
                                parsear_fecha(tram.get("Fecha Inicio", "")),
                                parsear_fecha(tram.get("Fecha Término", "")),
                                tram.get("Descripción") or tram.get("Tipo de Trámite"),
                                proyecto_id,
                                tram.get("Órgano"),
                                parsear_fecha(tram.get("Fecha Inicio", "")),
                                tram.get("Descripción") or tram.get("Tipo de Trámite"),
                            ),
                        )
                        if cur.rowcount > 0:
                            tram_nuevos += 1

                    # ── Documento (si existe) ────────────────────────
                    doc = proy.get("documento", {})
                    if doc.get("archivo"):
                        cur.execute(
                            "INSERT INTO documentos (proyecto_id, tipo, ruta_archivo) VALUES (%s, %s, %s)",
                            (proyecto_id, doc.get("tipo"), doc.get("archivo")),
                        )

                    print(
                        f"  [{idx:>4}/{total}] Exp. {num_exp} "
                        f"| +{prop_nuevos} prop. | +{tram_nuevos} trám."
                    )
                    stats["actualizados"] += 1

                except Exception as exc:
                    conn.rollback()
                    print(f"  [{idx:>4}/{total}] Error en exp. {num_exp}: {exc}")
                    stats["errores"] += 1
                    continue

        conn.commit()

    print("-" * 50)
    print("Sincronización completa:")
    print(f"  Procesados: {stats.get('actualizados', 0)}")
    print(f"  Errores:    {stats.get('errores', 0)}")
    print(f"  Total:      {total}")
    print("-" * 50)
    return stats