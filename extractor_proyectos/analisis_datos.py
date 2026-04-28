"""
analisis_datos.py
══════════════════════════════════════════════════════════════════════
Diagnóstico de calidad de datos de la BD.

NO modifica nada. Solo lee y reporta. Genera un Markdown con:
  - Conteos generales
  - % NULLs por columna
  - Distribuciones (tipo_expediente, estado_grupo, año)
  - Detección de variantes textuales (proponentes, órganos)
  - Posibles candidatos a normalización

Uso:
  python analisis_datos.py                     # imprime y guarda reporte
  python analisis_datos.py --output diag.md    # path custom
"""

import argparse
import os
import unicodedata
from collections import Counter
from datetime import datetime

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()


# ══════════════════════════════════════════════════════════════════════
# Conexión y helpers
# ══════════════════════════════════════════════════════════════════════

def get_conn():
    url = os.getenv("DATABASE_URL")
    if not url:
        raise EnvironmentError("DATABASE_URL no definida en el entorno.")
    return psycopg2.connect(url, sslmode="require")


def fetchall(cur, sql, params=()):
    cur.execute(sql, params)
    return cur.fetchall()


def fetchone(cur, sql, params=()):
    cur.execute(sql, params)
    return cur.fetchone()


def normalizar(s: str) -> str:
    """Lowercase + sin tildes + colapsa espacios. Para detectar duplicados de texto."""
    if not s:
        return ""
    nfkd = unicodedata.normalize("NFKD", s.lower())
    sin_tildes = "".join(c for c in nfkd if not unicodedata.combining(c))
    return " ".join(sin_tildes.split())


# ══════════════════════════════════════════════════════════════════════
# Bloques de análisis
# ══════════════════════════════════════════════════════════════════════

def conteos_generales(cur) -> dict:
    """Filas por tabla."""
    out = {}
    for tabla in ["proyectos", "proponentes", "tramitacion",
                  "categorias", "proyecto_categorias"]:
        try:
            row = fetchone(cur, f"SELECT COUNT(*) AS n FROM {tabla}")
            out[tabla] = row["n"]
        except Exception as e:
            out[tabla] = f"ERROR: {e}"
    return out


def proyectos_anomalos(cur) -> dict:
    """
    Lista los proyectos con datos sospechosos para revisión humana:
      - fecha_inicio futura (año > actual+1)
      - fecha_inicio NULL
      - titulo NULL o vacío
    Trae info completa para que el usuario decida qué hacer.
    """
    futuros = fetchall(cur, """
        SELECT id, numero_expediente, titulo, tipo_expediente,
               fecha_inicio, fecha_publicacion, numero_ley, estado_actual,
               estado_grupo, creado_en
        FROM proyectos
        WHERE fecha_inicio > (CURRENT_DATE + INTERVAL '1 year')
        ORDER BY fecha_inicio DESC
    """)

    sin_fecha = fetchall(cur, """
        SELECT id, numero_expediente, titulo, tipo_expediente,
               fecha_inicio, fecha_publicacion, numero_ley, estado_actual,
               estado_grupo, creado_en
        FROM proyectos
        WHERE fecha_inicio IS NULL
        ORDER BY numero_expediente
    """)

    sin_titulo = fetchall(cur, """
        SELECT id, numero_expediente, titulo, tipo_expediente,
               fecha_inicio, fecha_publicacion, numero_ley, estado_actual,
               estado_grupo, creado_en
        FROM proyectos
        WHERE titulo IS NULL OR titulo = ''
        ORDER BY numero_expediente
    """)

    return {
        "fechas_futuras": [dict(r) for r in futuros],
        "sin_fecha_inicio": [dict(r) for r in sin_fecha],
        "sin_titulo": [dict(r) for r in sin_titulo],
    }


