"""
routers/metricas.py
──────────────────────────────────────────────────────────────────────
Endpoint de métricas ciudadanas: estadísticas que cualquier persona
puede entender sobre lo que ocurre en la Asamblea Legislativa.

Endpoint
────────
  GET /api/v1/metricas   → resumen completo con 5 bloques de datos
"""

import json
import time
from datetime import date
from collections import OrderedDict
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from database import fetchall, fetchone, fetchval
from constants import MESES_ES
from models import (
    MetricasResponse,
    MetricaGeneral,
    ProyectosPorTipo,
    ProyectosPorMes,
    DiputadoRanking,
    OrganoActividad,
    ProyectosPorCategoria,
    DiputadoEficacia,
    MetricasPartidosResponse,
    MetricasPartidosResumenResponse,
    EstadisticaPartido,
    PerfilPartidoResponse,
    DiputadoPartidoItem,
    PeriodoPartido,
    CategoriaPartido,
)

router = APIRouter()

# Caché LRU con tope de tamaño y TTL por entrada — clave inequívoca (JSON).
_cache_metricas: "OrderedDict[str, dict]" = OrderedDict()
CACHE_TTL = 300       # 5 min
CACHE_MAX_SIZE = 64   # máximo de entradas distintas


def _cache_get(key: str):
    entry = _cache_metricas.get(key)
    if entry and (time.time() - entry["time"] < CACHE_TTL):
        _cache_metricas.move_to_end(key)
        return entry["data"]
    if entry:
        _cache_metricas.pop(key, None)
    return None


def _cache_set(key: str, data) -> None:
    _cache_metricas[key] = {"time": time.time(), "data": data}
    _cache_metricas.move_to_end(key)
    while len(_cache_metricas) > CACHE_MAX_SIZE:
        _cache_metricas.popitem(last=False)


def _validar_rango_fechas(desde: date | None, hasta: date | None) -> None:
    if desde and hasta and desde > hasta:
        raise HTTPException(422, "El parámetro 'desde' debe ser anterior o igual a 'hasta'.")


