"""
sync_engine.py
══════════════════════════════════════════════════════════════════════
Responsabilidad única: tomar la lista de proyectos que produce
extractor.py y sincronizarla contra PostgreSQL (Neon).
 
Estrategia de sync
──────────────────
• Se usa ON CONFLICT (numero_expediente) DO NOTHING → inserción idempotente.
• Si el expediente ya existe NO se tocan proponentes ni tramitación
  (evitar duplicados en tablas sin UNIQUE constraint).
• Un error en un proyecto hace ROLLBACK solo de ese registro y continúa
  con los demás (conn.rollback + continue).
 
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
    print("🗄️  Verificando esquema de base de datos...")
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(ddl)
        conn.commit()
    print("✅ Tablas verificadas/creadas correctamente.\n")
 
 
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
    Convierte una cadena con formato costarricense al tipo date de Python.
 
    Ejemplo de entrada → salida:
        "25-mar.-2026"  →  date(2026, 3, 25)
        "01-ene.-2025"  →  date(2025, 1,  1)
        ""              →  None
        "N/A"           →  None
 
    Proceso:
        1. Normaliza a minúsculas y elimina los puntos de la abreviación.
        2. Divide por "-" y toma día, mes (3 primeras letras) y año.
        3. Busca el mes en el diccionario MESES.
        4. Devuelve None en cualquier error de parseo.
 
    Args:
        texto: Cadena de fecha cruda proveniente del scraper.
 
    Returns:
        Objeto date o None si no es posible convertir.
    """
    if not texto or not texto.strip():
        return None
    try:
        # Elimina puntos de abreviación, convierte a minúsculas y parte por "-"
        partes = texto.strip().lower().replace(".", "").split("-")
        dia  = int(partes[0])
        mes  = MESES.get(partes[1][:3])   # solo los 3 primeros caracteres
        anio = int(partes[2])
        if mes:
            return date(anio, mes, dia)
    except Exception:
        # Silencioso: el caller puede loguear el texto original si lo necesita
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
    stats = {"nuevos": 0, "duplicados": 0, "errores": 0}
    total = len(proyectos)
 
    print(f"🔄 Iniciando sync de {total} proyecto(s)...\n")
 
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
                    det = proy.get("detalle", {})
 
                    # ── INSERT principal (idempotente) ─────────────────
                    cur.execute(
                        """
                        INSERT INTO proyectos
                            (numero_expediente, titulo, tipo_expediente,
                             fecha_inicio, vencimiento_cuatrienal,
                             fecha_publicacion, numero_gaceta, numero_ley)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (numero_expediente) DO NOTHING
                        """,
                        (
                            int(num_exp),
                            proy.get("titulo"),
                            det.get("Tipo de Expediente"),
                            parsear_fecha(det.get("Fecha de Inicio", "")),
                            parsear_fecha(det.get("Vencimiento Cuatrienal", "")),
                            parsear_fecha(det.get("Fecha de Publicación", "")),
                            det.get("Número de Gaceta") or None,
                            det.get("Número de Ley") or None,
                        ),
                    )
 
                    # ── ¿Era duplicado? ────────────────────────────────
                    if cur.rowcount == 0:
                        print(
                            f"  [{idx:>4}/{total}] ⏭️  Exp. {num_exp} ya existe, omitiendo."
                        )
                        stats["duplicados"] += 1
                        continue
 
                    # ── Proyecto nuevo: obtener su id ──────────────────
                    cur.execute(
                        "SELECT id FROM proyectos WHERE numero_expediente = %s",
                        (int(num_exp),),
                    )
                    proyecto_id = cur.fetchone()[0]
 
                    # ── Insertar proponentes ───────────────────────────
                    proponentes = proy.get("proponentes", [])
                    for prop in proponentes:
                        cur.execute(
                            """
                            INSERT INTO proponentes
                                (proyecto_id, secuencia, apellidos, nombre)
                            VALUES (%s, %s, %s, %s)
                            """,
                            (
                                proyecto_id,
                                int(prop.get("Secuencia", 0) or 0),
                                prop.get("Apellidos"),
                                prop.get("Nombre"),
                            ),
                        )
 
                    # ── Insertar tramitación ───────────────────────────
                    tramitacion = proy.get("tramitacion", [])
                    for tram in tramitacion:
                        cur.execute(
                            """
                            INSERT INTO tramitacion
                                (proyecto_id, organo, fecha_inicio,
                                 fecha_termino, tipo_tramite)
                            VALUES (%s, %s, %s, %s, %s)
                            """,
                            (
                                proyecto_id,
                                tram.get("Órgano"),
                                parsear_fecha(tram.get("Fecha Inicio", "")),
                                parsear_fecha(tram.get("Fecha Término", "")),
                                tram.get("Tipo de Trámite"),
                            ),
                        )
 
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
 
                    # ── Log de éxito ───────────────────────────────────
                    doc_label = doc.get("tipo", "sin doc") if doc.get("archivo") else "sin doc"
                    print(
                        f"  [{idx:>4}/{total}] ✅ Exp. {num_exp} insertado "
                        f"| {len(proponentes)} prop. "
                        f"| {len(tramitacion)} trám. "
                        f"| doc: {doc_label}"
                    )
                    stats["nuevos"] += 1
 
                except Exception as exc:
                    # ROLLBACK solo de este proyecto; el loop continúa
                    conn.rollback()
                    print(
                        f"  [{idx:>4}/{total}] ❌ Error en exp. {num_exp}: {exc}"
                    )
                    stats["errores"] += 1
                    continue
 
        conn.commit()
 
    # ── Resumen final ──────────────────────────────────────────────────
    print(
        f"\n{'─'*50}\n"
        f"  Sync completado:\n"
        f"    ✅ Nuevos      : {stats['nuevos']}\n"
        f"    ⏭️  Duplicados  : {stats['duplicados']}\n"
        f"    ❌ Errores     : {stats['errores']}\n"
        f"    📦 Total       : {total}\n"
        f"{'─'*50}"
    )
    return stats