def sin_proponentes_por_decada(cur) -> dict:
    """
    Distribución de proyectos sin proponentes por década.
    Si la mayoría son antiguos (<1980) → es comportamiento histórico del SIL.
    Si están concentrados en años recientes → posible falla del scraper.
    """
    rows = fetchall(cur, """
        SELECT
            CASE
                WHEN fecha_inicio IS NULL THEN 'sin fecha'
                ELSE (FLOOR(EXTRACT(YEAR FROM fecha_inicio) / 10) * 10)::text || 's'
            END AS decada,
            COUNT(*) AS n
        FROM proyectos p
        WHERE NOT EXISTS (SELECT 1 FROM proponentes WHERE proyecto_id = p.id)
        GROUP BY decada
        ORDER BY decada
    """)

    # Muestra de los más recientes sin proponentes (para detectar fallas)
    recientes = fetchall(cur, """
        SELECT id, numero_expediente, titulo, fecha_inicio,
               tipo_expediente, estado_grupo
        FROM proyectos p
        WHERE NOT EXISTS (SELECT 1 FROM proponentes WHERE proyecto_id = p.id)
          AND fecha_inicio >= CURRENT_DATE - INTERVAL '5 years'
        ORDER BY fecha_inicio DESC
        LIMIT 15
    """)

    return {
        "por_decada": [dict(r) for r in rows],
        "muestra_recientes": [dict(r) for r in recientes],
    }


def nulls_proyectos(cur) -> list[dict]:
    """% NULLs por columna en `proyectos`."""
    columnas = [
        "titulo", "tipo_expediente", "fecha_inicio", "vencimiento_cuatrienal",
        "fecha_publicacion", "numero_gaceta", "numero_ley",
        "estado_actual", "estado_grupo",
    ]
    total = fetchone(cur, "SELECT COUNT(*) AS n FROM proyectos")["n"] or 1
    out = []
    for col in columnas:
        nulos = fetchone(
            cur, f"SELECT COUNT(*) AS n FROM proyectos WHERE {col} IS NULL OR {col}::text = ''"
        )["n"]
        out.append({
            "columna": col,
            "nulos": nulos,
            "total": total,
            "pct": round(nulos * 100 / total, 1),
        })
    return out


def proyectos_huerfanos(cur) -> dict:
    """Proyectos sin proponentes / sin tramitación."""
    return {
        "sin_proponentes": fetchone(cur, """
            SELECT COUNT(*) AS n FROM proyectos p
            WHERE NOT EXISTS (SELECT 1 FROM proponentes WHERE proyecto_id = p.id)
        """)["n"],
        "sin_tramitacion": fetchone(cur, """
            SELECT COUNT(*) AS n FROM proyectos p
            WHERE NOT EXISTS (SELECT 1 FROM tramitacion WHERE proyecto_id = p.id)
        """)["n"],
        "sin_categoria": fetchone(cur, """
            SELECT COUNT(*) AS n FROM proyectos p
            WHERE NOT EXISTS (SELECT 1 FROM proyecto_categorias WHERE proyecto_id = p.id)
        """)["n"],
    }


def rango_fechas(cur) -> dict:
    """Rango de fechas en proyectos. Detecta valores raros."""
    row = fetchone(cur, """
        SELECT
            MIN(fecha_inicio) AS min_inicio,
            MAX(fecha_inicio) AS max_inicio,
            COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM fecha_inicio) < 1900) AS antes_1900,
            COUNT(*) FILTER (WHERE fecha_inicio > CURRENT_DATE) AS futuros,
            COUNT(*) FILTER (WHERE fecha_inicio IS NULL) AS sin_fecha
        FROM proyectos
    """)
    return dict(row) if row else {}


def distribucion(cur, columna: str, tabla: str = "proyectos", top: int = 20) -> list[dict]:
    """Top N valores distintos."""
    rows = fetchall(cur, f"""
        SELECT {columna} AS valor, COUNT(*) AS n
        FROM {tabla}
        WHERE {columna} IS NOT NULL AND {columna}::text <> ''
        GROUP BY {columna}
        ORDER BY n DESC
        LIMIT %s
    """, (top,))
    return [dict(r) for r in rows]


def proyectos_por_anio(cur) -> list[dict]:
    rows = fetchall(cur, """
        SELECT EXTRACT(YEAR FROM fecha_inicio)::int AS anio, COUNT(*) AS n
        FROM proyectos
        WHERE fecha_inicio IS NOT NULL
        GROUP BY anio
        ORDER BY anio DESC
        LIMIT 30
    """)
    return [dict(r) for r in rows]