@router.get("/metricas", response_model=MetricasResponse, summary="Métricas ciudadanas")
def metricas(
    desde: Optional[date] = Query(None),
    hasta: Optional[date] = Query(None),
):
    _validar_rango_fechas(desde, hasta)

    cache_key = json.dumps(
        {"d": desde.isoformat() if desde else None,
         "h": hasta.isoformat() if hasta else None},
        sort_keys=True,
    )
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    
    # Construir WHERE para el rango de fechas
    condiciones = ["fecha_inicio IS NOT NULL"]
    params = []
    if desde:
        condiciones.append("fecha_inicio >= %s")
        params.append(desde)
    if hasta:
        condiciones.append("fecha_inicio <= %s")
        params.append(hasta)

    where = "WHERE " + " AND ".join(condiciones)

    # ── 1. Métricas generales ─────────────────────────────────────────
    # `total_proyectos` se cuenta sin filtrar `fecha_inicio IS NOT NULL`
    # cuando no hay rango de fechas, para que coincida con el total del
    # listado /proyectos (que tampoco filtra). Cuando sí hay rango, los
    # filtros de fecha ya descartan NULLs.
    where_total = (
        "WHERE " + " AND ".join(c for c in condiciones if c != "fecha_inicio IS NOT NULL")
        if any(c != "fecha_inicio IS NOT NULL" for c in condiciones)
        else ""
    )
    total = fetchval(
        f"SELECT COUNT(*) FROM proyectos {where_total}",
        tuple(params),
    ) or 0

    gen = fetchone(f"""
        SELECT
            COUNT(*) FILTER (WHERE numero_ley IS NOT NULL)  AS total_leyes_aprobadas,
            COUNT(*) FILTER (
                WHERE DATE_TRUNC('month', fecha_inicio) = DATE_TRUNC('month', NOW())
            )                                               AS proyectos_este_mes,
            COUNT(*) FILTER (
                WHERE DATE_TRUNC('year', fecha_inicio) = DATE_TRUNC('year', NOW())
            )                                               AS proyectos_este_anio
        FROM proyectos
        {where}
    """, tuple(params)) or {}

    total_leyes     = gen.get("total_leyes_aprobadas") or 0
    tasa_aprobacion = round((total_leyes / total * 100), 1) if total else 0.0

    diputados_activos = fetchval(f"""
        SELECT COUNT(DISTINCT CONCAT(pr.apellidos, pr.nombre)) 
        FROM proponentes pr
        JOIN proyectos p ON p.id = pr.proyecto_id
        {where.replace('fecha_inicio', 'p.fecha_inicio')}
        AND UPPER(COALESCE(pr.nombre, '')) != 'PODER EJECUTIVO'
        AND UPPER(COALESCE(pr.apellidos, '')) != 'PODER EJECUTIVO'
    """, tuple(params)) or 0

    avg_tramites = fetchval(f"""
        SELECT ROUND(AVG(cnt)::numeric, 1)
        FROM (
            SELECT COUNT(*) AS cnt 
            FROM tramitacion tr
            JOIN proyectos p ON p.id = tr.proyecto_id
            {where.replace('fecha_inicio', 'p.fecha_inicio')}
            GROUP BY tr.proyecto_id
        ) sub
    """, tuple(params)) or 0.0
    
    dias_aprobacion = fetchval(f"""
        SELECT ROUND(AVG(fecha_publicacion - fecha_inicio))
        FROM proyectos p
        {where.replace('fecha_inicio', 'p.fecha_inicio')}
        AND numero_ley IS NOT NULL AND fecha_publicacion >= fecha_inicio
    """, tuple(params)) or 0
    
    general = MetricaGeneral(
        total_proyectos=total,
        total_leyes_aprobadas=total_leyes,
        tasa_aprobacion_pct=tasa_aprobacion,
        total_diputados_activos=int(diputados_activos),
        proyectos_este_mes=gen.get("proyectos_este_mes") or 0,
        proyectos_este_anio=gen.get("proyectos_este_anio") or 0,
        promedio_tramites=float(avg_tramites),
        promedio_dias_aprobacion=int(dias_aprobacion),
    )

    # ── 2. Por tipo de expediente ─────────────────────────────────────
    tipo_rows = fetchall(f"""
        SELECT
            COALESCE(tipo_expediente, 'Sin clasificar') AS tipo,
            COUNT(*) AS total
        FROM proyectos
        {where}
        GROUP BY tipo_expediente
        ORDER BY total DESC
        LIMIT 10
    """, tuple(params))

    por_tipo = [
        ProyectosPorTipo(
            tipo=r["tipo"],
            total=r["total"],
            porcentaje=round(r["total"] / total * 100, 1) if total else 0.0,
        )
        for r in tipo_rows
    ]

    # ── 3. Por mes (últimos 12 meses o según rango) ────────────────────
    sql_mes_where = where
    if not (desde or hasta):
        sql_mes_where = "WHERE fecha_inicio >= NOW() - INTERVAL '12 months'"
    
    mes_rows = fetchall(f"""
        SELECT
            EXTRACT(YEAR  FROM fecha_inicio)::int AS anio,
            EXTRACT(MONTH FROM fecha_inicio)::int AS mes,
            COUNT(*) AS total
        FROM proyectos
        {sql_mes_where}
        GROUP BY anio, mes
        ORDER BY anio, mes
    """, tuple(params) if (desde or hasta) else ())

    por_mes = [
        ProyectosPorMes(
            anio=r["anio"],
            mes=r["mes"],
            mes_nombre=MESES_ES.get(r["mes"], str(r["mes"])),
            total=r["total"],
        )
        for r in mes_rows
    ]

    # ── 4. Top 10 diputados más activos ───────────────────────────────
    diputado_rows = fetchall(f"""
        SELECT
            pr.apellidos,
            pr.nombre,
            COUNT(DISTINCT pr.proyecto_id) AS total_proyectos
        FROM proponentes pr
        JOIN proyectos p ON p.id = pr.proyecto_id
        {where.replace('fecha_inicio', 'p.fecha_inicio')}
        AND (pr.apellidos IS NOT NULL OR pr.nombre IS NOT NULL)
        AND UPPER(COALESCE(pr.nombre, '')) != 'PODER EJECUTIVO'
        AND UPPER(COALESCE(pr.apellidos, '')) != 'PODER EJECUTIVO'
        GROUP BY pr.apellidos, pr.nombre
        ORDER BY total_proyectos DESC
        LIMIT 10
    """, tuple(params))

    top_diputados = [
        DiputadoRanking(
            apellidos=r["apellidos"] or "",
            nombre=r["nombre"] or "",
            nombre_completo=(f"{r['apellidos'] or ''} {r['nombre'] or ''}").strip(),
            total_proyectos=r["total_proyectos"],
        )
        for r in diputado_rows
    ]

    # ── 5. Órganos más activos ────────────────────────────────────────
    organo_rows = fetchall(f"""
        SELECT
            tr.organo,
            COUNT(*) AS total_tramites
        FROM tramitacion tr
        JOIN proyectos p ON p.id = tr.proyecto_id
        {where.replace('fecha_inicio', 'p.fecha_inicio')}
        AND tr.organo IS NOT NULL
        GROUP BY tr.organo
        ORDER BY total_tramites DESC
        LIMIT 10
    """, tuple(params))

    organos_activos = [
        OrganoActividad(
            organo=r["organo"],
            total_tramites=r["total_tramites"],
        )
        for r in organo_rows
    ]

    # ── 6. Por Categoría / Tema ───────────────────────────────────────
    cat_rows = fetchall(f"""
        SELECT
            c.slug,
            c.nombre as categoria,
            COUNT(pc.proyecto_id) AS total,
            COUNT(CASE WHEN p.numero_ley IS NOT NULL THEN 1 END) AS leyes_aprobadas
        FROM categorias c
        JOIN proyecto_categorias pc ON pc.categoria_id = c.id
        JOIN proyectos p ON p.id = pc.proyecto_id
        {where.replace('fecha_inicio', 'p.fecha_inicio')}
        GROUP BY c.slug, c.nombre, c.orden
        ORDER BY total DESC, c.orden ASC
        LIMIT 15
    """, tuple(params))

    por_categoria = [
        ProyectosPorCategoria(
            slug=r["slug"],
            categoria=r["categoria"],
            total=r["total"],
            porcentaje=round((r["total"] / total * 100) if total else 0.0, 1),
            leyes_aprobadas=r.get("leyes_aprobadas", 0),
            tasa_aprobacion=round((r.get("leyes_aprobadas", 0) / r["total"] * 100) if r["total"] else 0.0, 1)
        )
        for r in cat_rows
    ]

    # ── 4.5. Top 10 diputados por eficacia (Leyes / Proyectos) ─────────
    diputado_eficacia_rows = fetchall(f"""
        SELECT
            pr.apellidos,
            pr.nombre,
            COUNT(DISTINCT pr.proyecto_id) AS total_proyectos,
            COUNT(DISTINCT CASE WHEN p.numero_ley IS NOT NULL THEN pr.proyecto_id END) AS leyes_aprobadas
        FROM proponentes pr
        JOIN proyectos p ON p.id = pr.proyecto_id
        {where.replace('fecha_inicio', 'p.fecha_inicio')}
        AND (pr.apellidos IS NOT NULL OR pr.nombre IS NOT NULL)
        AND UPPER(COALESCE(pr.nombre, '')) != 'PODER EJECUTIVO'
        AND UPPER(COALESCE(pr.apellidos, '')) != 'PODER EJECUTIVO'
        GROUP BY pr.apellidos, pr.nombre
        HAVING COUNT(DISTINCT pr.proyecto_id) >= 5
        ORDER BY (COUNT(DISTINCT CASE WHEN p.numero_ley IS NOT NULL THEN pr.proyecto_id END)::float / NULLIF(COUNT(DISTINCT pr.proyecto_id), 0)) DESC, total_proyectos DESC
        LIMIT 10
    """, tuple(params))

    top_diputados_eficacia = [
        DiputadoEficacia(
            apellidos=r["apellidos"] or "",
            nombre=r["nombre"] or "",
            nombre_completo=(f"{r['apellidos'] or ''} {r['nombre'] or ''}").strip(),
            total_proyectos=r["total_proyectos"],
            leyes_aprobadas=r["leyes_aprobadas"],
            tasa_aprobacion=round((r["leyes_aprobadas"] / r["total_proyectos"] * 100) if r["total_proyectos"] else 0.0, 1),
        )
        for r in diputado_eficacia_rows
    ]

    res = MetricasResponse(
        general=general,
        por_tipo=por_tipo,
        por_mes=por_mes,
        top_diputados=top_diputados,
        top_diputados_eficacia=top_diputados_eficacia,
        organos_activos=organos_activos,
        por_categoria=por_categoria,
    )
    _cache_set(cache_key, res)
    return res


