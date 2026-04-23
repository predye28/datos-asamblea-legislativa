"""
routers/proyectos.py
──────────────────────────────────────────────────────────────────────
Endpoints para listar, buscar y obtener detalle de proyectos de ley.

Endpoints
─────────
  GET /api/v1/proyectos                    → listado paginado con filtros
  GET /api/v1/proyectos/{numero_expediente} → detalle completo
  GET /api/v1/proyectos/buscar             → búsqueda por texto o diputado
"""

import math
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from database import fetchall, fetchone, fetchval
from models import (
    ProyectosResponse,
    ProyectoResumen,
    ProyectoDetalle,
    CategoriaResumen,
    Proponente,
    TramiteItem,
    DocumentoItem,
    Paginacion,
)

router = APIRouter()


# ══════════════════════════════════════════════════════════════════════
# HELPERS INTERNOS
# ══════════════════════════════════════════════════════════════════════

def _cats_de_proyecto(proyecto_id: int) -> list[CategoriaResumen]:
    """Devuelve las categorías de un proyecto (uso en detalle individual)."""
    rows = fetchall(
        """
        SELECT c.slug, c.nombre
        FROM categorias c
        JOIN proyecto_categorias pc ON pc.categoria_id = c.id
        WHERE pc.proyecto_id = %s
        ORDER BY c.orden
        """,
        (proyecto_id,),
    )
    return [CategoriaResumen(**r) for r in rows]


def _cats_batch(ids: list[int]) -> dict[int, list[CategoriaResumen]]:
    """
    Trae las categorías de múltiples proyectos en UNA sola query.
    Retorna un dict  proyecto_id -> [CategoriaResumen, ...]
    """
    if not ids:
        return {}
    rows = fetchall(
        """
        SELECT pc.proyecto_id, c.slug, c.nombre
        FROM proyecto_categorias pc
        JOIN categorias c ON c.id = pc.categoria_id
        WHERE pc.proyecto_id = ANY(%s)
        ORDER BY pc.proyecto_id, c.orden
        """,
        (ids,),
    )
    result: dict[int, list[CategoriaResumen]] = {i: [] for i in ids}
    for r in rows:
        result[r["proyecto_id"]].append(CategoriaResumen(slug=r["slug"], nombre=r["nombre"]))
    return result


def _enriquecer(row: dict) -> ProyectoResumen:
    """Para uso en detalle individual (ya trae cats por separado)."""
    data = dict(row)
    data["es_ley"]     = bool(data.get("numero_ley"))
    data["categorias"] = _cats_de_proyecto(data["id"])
    return ProyectoResumen(**data)


def _enriquecer_batch(rows: list[dict]) -> list[ProyectoResumen]:
    """
    Convierte una lista de filas crudas en ProyectoResumen,
    trayendo TODAS las categorías en una sola query (sin N+1).
    """
    if not rows:
        return []
    ids = [r["id"] for r in rows]
    cats_map = _cats_batch(ids)
    result = []
    for row in rows:
        data = dict(row)
        data["es_ley"]     = bool(data.get("numero_ley"))
        data["categorias"] = cats_map.get(data["id"], [])
        result.append(ProyectoResumen(**data))
    return result


# ══════════════════════════════════════════════════════════════════════
# LISTADO CON FILTROS Y PAGINACIÓN
# ══════════════════════════════════════════════════════════════════════