def detectar_variantes_proponentes(cur) -> dict:
    """
    Agrupa proponentes por (apellidos+nombre) normalizado y reporta cuántas
    representaciones literales distintas tiene cada persona "real".
    Esto es el indicador clave de si vale la pena extraer una tabla `personas`.
    """
    rows = fetchall(cur, """
        SELECT apellidos, nombre, COUNT(*) AS firmas
        FROM proponentes
        WHERE apellidos IS NOT NULL OR nombre IS NOT NULL
        GROUP BY apellidos, nombre
    """)

    # Normalizar y agrupar
    grupos: dict[str, list[tuple[str, int]]] = {}
    for r in rows:
        clave = normalizar(f"{r['apellidos'] or ''}|{r['nombre'] or ''}")
        repr_literal = f"{(r['apellidos'] or '').strip()} | {(r['nombre'] or '').strip()}"
        grupos.setdefault(clave, []).append((repr_literal, r["firmas"]))

    personas_unicas = len(grupos)
    representaciones_literales = sum(len(v) for v in grupos.values())
    con_variantes = {k: v for k, v in grupos.items() if len(v) > 1}

    # Top 15 personas con más variantes
    top_variantes = sorted(
        con_variantes.items(),
        key=lambda kv: len(kv[1]),
        reverse=True,
    )[:15]

    return {
        "personas_unicas_normalizadas": personas_unicas,
        "representaciones_literales": representaciones_literales,
        "personas_con_variantes": len(con_variantes),
        "factor_duplicacion": round(
            representaciones_literales / personas_unicas, 2
        ) if personas_unicas else 0,
        "top_variantes": [
            {
                "n_variantes": len(variantes),
                "ejemplos": [v[0] for v in variantes[:5]],
                "firmas_totales": sum(v[1] for v in variantes),
            }
            for _, variantes in top_variantes
        ],
    }


def detectar_variantes_organos(cur) -> dict:
    """Mismo concepto pero para tramitacion.organo."""
    rows = fetchall(cur, """
        SELECT organo, COUNT(*) AS n
        FROM tramitacion
        WHERE organo IS NOT NULL AND organo <> ''
        GROUP BY organo
    """)

    grupos: dict[str, list[tuple[str, int]]] = {}
    for r in rows:
        clave = normalizar(r["organo"])
        grupos.setdefault(clave, []).append((r["organo"], r["n"]))

    organos_normalizados = len(grupos)
    organos_literales = sum(len(v) for v in grupos.values())
    con_variantes = {k: v for k, v in grupos.items() if len(v) > 1}
    top_variantes = sorted(
        con_variantes.items(),
        key=lambda kv: len(kv[1]),
        reverse=True,
    )[:10]

    return {
        "organos_normalizados": organos_normalizados,
        "organos_literales": organos_literales,
        "organos_con_variantes": len(con_variantes),
        "top_variantes": [
            {
                "n_variantes": len(variantes),
                "ejemplos": [v[0] for v in variantes[:5]],
                "ocurrencias": sum(v[1] for v in variantes),
            }
            for _, variantes in top_variantes
        ],
    }


def integridad_basica(cur) -> dict:
    """Cosas que no deberían poder pasar pero conviene verificar."""
    return {
        "expedientes_duplicados": fetchone(cur, """
            SELECT COUNT(*) AS n FROM (
                SELECT numero_expediente
                FROM proyectos
                GROUP BY numero_expediente
                HAVING COUNT(*) > 1
            ) sub
        """)["n"],
        "proponentes_huerfanos": fetchone(cur, """
            SELECT COUNT(*) AS n FROM proponentes pr
            WHERE NOT EXISTS (SELECT 1 FROM proyectos WHERE id = pr.proyecto_id)
        """)["n"],
        "tramitacion_huerfana": fetchone(cur, """
            SELECT COUNT(*) AS n FROM tramitacion t
            WHERE NOT EXISTS (SELECT 1 FROM proyectos WHERE id = t.proyecto_id)
        """)["n"],
        "numero_ley_sospechoso": fetchone(cur, """
            SELECT COUNT(*) AS n FROM proyectos
            WHERE numero_ley IN ('NO', 'no', 'N/A', '-', '')
        """)["n"],
    }


# ══════════════════════════════════════════════════════════════════════
# Render de reporte Markdown
# ══════════════════════════════════════════════════════════════════════

def fmt_kv(d: dict) -> str:
    return "\n".join(f"- **{k}**: {v}" for k, v in d.items())