# ══════════════════════════════════════════════════════════════════════
# MÉTRICAS ADICIONALES — endpoints individuales para el front
# ══════════════════════════════════════════════════════════════════════

@router.get("/metricas/actividad-semanal", summary="Actividad de tramitación esta semana")
def actividad_semanal():
    """
    Proyectos que tuvieron movimiento de tramitación en los últimos 7 días.
    Útil para mostrar 'novedades' en el portal.
    """
    rows = fetchall("""
        SELECT
            p.numero_expediente,
            p.titulo,
            t.organo,
            t.tipo_tramite,
            t.fecha_inicio
        FROM tramitacion t
        JOIN proyectos p ON p.id = t.proyecto_id
        WHERE t.fecha_inicio >= NOW() - INTERVAL '7 days'
        ORDER BY t.fecha_inicio DESC
        LIMIT 20
    """)
    return {"datos": rows, "total": len(rows)}


@router.get("/metricas/proximos-vencer", summary="Proyectos próximos a vencer")
def proximos_vencer(dias: int = Query(90, ge=1, le=1825)):
    """
    Proyectos cuyo vencimiento cuatrienal ocurre en los próximos N días (default: 90).
    Si un proyecto vence sin convertirse en ley, muere en la Asamblea.
    """
    rows = fetchall("""
        SELECT
            p.numero_expediente,
            p.titulo,
            p.tipo_expediente,
            p.vencimiento_cuatrienal,
            (p.vencimiento_cuatrienal - CURRENT_DATE) AS dias_restantes,
            (
                SELECT t2.organo
                FROM tramitacion t2
                WHERE t2.proyecto_id = p.id
                ORDER BY t2.fecha_inicio DESC NULLS LAST
                LIMIT 1
            ) AS estado_actual,
            (
                SELECT STRING_AGG(TRIM(COALESCE(pr.apellidos, '') || ' ' || COALESCE(pr.nombre, '')), ', ')
                FROM proponentes pr
                WHERE pr.proyecto_id = p.id
                LIMIT 3
            ) AS proponentes_resumen
        FROM proyectos p
        WHERE
            p.vencimiento_cuatrienal BETWEEN CURRENT_DATE AND CURRENT_DATE + (%(dias)s || ' days')::INTERVAL
            AND p.numero_ley IS NULL
        ORDER BY p.vencimiento_cuatrienal ASC
        LIMIT 50
    """, {"dias": dias})
    return {"datos": rows, "total": len(rows), "dias_consultados": dias}


@router.get("/metricas/linea-tiempo", summary="Proyectos aprobados como ley por año")
def linea_tiempo():
    """
    Serie temporal de proyectos que se convirtieron en ley, agrupados por año.
    Permite ver tendencias históricas de productividad legislativa.
    """
    rows = fetchall("""
        SELECT
            EXTRACT(YEAR FROM fecha_publicacion)::int AS anio,
            COUNT(*) AS leyes_aprobadas
        FROM proyectos
        WHERE numero_ley IS NOT NULL
          AND fecha_publicacion IS NOT NULL
        GROUP BY anio
        ORDER BY anio
    """)
    return {"datos": rows}