@router.get("/proyectos", response_model=ProyectosResponse, summary="Listar proyectos")
def listar_proyectos(
    pagina:     int = Query(1,    ge=1,   description="Número de página"),
    por_pagina: int = Query(20,   ge=1, le=100, description="Resultados por página"),
    tipo:       Optional[str] = Query(None, description="Filtrar por tipo de expediente"),
    anio:       Optional[int] = Query(None, description="Filtrar por año de inicio"),
    desde:      Optional[str] = Query(None, description="Fecha de inicio mínima (YYYY-MM-DD)"),
    hasta:      Optional[str] = Query(None, description="Fecha de inicio máxima (YYYY-MM-DD)"),
    solo_leyes: bool          = Query(False, description="Solo proyectos que se convirtieron en ley"),
    orden:      str           = Query("reciente", description="reciente | antiguo | expediente"),
    categoria:  Optional[str] = Query(None, description="Filtrar por slug de categoría"),
):
    """
    Devuelve proyectos paginados.

    - **pagina**: página actual (empieza en 1)
    - **por_pagina**: cuántos resultados por página (máximo 100)
    - **tipo**: filtra por tipo de expediente (ej: "Proyecto de Ley")
    - **anio**: filtra proyectos iniciados en ese año
    - **desde**: filtra proyectos iniciados desde esta fecha
    - **hasta**: filtra proyectos iniciados hasta esta fecha
    - **solo_leyes**: si `true`, muestra solo los que tienen número de ley
    - **orden**: `reciente` (más nuevo primero), `antiguo`, `expediente`
    """
    # Construir cláusulas WHERE dinámicamente
    condiciones = []
    params: list = []

    if tipo:
        condiciones.append("p.tipo_expediente ILIKE %s")
        params.append(f"%{tipo}%")

    if anio:
        condiciones.append("EXTRACT(YEAR FROM p.fecha_inicio) = %s")
        params.append(anio)

    if desde:
        condiciones.append("p.fecha_inicio >= %s")
        params.append(desde)

    if hasta:
        condiciones.append("p.fecha_inicio <= %s")
        params.append(hasta)

    if solo_leyes:
        condiciones.append("p.numero_ley IS NOT NULL")

    if categoria:
        condiciones.append(
            """
            EXISTS (
                SELECT 1 FROM proyecto_categorias pc
                JOIN categorias c ON c.id = pc.categoria_id
                WHERE pc.proyecto_id = p.id AND c.slug = %s
            )
            """
        )
        params.append(categoria)

    where = ("WHERE " + " AND ".join(condiciones)) if condiciones else ""

    # Orden
    orden_sql = {
        "reciente":   "p.fecha_inicio DESC NULLS LAST",
        "antiguo":    "p.fecha_inicio ASC NULLS LAST",
        "expediente": "p.numero_expediente DESC",
    }.get(orden, "p.fecha_inicio DESC NULLS LAST")

    # Total de registros (para paginación)
    total = fetchval(f"SELECT COUNT(*) FROM proyectos p {where}", tuple(params))

    # Query principal con conteos y último órgano
    offset = (pagina - 1) * por_pagina
    params_paginado = params + [por_pagina, offset]

    sql = f"""
        SELECT
            p.id,
            p.numero_expediente,
            p.titulo,
            p.tipo_expediente,
            p.fecha_inicio,
            p.vencimiento_cuatrienal,
            p.fecha_publicacion,
            p.numero_gaceta,
            p.numero_ley,
            p.creado_en,
            COUNT(DISTINCT pr.id)   AS total_proponentes,
            COUNT(DISTINCT tr.id)   AS total_tramites,
            COUNT(DISTINCT doc.id) > 0 AS tiene_documento,
            (
                SELECT t2.organo
                FROM tramitacion t2
                WHERE t2.proyecto_id = p.id
                ORDER BY t2.fecha_inicio DESC NULLS LAST
                LIMIT 1
            ) AS estado_actual
        FROM proyectos p
        LEFT JOIN proponentes pr  ON pr.proyecto_id  = p.id
        LEFT JOIN tramitacion tr  ON tr.proyecto_id  = p.id
        LEFT JOIN documentos  doc ON doc.proyecto_id = p.id
        {where}
        GROUP BY p.id
        ORDER BY {orden_sql}
        LIMIT %s OFFSET %s
    """

    rows = fetchall(sql, tuple(params_paginado))
    datos = _enriquecer_batch(rows)

    total_paginas = math.ceil(total / por_pagina) if total else 1

    return ProyectosResponse(
        datos=datos,
        paginacion=Paginacion(
            total=total,
            pagina=pagina,
            por_pagina=por_pagina,
            total_paginas=total_paginas,
        ),
    )


