"""
routers/metricas.py
──────────────────────────────────────────────────────────────────────
Endpoint de métricas ciudadanas: estadísticas que cualquier persona
puede entender sobre lo que ocurre en la Asamblea Legislativa.

Endpoint
────────
  GET /api/v1/metricas   → resumen completo con 5 bloques de datos
"""

from fastapi import APIRouter
from database import fetchall, fetchone, fetchval
from models import (
    MetricasResponse,
    MetricaGeneral,
    ProyectosPorTipo,
    ProyectosPorMes,
    DiputadoRanking,
    OrganoActividad,
)

router = APIRouter()

MESES_ES = {
    1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
    5: "Mayo",  6: "Junio",   7: "Julio", 8: "Agosto",
    9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre",
}


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
    
    general = MetricaGeneral(
        total_proyectos=total,
        total_leyes_aprobadas=total_leyes,
        tasa_aprobacion_pct=tasa_aprobacion,
        total_diputados_activos=int(diputados_activos),
        proyectos_este_mes=gen.get("proyectos_este_mes") or 0,
        proyectos_este_anio=gen.get("proyectos_este_anio") or 0,
        promedio_tramites=float(avg_tramites),
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
        AND pr.apellidos IS NOT NULL AND pr.nombre IS NOT NULL
        GROUP BY pr.apellidos, pr.nombre
        ORDER BY total_proyectos DESC
        LIMIT 10
    """, tuple(params))

    top_diputados = [
        DiputadoRanking(
            apellidos=r["apellidos"],
            nombre=r["nombre"],
            nombre_completo=f"{r['apellidos']} {r['nombre']}".strip(),
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
        AND pr.apellidos IS NOT NULL AND pr.nombre IS NOT NULL
        GROUP BY pr.apellidos, pr.nombre
        ORDER BY total_proyectos DESC
        LIMIT 10
    """, tuple(params))

    top_diputados = [
        DiputadoRanking(
            apellidos=r["apellidos"],
            nombre=r["nombre"],
            nombre_completo=f"{r['apellidos']} {r['nombre']}".strip(),
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

    return MetricasResponse(
        general=general,
        por_tipo=por_tipo,
        por_mes=por_mes,
        top_diputados=top_diputados,
        organos_activos=organos_activos,
    )


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
def proximos_vencer():
    """
    Proyectos cuyo vencimiento cuatrienal ocurre en los próximos 90 días.
    Si un proyecto vence sin convertirse en ley, muere en la Asamblea.
    """
    rows = fetchall("""
        SELECT
            numero_expediente,
            titulo,
            tipo_expediente,
            vencimiento_cuatrienal,
            (vencimiento_cuatrienal - CURRENT_DATE) AS dias_restantes
        FROM proyectos
        WHERE
            vencimiento_cuatrienal BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
            AND numero_ley IS NULL
        ORDER BY vencimiento_cuatrienal ASC
        LIMIT 30
    """)
    return {"datos": rows, "total": len(rows)}


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