@router.get("/metricas/detalle-mes", summary="Detalle de proyectos de un mes específico")
def detalle_mes(
    anio: int = Query(..., ge=1900, le=2100),
    mes:  int = Query(..., ge=1, le=12),
):
    """
    Estadísticas y lista de proyectos presentados en un mes y año específico.
    Incluye: totales, cuántos se convirtieron en ley, top proponentes del mes,
    y lista paginada de proyectos.
    """
    # Resumen del mes
    resumen = fetchone("""
        SELECT
            COUNT(*) AS total_proyectos,
            COUNT(*) FILTER (WHERE numero_ley IS NOT NULL) AS total_leyes,
            COUNT(DISTINCT tipo_expediente) AS tipos_distintos
        FROM proyectos
        WHERE EXTRACT(YEAR FROM fecha_inicio) = %(anio)s
          AND EXTRACT(MONTH FROM fecha_inicio) = %(mes)s
    """, {"anio": anio, "mes": mes}) or {}

    # Top proponentes del mes
    top_proponentes = fetchall("""
        SELECT
            TRIM(COALESCE(pr.apellidos, '') || ' ' || COALESCE(pr.nombre, '')) AS nombre_completo,
            COUNT(*) AS proyectos
        FROM proponentes pr
        JOIN proyectos p ON p.id = pr.proyecto_id
        WHERE EXTRACT(YEAR FROM p.fecha_inicio) = %(anio)s
          AND EXTRACT(MONTH FROM p.fecha_inicio) = %(mes)s
          AND (pr.apellidos IS NOT NULL OR pr.nombre IS NOT NULL)
        GROUP BY pr.apellidos, pr.nombre
        ORDER BY proyectos DESC
        LIMIT 5
    """, {"anio": anio, "mes": mes})

    # Proyectos del mes (máx. 20)
    proyectos = fetchall("""
        SELECT
            p.numero_expediente,
            p.titulo,
            p.tipo_expediente,
            p.fecha_inicio,
            p.numero_ley,
            p.vencimiento_cuatrienal,
            (
                SELECT t2.organo
                FROM tramitacion t2
                WHERE t2.proyecto_id = p.id
                ORDER BY t2.fecha_inicio DESC NULLS LAST
                LIMIT 1
            ) AS estado_actual
        FROM proyectos p
        WHERE EXTRACT(YEAR FROM p.fecha_inicio) = %(anio)s
          AND EXTRACT(MONTH FROM p.fecha_inicio) = %(mes)s
        ORDER BY p.numero_expediente DESC
        LIMIT 20
    """, {"anio": anio, "mes": mes})

    return {
        "anio": anio,
        "mes": mes,
        "mes_nombre": MESES_ES.get(mes, str(mes)),
        "resumen": resumen,
        "top_proponentes": top_proponentes,
        "proyectos": proyectos,
    }


def _like_escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


@router.get("/metricas/diputados", summary="Ranking y búsqueda completa de diputados")
def diputados_ranking(
    desde:      Optional[date] = Query(None),
    hasta:      Optional[date] = Query(None),
    q:          Optional[str]  = Query(None, max_length=120),
    partido_id: Optional[int]  = Query(None, ge=1, description="Filtrar por ID de partido político"),
):
    """
    Lista de diputados ordenada por cantidad de proyectos.
    Si se proporciona `q`, ignora el rango de fechas.
    Opcionalmente filtrable por partido_id.
    """
    _validar_rango_fechas(desde, hasta)

    condiciones = [
        "(pr.apellidos IS NOT NULL OR pr.nombre IS NOT NULL)",
        "UPPER(COALESCE(pr.nombre, '')) != 'PODER EJECUTIVO'",
        "UPPER(COALESCE(pr.apellidos, '')) != 'PODER EJECUTIVO'",
    ]
    params: list = []

    q_norm = (q or "").strip()
    if q_norm:
        q_val = f"%{_like_escape(q_norm.lower())}%"
        condiciones.append(
            "unaccent(LOWER(CONCAT(pr.apellidos, ' ', pr.nombre))) LIKE unaccent(%s) ESCAPE '\\'"
        )
        params.append(q_val)
    else:
        if desde:
            condiciones.append("p.fecha_inicio >= %s")
            params.append(desde)
        if hasta:
            condiciones.append("p.fecha_inicio <= %s")
            params.append(hasta)

    # Filtro por partido: únicamente diputados que en algún momento del período
    # pertenecieron al partido solicitado
    partido_join = ""
    if partido_id:
        partido_join = """
            JOIN historial_diputados hfilt ON
                unaccent(LOWER(TRIM(COALESCE(pr.apellidos, '') || ' ' || COALESCE(pr.nombre, ''))))
                    = unaccent(LOWER(TRIM(hfilt.apellidos || ' ' || hfilt.nombre)))
                AND hfilt.partido_id = %s
        """
        params_partido = [partido_id]
    else:
        params_partido = []

    where_clause = "WHERE " + " AND ".join(condiciones)

    # Sub-query para obtener partido actual del diputado según el período
    query_str = f"""
        SELECT
            pr.apellidos,
            pr.nombre,
            COUNT(DISTINCT pr.proyecto_id) AS total_proyectos,
            (
                SELECT h2.partido_id
                FROM historial_diputados h2
                WHERE unaccent(LOWER(h2.apellidos || ' ' || h2.nombre))
                    = unaccent(LOWER(CONCAT(pr.apellidos, ' ', pr.nombre)))
                ORDER BY h2.administracion DESC, h2.fecha_desde DESC NULLS LAST
                LIMIT 1
            ) AS partido_id,
            (
                SELECT pt.codigo
                FROM historial_diputados h2
                JOIN partidos pt ON pt.id = h2.partido_id
                WHERE unaccent(LOWER(h2.apellidos || ' ' || h2.nombre))
                    = unaccent(LOWER(CONCAT(pr.apellidos, ' ', pr.nombre)))
                ORDER BY h2.administracion DESC, h2.fecha_desde DESC NULLS LAST
                LIMIT 1
            ) AS partido_codigo,
            (
                SELECT pt.nombre
                FROM historial_diputados h2
                JOIN partidos pt ON pt.id = h2.partido_id
                WHERE unaccent(LOWER(h2.apellidos || ' ' || h2.nombre))
                    = unaccent(LOWER(CONCAT(pr.apellidos, ' ', pr.nombre)))
                ORDER BY h2.administracion DESC, h2.fecha_desde DESC NULLS LAST
                LIMIT 1
            ) AS partido_nombre
        FROM proponentes pr
        JOIN proyectos p ON p.id = pr.proyecto_id
        {partido_join}
        {where_clause}
        GROUP BY pr.apellidos, pr.nombre
        ORDER BY total_proyectos DESC
    """

    all_params = tuple(params_partido + params)
    diputado_rows = fetchall(query_str, all_params)

    datos = [
        {
            "apellidos":       r["apellidos"] or "",
            "nombre":          r["nombre"] or "",
            "nombre_completo": (f"{r['apellidos'] or ''} {r['nombre'] or ''}").strip(),
            "total_proyectos": r["total_proyectos"],
            "partido_id":      r.get("partido_id"),
            "partido_codigo":  r.get("partido_codigo"),
            "partido_nombre":  r.get("partido_nombre"),
        }
        for r in diputado_rows
    ]

    return {"datos": datos, "total": len(datos)}


