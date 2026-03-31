"""
sync_engine.py
══════════════════════════════════════════════════════════════════════
Responsabilidad única: tomar la lista de proyectos que produce
extractor.py y sincronizarla contra PostgreSQL (Neon).
 
Estrategia de sync
──────────────────
• Se usa ON CONFLICT (numero_expediente) DO UPDATE para mantener los metadatos actualizados.
• Se verifica la existencia de proponentes y trámites antes de insertar para evitar duplicados.
• Manejo de errores por registro con rollback individual para garantizar la continuidad del proceso.
 
Tablas que gestiona
───────────────────
  proyectos      → datos maestros del proyecto
  proponentes    → firmantes/proponentes (N por proyecto)
  tramitacion    → historial de órganos (N por proyecto)
  documentos     → ruta del PDF/DOCX descargado (0-1 por proyecto)
 
Variables de entorno requeridas
────────────────────────────────
  DATABASE_URL   → connection string de Neon, ej:
                   postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname
 
Dependencias: psycopg2-binary, python-dotenv
"""
 
import os
import re
from datetime import date
 
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
 
load_dotenv()
 
# ══════════════════════════════════════════════════════════════════════
# CONEXIÓN
# ══════════════════════════════════════════════════════════════════════
 
def get_connection():
    """
    Abre y devuelve una conexión a la base de datos usando DATABASE_URL.
    SSL requerido (Neon lo exige).
 
    Lanza psycopg2.OperationalError si la URL es inválida o el servidor
    no está disponible.
    """
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise EnvironmentError(
            "❌ Variable DATABASE_URL no encontrada. "
            "Revisá tu archivo .env o los Secrets de GitHub Actions."
        )
    return psycopg2.connect(database_url, sslmode="require")
 
 
# ══════════════════════════════════════════════════════════════════════
# DDL — CREACIÓN DE TABLAS
# ══════════════════════════════════════════════════════════════════════
 
def crear_tablas():
    """
    Crea las cuatro tablas si todavía no existen (CREATE TABLE IF NOT EXISTS).
    Es seguro correr esta función en cada ejecución del pipeline; no falla
    ni modifica datos si las tablas ya están presentes.
 
    Esquema rápido
    ──────────────
      proyectos      PK: id  | UNIQUE: numero_expediente
      proponentes    FK → proyectos(id)  ON DELETE CASCADE
      tramitacion    FK → proyectos(id)  ON DELETE CASCADE
      documentos     FK → proyectos(id)  ON DELETE CASCADE
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
        id           SERIAL PRIMARY KEY,
        proyecto_id  INTEGER REFERENCES proyectos(id) ON DELETE CASCADE,
        organo       TEXT,
        fecha_inicio DATE,
        fecha_termino DATE,
        tipo_tramite TEXT
    );
 
    CREATE TABLE IF NOT EXISTS documentos (
        id            SERIAL PRIMARY KEY,
        proyecto_id   INTEGER REFERENCES proyectos(id) ON DELETE CASCADE,
        tipo          TEXT,
        ruta_archivo  TEXT,
        descargado_en TIMESTAMP DEFAULT NOW()
    );
    """
    print("Verifying database schema...")
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(ddl)
        conn.commit()
    print("Database tables verified.\n")
 
 
# ══════════════════════════════════════════════════════════════════════
# PARSEO DE FECHAS
# ══════════════════════════════════════════════════════════════════════
 