def fmt_tabla(rows: list[dict], cols: list[str]) -> str:
    if not rows:
        return "_(sin datos)_"
    header = "| " + " | ".join(cols) + " |"
    sep = "| " + " | ".join("---" for _ in cols) + " |"
    body = "\n".join(
        "| " + " | ".join(str(r.get(c, "")) for c in cols) + " |"
        for r in rows
    )
    return f"{header}\n{sep}\n{body}"


def render_reporte(data: dict) -> str:
    P = []
    P.append(f"# Diagnóstico de datos — Asamblea Legislativa")
    P.append(f"_Generado: {data['generado']}_")
    P.append("")
    P.append("> Reporte de **solo lectura**. No se modificó ningún dato.")
    P.append("")

    P.append("## 1. Conteos generales")
    P.append(fmt_kv(data["conteos"]))
    P.append("")

    P.append("## 2. NULLs por columna en `proyectos`")
    P.append(fmt_tabla(data["nulls"], ["columna", "nulos", "total", "pct"]))
    P.append("")

    P.append("## 3. Proyectos sin datos relacionados")
    P.append(fmt_kv(data["huerfanos"]))
    P.append("")

    P.append("## 4. Rango de fechas en `proyectos`")
    P.append(fmt_kv(data["fechas"]))
    P.append("")

    P.append("## 5. Distribuciones")
    P.append("### Tipo de expediente")
    P.append(fmt_tabla(data["dist_tipo"], ["valor", "n"]))
    P.append("")
    P.append("### Estado (grupo)")
    P.append(fmt_tabla(data["dist_estado"], ["valor", "n"]))
    P.append("")
    P.append("### Proyectos por año (últimos 30)")
    P.append(fmt_tabla(data["por_anio"], ["anio", "n"]))
    P.append("")

    P.append("## 6. Variantes textuales — `proponentes`")
    pr = data["variantes_prop"]
    P.append(fmt_kv({k: v for k, v in pr.items() if k != "top_variantes"}))
    P.append("")
    P.append("**Top personas con más variantes literales:**")
    P.append("")
    for v in pr["top_variantes"]:
        P.append(f"- **{v['n_variantes']} variantes**, {v['firmas_totales']} firmas — ej: {v['ejemplos']}")
    P.append("")
    P.append(
        "> Si `factor_duplicacion` > 1.05 o hay muchas personas con variantes, "
        "extraer una tabla `personas` aporta valor (métricas reales por persona)."
    )
    P.append("")

    P.append("## 7. Variantes textuales — `tramitacion.organo`")
    org = data["variantes_org"]
    P.append(fmt_kv({k: v for k, v in org.items() if k != "top_variantes"}))
    P.append("")
    P.append("**Top órganos con más variantes:**")
    P.append("")
    for v in org["top_variantes"]:
        P.append(f"- **{v['n_variantes']} variantes**, {v['ocurrencias']} ocurrencias — ej: {v['ejemplos']}")
    P.append("")

    P.append("## 8. Integridad básica")
    P.append(fmt_kv(data["integridad"]))
    P.append("")

    P.append("## 9. Proyectos anómalos (para revisión humana)")
    P.append("")
    anom = data["anomalos"]

    P.append(f"### 9.1 Fechas futuras (año > actual+1) — {len(anom['fechas_futuras'])} proyecto(s)")
    if anom["fechas_futuras"]:
        P.append(fmt_tabla(anom["fechas_futuras"], [
            "numero_expediente", "fecha_inicio", "fecha_publicacion",
            "numero_ley", "tipo_expediente", "estado_grupo", "titulo",
        ]))
    else:
        P.append("_(ninguno)_")
    P.append("")

    P.append(f"### 9.2 Sin fecha_inicio — {len(anom['sin_fecha_inicio'])} proyecto(s)")
    if anom["sin_fecha_inicio"]:
        P.append(fmt_tabla(anom["sin_fecha_inicio"], [
            "numero_expediente", "fecha_publicacion", "numero_ley",
            "tipo_expediente", "estado_grupo", "creado_en", "titulo",
        ]))
    else:
        P.append("_(ninguno)_")
    P.append("")

    P.append(f"### 9.3 Sin título — {len(anom['sin_titulo'])} proyecto(s)")
    if anom["sin_titulo"]:
        P.append(fmt_tabla(anom["sin_titulo"], [
            "numero_expediente", "fecha_inicio", "tipo_expediente",
            "estado_grupo", "numero_ley", "creado_en",
        ]))
    else:
        P.append("_(ninguno)_")
    P.append("")

    P.append("## 10. Proyectos sin proponentes — diagnóstico")
    sp = data["sin_prop"]
    P.append("")
    P.append("### Distribución por década")
    P.append(fmt_tabla(sp["por_decada"], ["decada", "n"]))
    P.append("")
    P.append(
        "> Si la mayoría son anteriores a los 80s → comportamiento histórico "
        "del SIL (no registraban firmantes en proyectos viejos). Si están "
        "concentrados en años recientes → posible falla del scraper."
    )
    P.append("")
    P.append(f"### Muestra de los últimos 5 años sin proponentes ({len(sp['muestra_recientes'])} mostrados)")
    if sp["muestra_recientes"]:
        P.append(fmt_tabla(sp["muestra_recientes"], [
            "numero_expediente", "fecha_inicio", "tipo_expediente",
            "estado_grupo", "titulo",
        ]))
    else:
        P.append("_(ninguno reciente — bien, es histórico)_")
    P.append("")

    P.append("---")
    P.append("## Lectura sugerida")
    P.append("")
    P.append(
        "1. **Si hay muchas variantes en proponentes** → tabla `personas` "
        "con FK desde `proponentes`. La tabla original queda intacta como "
        "registro literal de lo que vino del SIL.\n"
        "2. **Si `tipo_expediente` tiene <20 valores distintos** → catálogo "
        "trivial.\n"
        "3. **Si órganos tienen muchas variantes** → catálogo `organos` "
        "con FK opcional.\n"
        "4. **NULLs altos en una columna** → revisar si el scraper la "
        "captura bien o si la página realmente no la trae."
    )

    return "\n".join(P)