@router.get("/metricas/diputados/{nombre_completo}", summary="Perfil detallado de un diputado")
def perfil_diputado(nombre_completo: str):
    """
    Retorna el perfil completo de un diputado: métricas generales, proyectos por período,
    tasa de aprobación, temas más frecuentes y últimos proyectos.
    """
    # Validación: filtra palabras vacías y rechaza nombres demasiado cortos.
    nombre_norm = nombre_completo.strip()
    palabras = [p for p in nombre_norm.split() if len(p) >= 2]

    if not palabras or len(nombre_norm) < 3:
        raise HTTPException(
            status_code=422,
            detail="El nombre debe tener al menos 3 caracteres y una palabra significativa.",
        )

    if len(palabras) >= 2:
        search_condition = """
            unaccent(UPPER(CONCAT_WS(' ', pr.apellidos, pr.nombre))) LIKE unaccent(UPPER(%s)) ESCAPE '\\'
            AND unaccent(UPPER(CONCAT_WS(' ', pr.apellidos, pr.nombre))) LIKE unaccent(UPPER(%s)) ESCAPE '\\'
        """
        search_params_general = (
            f"%{_like_escape(palabras[0])}%",
            f"%{_like_escape(palabras[1])}%",
        )
    else:
        search_condition = (
            "unaccent(UPPER(CONCAT_WS(' ', pr.apellidos, pr.nombre))) LIKE unaccent(UPPER(%s)) ESCAPE '\\'"
        )
        search_params_general = (f"%{_like_escape(palabras[0])}%",)

    # ── 1. Métricas generales del diputado ────────────────────────────
    general = fetchone(f"""
        SELECT
            COUNT(DISTINCT pr.proyecto_id) AS total_proyectos,
            COUNT(DISTINCT CASE WHEN p.numero_ley IS NOT NULL THEN pr.proyecto_id END) AS total_leyes,
            MIN(p.fecha_inicio) AS primer_proyecto,
            MAX(p.fecha_inicio) AS ultimo_proyecto
        FROM proponentes pr
        JOIN proyectos p ON p.id = pr.proyecto_id
        WHERE {search_condition}
    """, search_params_general) or {}

    # ── 2. Proyectos por período legislativo ──────────────────────────
    por_periodo = fetchall(f"""
        SELECT
            (FLOOR((EXTRACT(YEAR FROM p.fecha_inicio - INTERVAL '4 months') - 1994) / 4) * 4 + 1994)::int::text
            || '-' ||
            (FLOOR((EXTRACT(YEAR FROM p.fecha_inicio - INTERVAL '4 months') - 1994) / 4) * 4 + 1998)::int::text AS periodo,
            COUNT(DISTINCT pr.proyecto_id) AS total,
            COUNT(DISTINCT CASE WHEN p.numero_ley IS NOT NULL THEN pr.proyecto_id END) AS leyes
        FROM proponentes pr
        JOIN proyectos p ON p.id = pr.proyecto_id
        WHERE ({search_condition})
          AND p.fecha_inicio IS NOT NULL
        GROUP BY periodo
        ORDER BY periodo DESC
    """, search_params_general)

    # ── 3. Temas más frecuentes ────────────────────────────────────────
    temas = fetchall(f"""
        SELECT
            c.nombre AS tema,
            c.slug,
            COUNT(DISTINCT pc.proyecto_id) AS total
        FROM proponentes pr
        JOIN proyectos p ON p.id = pr.proyecto_id
        JOIN proyecto_categorias pc ON pc.proyecto_id = p.id
        JOIN categorias c ON c.id = pc.categoria_id
        WHERE {search_condition}
        GROUP BY c.nombre, c.slug
        ORDER BY total DESC
        LIMIT 5
    """, search_params_general)

    # ── 4. Últimos proyectos ──────────────────────────────────────────
    ultimos = fetchall(f"""
        SELECT DISTINCT
            p.numero_expediente,
            p.titulo,
            p.fecha_inicio,
            p.numero_ley,
            p.estado_actual,
            p.estado_grupo
        FROM proponentes pr
        JOIN proyectos p ON p.id = pr.proyecto_id
        WHERE {search_condition}
        ORDER BY p.fecha_inicio DESC NULLS LAST
        LIMIT 10
    """, search_params_general)

    # ── 5. Historial de partidos ──────────────────────────────────────
    historial_partidos = fetchall(f"""
        SELECT
            h.partido_id,
            p.codigo AS partido_codigo,
            p.nombre AS partido_nombre,
            h.administracion,
            h.fecha_desde,
            h.fecha_hasta
        FROM historial_diputados h
        JOIN partidos p ON p.id = h.partido_id
        WHERE unaccent(LOWER(h.apellidos || ' ' || h.nombre)) = unaccent(LOWER(%s))
        ORDER BY h.administracion DESC, h.fecha_desde DESC NULLS LAST
    """, (nombre_norm,))

    total = general.get("total_proyectos") or 0
    total_leyes = general.get("total_leyes") or 0

    return {
        "nombre_completo": nombre_completo,
        "total_proyectos": total,
        "total_leyes": total_leyes,
        "tasa_aprobacion": round((total_leyes / total * 100), 1) if total else 0.0,
        "primer_proyecto": str(general.get("primer_proyecto") or ""),
        "ultimo_proyecto": str(general.get("ultimo_proyecto") or ""),
        "por_periodo": [dict(r) for r in por_periodo],
        "temas": [dict(r) for r in temas],
        "ultimos_proyectos": [dict(r) for r in ultimos],
        "historial_partidos": [dict(r) for r in historial_partidos],
    }