# ══════════════════════════════════════════════════════════════════════
# BÚSQUEDA
# ══════════════════════════════════════════════════════════════════════

@router.get("/proyectos/buscar", response_model=ProyectosResponse, summary="Buscar proyectos")
def buscar_proyectos(
    q:          str = Query(..., min_length=2, description="Texto libre: título, diputado, órgano"),
    desde:      Optional[str] = Query(None, description="Fecha de inicio mínima (YYYY-MM-DD)"),
    hasta:      Optional[str] = Query(None, description="Fecha de inicio máxima (YYYY-MM-DD)"),
    pagina:     int = Query(1,  ge=1),
    por_pagina: int = Query(20, ge=1, le=100),
):
    """
    Búsqueda de texto completo sobre:
    - Título del proyecto
    - Nombre o apellidos de proponentes
    - Órgano de tramitación

    Retorna los proyectos que coincidan con **cualquiera** de esos campos.
    """
    termino = f"%{q}%"
    
    condiciones = [
        """
        (
            p.titulo ILIKE %s
            OR EXISTS (
                SELECT 1 FROM proponentes pr
                WHERE pr.proyecto_id = p.id
                  AND (pr.apellidos ILIKE %s OR pr.nombre ILIKE %s)
            )
            OR EXISTS (
                SELECT 1 FROM tramitacion tr
                WHERE tr.proyecto_id = p.id
                  AND tr.organo ILIKE %s
            )
        )
        """
    ]
    params = [termino, termino, termino, termino]

    if desde:
        condiciones.append("p.fecha_inicio >= %s")
        params.append(desde)
    if hasta:
        condiciones.append("p.fecha_inicio <= %s")
        params.append(hasta)

    where_sql = "WHERE " + " AND ".join(condiciones)
    
    from_sql = "FROM proyectos p"
    join_sql = """
        LEFT JOIN proponentes pr2 ON pr2.proyecto_id = p.id
        LEFT JOIN tramitacion tr2  ON tr2.proyecto_id = p.id
        LEFT JOIN documentos  doc  ON doc.proyecto_id = p.id
    """

    total = fetchval(f"SELECT COUNT(DISTINCT p.id) {from_sql} {where_sql}", tuple(params))

    offset = (pagina - 1) * por_pagina
    params_query = params + [por_pagina, offset]

    sql = f"""
        SELECT
            p.id,
            p.numero_expediente,
            p.titulo,
            p.tipo_expediente,
            p.fecha_inicio,
            p.vencimiento_cuatrienal,
            p.fecha_publicacion,
            p.numero_gaceta,
            p.numero_ley,
            p.creado_en,
            COUNT(DISTINCT pr2.id)   AS total_proponentes,
            COUNT(DISTINCT tr2.id)   AS total_tramites,
            COUNT(DISTINCT doc.id) > 0 AS tiene_documento,
            (
                SELECT t2.organo
                FROM tramitacion t2
                WHERE t2.proyecto_id = p.id
                ORDER BY t2.fecha_inicio DESC NULLS LAST
                LIMIT 1
            ) AS estado_actual
        {from_sql}
        {join_sql}
        {where_sql}
        GROUP BY p.id
        ORDER BY p.fecha_inicio DESC NULLS LAST
        LIMIT %s OFFSET %s
    """

    rows = fetchall(sql, tuple(params_query))
    datos = _enriquecer_batch(rows)

    total_paginas = math.ceil(total / por_pagina) if total else 1

    return ProyectosResponse(
        datos=datos,
        paginacion=Paginacion(
            total=total,
            pagina=pagina,
            por_pagina=por_pagina,
            total_paginas=total_paginas,
        ),
    )