# ══════════════════════════════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="Diagnóstico de calidad de datos.")
    parser.add_argument(
        "--output", default="diagnostico_datos.md",
        help="Ruta del archivo Markdown a generar (default: diagnostico_datos.md)",
    )
    args = parser.parse_args()

    print("Conectando a la base de datos...")
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            print("Recolectando métricas...")
            data = {
                "generado": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "conteos":   conteos_generales(cur),
                "nulls":     nulls_proyectos(cur),
                "huerfanos": proyectos_huerfanos(cur),
                "fechas":    rango_fechas(cur),
                "dist_tipo":   distribucion(cur, "tipo_expediente"),
                "dist_estado": distribucion(cur, "estado_grupo"),
                "por_anio":    proyectos_por_anio(cur),
                "variantes_prop": detectar_variantes_proponentes(cur),
                "variantes_org":  detectar_variantes_organos(cur),
                "integridad":     integridad_basica(cur),
                "anomalos":       proyectos_anomalos(cur),
                "sin_prop":       sin_proponentes_por_decada(cur),
            }

    md = render_reporte(data)
    with open(args.output, "w", encoding="utf-8") as f:
        f.write(md)

    print(f"\nReporte guardado: {args.output}")
    print("─" * 55)
    # Resumen rápido en consola
    print(f"Proyectos:                  {data['conteos'].get('proyectos')}")
    print(f"Proponentes:                {data['conteos'].get('proponentes')}")
    print(f"  · personas únicas (norm): {data['variantes_prop']['personas_unicas_normalizadas']}")
    print(f"  · con variantes:          {data['variantes_prop']['personas_con_variantes']}")
    print(f"  · factor duplicación:     {data['variantes_prop']['factor_duplicacion']}")
    print(f"Órganos únicos (norm):      {data['variantes_org']['organos_normalizados']}")
    print(f"  · con variantes:          {data['variantes_org']['organos_con_variantes']}")
    print("─" * 55)
    print(f"Anómalos — fechas futuras:  {len(data['anomalos']['fechas_futuras'])}")
    print(f"Anómalos — sin fecha:       {len(data['anomalos']['sin_fecha_inicio'])}")
    print(f"Anómalos — sin título:      {len(data['anomalos']['sin_titulo'])}")
    print("─" * 55)


if __name__ == "__main__":
    main()