# ══════════════════════════════════════════════════════════════════════
# MÉTRICAS POR PARTIDO POLÍTICO
# ══════════════════════════════════════════════════════════════════════

@router.get(
    "/metricas/partidos",
    response_model=MetricasPartidosResponse,
    summary="Estadísticas de propuestas y leyes aprobadas por partido político",
)
def metricas_partidos(
    administracion: str = Query(
        ...,
        description="Administración legislativa requerida, ej. '2022-2026'",
        max_length=20,
    ),
):
    """
    Para una administración legislativa específica, devuelve:
    - Propuestas presentadas por partido
    - Leyes aprobadas por partido
    - Tasa de aprobación de cada partido
    - Porcentaje de propuestas sobre el total del período

    Solo considera proponentes que pueden ser resueltos a un partido a través
    de historial_diputados. Agrupa bajo "Independiente" a diputados sin
    afiliación a partido formal.
    """
    cache_key = f"metricas_partidos:{administracion}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    rows = fetchall(
        """
        WITH propuestas AS (
            SELECT
                CASE
                    WHEN p.nombre ILIKE 'DIPUTAD%%INDEPENDIENTE%%' THEN -1
                    ELSE p.id
                END                                                                      AS partido_id,
                CASE
                    WHEN p.nombre ILIKE 'DIPUTAD%%INDEPENDIENTE%%' THEN 'IND'
                    ELSE p.codigo
                END                                                                      AS codigo,
                CASE
                    WHEN p.nombre ILIKE 'DIPUTAD%%INDEPENDIENTE%%' THEN 'Independiente'
                    ELSE p.nombre
                END                                                                      AS nombre,
                COUNT(DISTINCT pr.proyecto_id)                                           AS total_propuestas,
                COUNT(DISTINCT CASE WHEN proy.numero_ley IS NOT NULL THEN pr.proyecto_id END) AS leyes_aprobadas
            FROM proponentes pr
            JOIN proyectos proy ON proy.id = pr.proyecto_id
            JOIN historial_diputados h ON
                unaccent(LOWER(pr.nombre)) = unaccent(LOWER(h.apellidos || ' ' || h.nombre))
                AND h.administracion = %(adm)s
                AND (h.fecha_desde IS NULL OR proy.fecha_inicio >= h.fecha_desde)
                AND (h.fecha_hasta IS NULL OR proy.fecha_inicio <= h.fecha_hasta)
            JOIN partidos p ON p.id = h.partido_id
            WHERE proy.fecha_inicio IS NOT NULL
            GROUP BY 1, 2, 3
        ),
        diputados_count AS (
            SELECT
                CASE
                    WHEN p.nombre ILIKE 'DIPUTAD%%INDEPENDIENTE%%' THEN 'IND'
                    ELSE p.codigo
                END AS codigo,
                COUNT(DISTINCT h.id) AS total_diputados
            FROM historial_diputados h
            JOIN partidos p ON p.id = h.partido_id
            WHERE h.administracion = %(adm)s
            GROUP BY 1
        )
        SELECT
            pr.partido_id,
            pr.codigo,
            pr.nombre,
            COALESCE(dc.total_diputados, 0) AS total_diputados,
            pr.total_propuestas,
            pr.leyes_aprobadas
        FROM propuestas pr
        LEFT JOIN diputados_count dc ON dc.codigo = pr.codigo
        ORDER BY pr.total_propuestas DESC
        """,
        {"adm": administracion},
    )

    total_propuestas = sum(r["total_propuestas"] for r in rows)

    por_partido = [
        EstadisticaPartido(
            partido_id=r["partido_id"],
            codigo=r["codigo"],
            nombre=r["nombre"],
            total_diputados=r["total_diputados"],
            total_propuestas=r["total_propuestas"],
            leyes_aprobadas=r["leyes_aprobadas"],
            tasa_aprobacion=round(
                (r["leyes_aprobadas"] / r["total_propuestas"] * 100)
                if r["total_propuestas"] else 0.0, 1
            ),
            pct_propuestas=round(
                (r["total_propuestas"] / total_propuestas * 100)
                if total_propuestas else 0.0, 1
            ),
        )
        for r in rows
    ]

    resp = MetricasPartidosResponse(
        administracion=administracion,
        total_propuestas=total_propuestas,
        por_partido=por_partido,
    )
    _cache_set(cache_key, resp)
    return resp


