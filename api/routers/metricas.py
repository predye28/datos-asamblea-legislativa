"""
routers/metricas.py
──────────────────────────────────────────────────────────────────────
Endpoint de métricas ciudadanas: estadísticas que cualquier persona
puede entender sobre lo que ocurre en la Asamblea Legislativa.

Endpoint
────────
  GET /api/v1/metricas   → resumen completo con 5 bloques de datos
"""

import time
from fastapi import APIRouter
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
)

router = APIRouter()

_cache_metricas = {}
CACHE_TTL = 300 # 5 minutes

@router.get("/metricas", response_model=MetricasResponse, summary="Métricas ciudadanas")
def metricas(
    desde: str = None, # formato YYYY-MM-DD
    hasta: str = None,
):
    """
    Devuelve un conjunto de métricas diseñadas para que cualquier
    ciudadano entienda qué está pasando en la Asamblea Legislativa.
    
    Permite filtrar por un rango de fechas de inicio del proyecto.
    """
    cache_key = f"{desde}-{hasta}"
    now = time.time()
    if cache_key in _cache_metricas and (now - _cache_metricas[cache_key]['time'] < CACHE_TTL):
        return _cache_metricas[cache_key]['data']

    
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
    gen = fetchone(f"""
        SELECT
            COUNT(*)                                        AS total_proyectos,
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

    total           = gen.get("total_proyectos")    or 0
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
    _cache_metricas[cache_key] = {'time': now, 'data': res}
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
def proximos_vencer(dias: int = 90):
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
def detalle_mes(anio: int, mes: int):
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


@router.get("/metricas/diputados", summary="Ranking y búsqueda completa de diputados")
def diputados_ranking(desde: str = None, hasta: str = None, q: str = None):
    """
    Retorna la lista completa de diputados (proponentes) ordenada por cantidad de proyectos.
    Si se proporciona `q` (búsqueda), ignora el rango de fechas para buscar en todo el histórico de la BD.
    """
    condiciones = [
        "(pr.apellidos IS NOT NULL OR pr.nombre IS NOT NULL)",
        "UPPER(COALESCE(pr.nombre, '')) != 'PODER EJECUTIVO'",
        "UPPER(COALESCE(pr.apellidos, '')) != 'PODER EJECUTIVO'"
    ]
    params = []

    if q:
        # Si hay búsqueda, busca en todos los tiempos sin restricción de desde/hasta
        q_val = f"%{q.strip().lower()}%"
        condiciones.append("LOWER(CONCAT(pr.apellidos, ' ', pr.nombre)) LIKE %s")
        params.append(q_val)
    else:
        # Solo aplicar filtro de periodo si no se está buscando
        if desde:
            condiciones.append("p.fecha_inicio >= %s")
            params.append(desde)
        if hasta:
            condiciones.append("p.fecha_inicio <= %s")
            params.append(hasta)

    where_clause = "WHERE " + " AND ".join(condiciones)

    query_str = f"""
        SELECT
            pr.apellidos,
            pr.nombre,
            COUNT(DISTINCT pr.proyecto_id) AS total_proyectos
        FROM proponentes pr
        JOIN proyectos p ON p.id = pr.proyecto_id
        {where_clause}
        GROUP BY pr.apellidos, pr.nombre
        ORDER BY total_proyectos DESC
    """
    
    diputado_rows = fetchall(query_str, tuple(params))
    
    datos = [
        DiputadoRanking(
            apellidos=r["apellidos"] or "",
            nombre=r["nombre"] or "",
            nombre_completo=(f"{r['apellidos'] or ''} {r['nombre'] or ''}").strip(),
            total_proyectos=r["total_proyectos"],
        )
        for r in diputado_rows
    ]

    return {"datos": datos, "total": len(datos)}


@router.get("/metricas/diputados/{nombre_completo}", summary="Perfil detallado de un diputado")
def perfil_diputado(nombre_completo: str):
    """
    Retorna el perfil completo de un diputado: métricas generales, proyectos por período,
    tasa de aprobación, temas más frecuentes y últimos proyectos.
    """
    # Estrategia robusta: buscar por cada palara del nombre individualmente en UPPER
    # Esto maneja tildes, mayusculas, y variaciones de formato
    nombre_norm = nombre_completo.strip()
    palabras = nombre_norm.split()

    if len(palabras) >= 2:
        # El scraper a veces guarda todo en "nombre" y deja "apellidos" NULL,
        # así que concatenamos con CONCAT_WS que maneja los NULLs de forma segura.
        # Buscamos que las primeras 2 palabras estén presentes en el nombre completo
        search_condition = """
            UPPER(CONCAT_WS(' ', pr.apellidos, pr.nombre)) LIKE UPPER(%s)
            AND UPPER(CONCAT_WS(' ', pr.apellidos, pr.nombre)) LIKE UPPER(%s)
        """
        search_params_general = (
            f"%{palabras[0]}%",
            f"%{palabras[1]}%",
        )
    else:
        search_condition = "UPPER(CONCAT_WS(' ', pr.apellidos, pr.nombre)) LIKE UPPER(%s)"
        search_params_general = (f"%{nombre_norm}%",)

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
            CASE
                WHEN p.fecha_inicio BETWEEN '2022-05-01' AND '2026-04-30' THEN '2022-2026'
                WHEN p.fecha_inicio BETWEEN '2018-05-01' AND '2022-04-30' THEN '2018-2022'
                WHEN p.fecha_inicio BETWEEN '2014-05-01' AND '2018-04-30' THEN '2014-2018'
                WHEN p.fecha_inicio BETWEEN '2010-05-01' AND '2014-04-30' THEN '2010-2014'
                ELSE 'Otro'
            END AS periodo,
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
            p.numero_ley
        FROM proponentes pr
        JOIN proyectos p ON p.id = pr.proyecto_id
        WHERE {search_condition}
        ORDER BY p.fecha_inicio DESC NULLS LAST
        LIMIT 10
    """, search_params_general)

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
    }