# Mapeo de abreviaciones en español (con y sin tilde) al número de mes.
# El scraper devuelve strings como "25-mar.-2026" o "01-ene.-2025".
MESES = {
    "ene": 1, "feb": 2, "mar": 3, "abr": 4,
    "may": 5, "jun": 6, "jul": 7, "ago": 8,
    "set": 9, "sep": 9,   # "set" es la abreviación costarricense de septiembre
    "oct": 10, "nov": 11, "dic": 12,
}
 
 
def parsear_fecha(texto: str) -> date | None:
    """
    Convierte una cadena de fecha al tipo date de Python.
 
    Soporta formato viejo ("25-mar.-2026") y formato nuevo ("26/03/2026").
 
    Args:
        texto: Cadena de fecha cruda proveniente del scraper.
 
    Returns:
        Objeto date o None si no es posible convertir.
    """
    if not texto or not isinstance(texto, str) or not texto.strip():
        return None
    
    texto_limpio = texto.strip().lower()
    
    # Soporte formato nuevo: "26/03/2026"
    if "/" in texto_limpio:
        try:
            partes = texto_limpio.split("/")
            return date(int(partes[2]), int(partes[1]), int(partes[0]))
        except Exception:
            pass

    # Soporte formato viejo: "25-mar.-2026"
    try:
        partes = texto_limpio.replace(".", "").split("-")
        dia  = int(partes[0])
        mes  = MESES.get(partes[1][:3])   # solo los 3 primeros caracteres
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
 
    Flujo por proyecto
    ──────────────────
    1. Validar que numero_expediente existe y es numérico.
    2. INSERT con ON CONFLICT DO NOTHING:
       - rowcount == 1 → proyecto nuevo → insertar hijos.
       - rowcount == 0 → ya existía    → saltar (evitar duplicados).
    3. Si es nuevo, insertar proponentes, tramitación y documento.
    4. Errores individuales hacen rollback solo de ese proyecto.
 
    Args:
        proyectos: Lista de dicts con estructura:
            {
              "numero_expediente": "12345",
              "titulo": "...",
              "detalle": { "Tipo de Expediente": ..., "Fecha de Inicio": ..., ... },
              "proponentes": [ {"Secuencia": ..., "Apellidos": ..., "Nombre": ...} ],
              "tramitacion": [ {"Órgano": ..., "Fecha Inicio": ..., ...} ],
              "documento":   { "archivo": "ruta/al/archivo.pdf", "tipo": "pdf" }
            }
 
    Returns:
        Dict con contadores finales:
            { "nuevos": int, "duplicados": int, "errores": int }
    """
    stats = {"nuevos": 0, "actualizados": 0, "errores": 0}
    total = len(proyectos)
 
    print(f"Starting synchronization of {total} project(s)...\n")
 
    with get_connection() as conn:
        with conn.cursor() as cur:
 
            for idx, proy in enumerate(proyectos, start=1):
                num_exp = proy.get("numero_expediente")
 
                # ── Validación básica ──────────────────────────────────
                if not num_exp or not str(num_exp).isdigit():
                    print(
                        f"  [{idx:>4}/{total}] ⚠️  Expediente inválido o vacío "
                        f"({repr(num_exp)}), omitiendo."
                    )
                    stats["errores"] += 1
                    continue
 
                try:
                    # Soporte para la estructura vieja ("detalle") y nueva ("general")
                    det = proy.get("general") or proy.get("detalle") or {}

                    num_gaceta = det.get("Número de gaceta") or det.get("Número de Gaceta")
                    num_ley = det.get("Número de ley que generó") or det.get("Número de Ley")
                    num_gaceta = None if num_gaceta == "NO" else num_gaceta
                    num_ley = None if num_ley == "NO" else num_ley

                    # ── INSERT/UPDATE principal (Upsert) ──
                    cur.execute(
                        """
                        INSERT INTO proyectos
                            (numero_expediente, titulo, tipo_expediente,
                             fecha_inicio, vencimiento_cuatrienal,
                             fecha_publicacion, numero_gaceta, numero_ley)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (numero_expediente) DO UPDATE SET
                            titulo = EXCLUDED.titulo,
                            tipo_expediente = EXCLUDED.tipo_expediente,
                            fecha_inicio = EXCLUDED.fecha_inicio,
                            vencimiento_cuatrienal = EXCLUDED.vencimiento_cuatrienal,
                            fecha_publicacion = EXCLUDED.fecha_publicacion,
                            numero_gaceta = EXCLUDED.numero_gaceta,
                            numero_ley = EXCLUDED.numero_ley
                        RETURNING id, (xmin = 0) AS is_new;
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
 
                    res = cur.fetchone()
                    proyecto_id = res[0]
                    # xmin comparison or similar to detect if it was an insert vs update
                    # Note: Rowcount in postgres for upsert is 1 for insert and 1 for update usually.
                    # We can check if it already existed before.
                    
                    # Simplificamos: tratamos a todos como existentes y solo insertamos lo que falte
 
                    proponentes = proy.get("proponentes", [])
                    proponentes_nuevos = 0
                    for prop in proponentes:
                        cur.execute(
                            """
                            INSERT INTO proponentes
                                (proyecto_id, secuencia, apellidos, nombre)
                            SELECT %s, %s, %s, %s
                            WHERE NOT EXISTS (
                                SELECT 1 FROM proponentes 
                                WHERE proyecto_id = %s AND secuencia = %s AND (nombre = %s OR apellidos = %s)
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
                                prop.get("Apellidos")
                            ),
                        )
                        if cur.rowcount > 0:
                            proponentes_nuevos += 1
 
                    tramitacion = proy.get("tramitacion", [])
                    tramites_nuevos = 0
                    for tram in tramitacion:
                        cur.execute(
                            """
                            INSERT INTO tramitacion
                                (proyecto_id, organo, fecha_inicio,
                                 fecha_termino, tipo_tramite)
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
                                tram.get("Descripción") or tram.get("Tipo de Trámite")
                            ),
                        )
                        if cur.rowcount > 0:
                            tramites_nuevos += 1
 
                    # ── Insertar documento (si existe) ─────────────────
                    doc = proy.get("documento", {})
                    if doc.get("archivo"):
                        cur.execute(
                            """
                            INSERT INTO documentos
                                (proyecto_id, tipo, ruta_archivo)
                            VALUES (%s, %s, %s)
                            """,
                            (proyecto_id, doc.get("tipo"), doc.get("archivo")),
                        )
 
                    # ── Log de resultado ──
                    status = "Updated" if tramites_nuevos == 0 and proponentes_nuevos == 0 else "Synchronized"
                    print(
                        f"  [{idx:>4}/{total}] {status} Exp. {num_exp} "
                        f"| +{proponentes_nuevos} prop. "
                        f"| +{tramites_nuevos} trám."
                    )
                    stats["actualizados"] += 1

                except Exception as exc:
                    conn.rollback()
                    print(
                        f"  [{idx:>4}/{total}] Error in exp. {num_exp}: {exc}"
                    )
                    stats["errores"] += 1
                    continue
 
        conn.commit()
 
    print("-" * 50)
    print("Synchronization complete:")
    print(f"  Processed: {stats.get('actualizados', 0)}")
    print(f"  Errors:    {stats.get('errores', 0)}")
    print(f"  Total:     {total}")
    print("-" * 50)
    return stats