@router.get(
    "/metricas/partidos/resumen",
    response_model=MetricasPartidosResumenResponse,
    summary="Estadísticas globales (todos los períodos) por partido",
)
def metricas_partidos_resumen():
    """
    Estadísticas de propuestas y leyes por partido, sin filtro de administración.
    Usa las fechas de cada proyecto para resolver el partido correcto del proponente,
    evitando doble-conteo entre períodos.
    """
    cache_key = "metricas_partidos_resumen"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    rows = fetchall("""
        WITH propuestas AS (
            SELECT
                p.id    AS partido_id,
                p.codigo,
                p.nombre,
                COUNT(DISTINCT pr.proyecto_id)                                           AS total_propuestas,
                COUNT(DISTINCT CASE WHEN proy.numero_ley IS NOT NULL THEN pr.proyecto_id END) AS leyes_aprobadas
            FROM proponentes pr
            JOIN proyectos proy ON proy.id = pr.proyecto_id
            JOIN historial_diputados h ON
                unaccent(LOWER(pr.nombre)) = unaccent(LOWER(h.apellidos || ' ' || h.nombre))
                AND (h.fecha_desde IS NULL OR proy.fecha_inicio >= h.fecha_desde)
                AND (h.fecha_hasta IS NULL OR proy.fecha_inicio <= h.fecha_hasta)
            JOIN partidos p ON p.id = h.partido_id
            WHERE proy.fecha_inicio IS NOT NULL
              AND p.nombre NOT ILIKE 'DIPUTAD%%INDEPENDIENTE%%'
            GROUP BY p.id, p.codigo, p.nombre
        ),
        diputados_count AS (
            SELECT partido_id, COUNT(DISTINCT TRIM(apellidos || ' ' || nombre)) AS total_diputados
            FROM historial_diputados
            GROUP BY partido_id
        )
        SELECT pr.partido_id, pr.codigo, pr.nombre,
               COALESCE(d.total_diputados, 0) AS total_diputados,
               pr.total_propuestas, pr.leyes_aprobadas
        FROM propuestas pr
        LEFT JOIN diputados_count d ON d.partido_id = pr.partido_id
        WHERE pr.total_propuestas > 0
        ORDER BY pr.total_propuestas DESC
    """)

    total_propuestas = sum(r["total_propuestas"] for r in rows)

    por_partido = [
        EstadisticaPartido(
            partido_id=r["partido_id"],
            codigo=r["codigo"],
            nombre=r["nombre"],
            total_diputados=r["total_diputados"],
            total_propuestas=r["total_propuestas"],
            leyes_aprobadas=r["leyes_aprobadas"],
            tasa_aprobacion=round(
                (r["leyes_aprobadas"] / r["total_propuestas"] * 100)
                if r["total_propuestas"] else 0.0, 1
            ),
            pct_propuestas=round(
                (r["total_propuestas"] / total_propuestas * 100)
                if total_propuestas else 0.0, 1
            ),
        )
        for r in rows
    ]

    resp = MetricasPartidosResumenResponse(
        total_propuestas=total_propuestas,
        por_partido=por_partido,
    )
    _cache_set(cache_key, resp)
    return resp