# ══════════════════════════════════════════════════════════════════════
# DETALLE DE UN PROYECTO
# ══════════════════════════════════════════════════════════════════════

@router.get(
    "/proyectos/{numero_expediente}",
    response_model=ProyectoDetalle,
    summary="Detalle de un proyecto",
)
def detalle_proyecto(numero_expediente: int):
    """
    Devuelve el detalle completo de un proyecto:
    - Datos maestros
    - Lista de proponentes (diputados firmantes)
    - Historial de tramitación (órganos y fechas)
    - Documentos adjuntos (PDF / DOCX)
    """
    # Datos maestros
    row = fetchone(
        """
        SELECT
            p.id,
            p.numero_expediente,
            p.titulo,
            p.tipo_expediente,
            p.fecha_inicio,
            p.vencimiento_cuatrienal,
            p.fecha_publicacion,
            p.numero_gaceta,
            p.numero_ley,
            p.creado_en,
            COUNT(DISTINCT pr.id)  AS total_proponentes,
            COUNT(DISTINCT tr.id)  AS total_tramites,
            COUNT(DISTINCT doc.id) > 0 AS tiene_documento,
            (
                SELECT t2.organo
                FROM tramitacion t2
                WHERE t2.proyecto_id = p.id
                ORDER BY t2.fecha_inicio DESC NULLS LAST
                LIMIT 1
            ) AS estado_actual
        FROM proyectos p
        LEFT JOIN proponentes pr  ON pr.proyecto_id  = p.id
        LEFT JOIN tramitacion tr  ON tr.proyecto_id  = p.id
        LEFT JOIN documentos  doc ON doc.proyecto_id = p.id
        WHERE p.numero_expediente = %s
        GROUP BY p.id
        """,
        (numero_expediente,),
    )

    if not row:
        raise HTTPException(
            status_code=404,
            detail=f"Proyecto con expediente {numero_expediente} no encontrado.",
        )

    # Proponentes
    prop_rows = fetchall(
        "SELECT secuencia, apellidos, nombre FROM proponentes WHERE proyecto_id = %s ORDER BY secuencia",
        (row["id"],),
    )
    proponentes = [Proponente(**p) for p in prop_rows]

    # Tramitación
    tram_rows = fetchall(
        """
        SELECT organo, fecha_inicio, fecha_termino, tipo_tramite
        FROM tramitacion
        WHERE proyecto_id = %s
        ORDER BY fecha_inicio ASC NULLS LAST
        """,
        (row["id"],),
    )
    tramitacion = [TramiteItem(**t) for t in tram_rows]

    # Documentos
    doc_rows = fetchall(
        "SELECT tipo, ruta_archivo FROM documentos WHERE proyecto_id = %s",
        (row["id"],),
    )
    documentos = [DocumentoItem(**d) for d in doc_rows]

    # Categorías
    categorias = _cats_de_proyecto(row["id"])

    # Construir el objeto de detalle
    data = dict(row)
    data["es_ley"]      = bool(data.get("numero_ley"))
    data["proponentes"] = proponentes
    data["tramitacion"] = tramitacion
    data["documentos"]  = documentos
    data["categorias"]  = categorias

    return ProyectoDetalle(**data)


# ══════════════════════════════════════════════════════════════════════
# TIPOS DE EXPEDIENTE (para filtros del front)
# ══════════════════════════════════════════════════════════════════════

@router.get("/proyectos-tipos", summary="Tipos de expediente disponibles")
def tipos_expediente():
    """
    Devuelve la lista de tipos de expediente únicos en la base de datos.
    Útil para poblar los filtros del front.
    """
    rows = fetchall(
        """
        SELECT tipo_expediente, COUNT(*) AS total
        FROM proyectos
        WHERE tipo_expediente IS NOT NULL
        GROUP BY tipo_expediente
        ORDER BY total DESC
        """
    )
    return rows