@router.get(
    "/metricas/partidos/{codigo}/perfil",
    response_model=PerfilPartidoResponse,
    summary="Perfil detallado de un partido político",
)
def perfil_partido(codigo: str):
    """
    Perfil completo de un partido: métricas globales, desglose por administración,
    top diputados y temas más frecuentes.
    """
    cache_key = f"perfil_partido:{codigo.upper()}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    info = fetchone(
        "SELECT id, codigo, nombre FROM partidos WHERE UPPER(codigo) = UPPER(%s)",
        (codigo,),
    )
    if not info:
        raise HTTPException(status_code=404, detail="Partido no encontrado")

    partido_id = info["id"]

    # ── Stats globales ─────────────────────────────────────────────────
    stats = fetchone("""
        SELECT
            COUNT(DISTINCT pr.proyecto_id)                                               AS total_propuestas,
            COUNT(DISTINCT CASE WHEN proy.numero_ley IS NOT NULL THEN pr.proyecto_id END) AS leyes_aprobadas,
            COUNT(DISTINCT TRIM(h.apellidos || ' ' || h.nombre))                          AS total_diputados
        FROM proponentes pr
        JOIN proyectos proy ON proy.id = pr.proyecto_id
        JOIN historial_diputados h ON
            unaccent(LOWER(pr.nombre)) = unaccent(LOWER(h.apellidos || ' ' || h.nombre))
            AND h.partido_id = %s
            AND (h.fecha_desde IS NULL OR proy.fecha_inicio >= h.fecha_desde)
            AND (h.fecha_hasta IS NULL OR proy.fecha_inicio <= h.fecha_hasta)
        WHERE proy.fecha_inicio IS NOT NULL
    """, (partido_id,)) or {}

    # ── Por administración ─────────────────────────────────────────────
    por_adm_rows = fetchall("""
        SELECT
            h.administracion,
            COUNT(DISTINCT pr.proyecto_id)                                               AS total_propuestas,
            COUNT(DISTINCT CASE WHEN proy.numero_ley IS NOT NULL THEN pr.proyecto_id END) AS leyes_aprobadas,
            COUNT(DISTINCT TRIM(h.apellidos || ' ' || h.nombre))                          AS total_diputados
        FROM proponentes pr
        JOIN proyectos proy ON proy.id = pr.proyecto_id
        JOIN historial_diputados h ON
            unaccent(LOWER(pr.nombre)) = unaccent(LOWER(h.apellidos || ' ' || h.nombre))
            AND h.partido_id = %s
            AND (h.fecha_desde IS NULL OR proy.fecha_inicio >= h.fecha_desde)
            AND (h.fecha_hasta IS NULL OR proy.fecha_inicio <= h.fecha_hasta)
        WHERE proy.fecha_inicio IS NOT NULL
        GROUP BY h.administracion
        ORDER BY h.administracion DESC
    """, (partido_id,))

    # ── Top diputados ──────────────────────────────────────────────────
    top_dip_rows = fetchall("""
        SELECT
            TRIM(h.apellidos || ' ' || h.nombre)                                         AS nombre_completo,
            h.apellidos,
            h.nombre,
            COUNT(DISTINCT pr.proyecto_id)                                               AS total_proyectos,
            COUNT(DISTINCT CASE WHEN proy.numero_ley IS NOT NULL THEN pr.proyecto_id END) AS leyes_aprobadas
        FROM proponentes pr
        JOIN proyectos proy ON proy.id = pr.proyecto_id
        JOIN historial_diputados h ON
            unaccent(LOWER(pr.nombre)) = unaccent(LOWER(h.apellidos || ' ' || h.nombre))
            AND h.partido_id = %s
            AND (h.fecha_desde IS NULL OR proy.fecha_inicio >= h.fecha_desde)
            AND (h.fecha_hasta IS NULL OR proy.fecha_inicio <= h.fecha_hasta)
        WHERE proy.fecha_inicio IS NOT NULL
        GROUP BY nombre_completo, h.apellidos, h.nombre
        ORDER BY total_proyectos DESC
        LIMIT 10
    """, (partido_id,))

    # ── Por categoría ──────────────────────────────────────────────────
    por_cat_rows = fetchall("""
        SELECT
            c.nombre AS categoria,
            c.slug,
            COUNT(DISTINCT pr.proyecto_id)                                               AS total,
            COUNT(DISTINCT CASE WHEN proy.numero_ley IS NOT NULL THEN pr.proyecto_id END) AS leyes_aprobadas
        FROM proponentes pr
        JOIN proyectos proy ON proy.id = pr.proyecto_id
        JOIN historial_diputados h ON
            unaccent(LOWER(pr.nombre)) = unaccent(LOWER(h.apellidos || ' ' || h.nombre))
            AND h.partido_id = %s
            AND (h.fecha_desde IS NULL OR proy.fecha_inicio >= h.fecha_desde)
            AND (h.fecha_hasta IS NULL OR proy.fecha_inicio <= h.fecha_hasta)
        JOIN proyecto_categorias pc ON pc.proyecto_id = proy.id
        JOIN categorias c ON c.id = pc.categoria_id
        WHERE proy.fecha_inicio IS NOT NULL
        GROUP BY c.nombre, c.slug
        ORDER BY total DESC
        LIMIT 10
    """, (partido_id,))

    total = stats.get("total_propuestas") or 0
    leyes = stats.get("leyes_aprobadas") or 0

    resp = PerfilPartidoResponse(
        partido_id=partido_id,
        codigo=info["codigo"],
        nombre=info["nombre"],
        total_propuestas=total,
        total_leyes=leyes,
        tasa_aprobacion=round((leyes / total * 100), 1) if total else 0.0,
        total_diputados=stats.get("total_diputados") or 0,
        por_administracion=[
            PeriodoPartido(
                administracion=r["administracion"],
                total_propuestas=r["total_propuestas"],
                leyes_aprobadas=r["leyes_aprobadas"],
                tasa_aprobacion=round(
                    (r["leyes_aprobadas"] / r["total_propuestas"] * 100)
                    if r["total_propuestas"] else 0.0, 1
                ),
                total_diputados=r["total_diputados"],
            )
            for r in por_adm_rows
        ],
        top_diputados=[
            DiputadoPartidoItem(
                nombre_completo=r["nombre_completo"],
                apellidos=r["apellidos"] or "",
                nombre=r["nombre"] or "",
                total_proyectos=r["total_proyectos"],
                leyes_aprobadas=r["leyes_aprobadas"],
                tasa_aprobacion=round(
                    (r["leyes_aprobadas"] / r["total_proyectos"] * 100)
                    if r["total_proyectos"] else 0.0, 1
                ),
            )
            for r in top_dip_rows
        ],
        por_categoria=[
            CategoriaPartido(
                categoria=r["categoria"],
                slug=r["slug"],
                total=r["total"],
                leyes_aprobadas=r["leyes_aprobadas"],
                tasa_aprobacion=round(
                    (r["leyes_aprobadas"] / r["total"] * 100)
                    if r["total"] else 0.0, 1
                ),
            )
            for r in por_cat_rows
        ],
    )
    _cache_set(cache_key, resp)
    return resp

