"""
routers/proyectos.py
──────────────────────────────────────────────────────────────────────
Endpoints para listar, buscar y obtener detalle de proyectos de ley.
"""

import math
from datetime import date
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, Literal

from database import fetchall, fetchone, fetchval
from models import (
    ProyectosResponse,
    ProyectoResumen,
    ProyectoDetalle,
    CategoriaResumen,
    Proponente,
    TramiteItem,
    Paginacion,
)

router = APIRouter()


# ══════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════

def _like_escape(s: str) -> str:
    """Escapa los wildcards LIKE/ILIKE (\\, %, _) para que un usuario
    no pueda colar comodines vía filtros de texto."""
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _validar_rango_fechas(desde: date | None, hasta: date | None) -> None:
    if desde and hasta and desde > hasta:
        raise HTTPException(
            status_code=422,
            detail="El parámetro 'desde' debe ser anterior o igual a 'hasta'.",
        )


def _cats_de_proyecto(proyecto_id: int) -> list[CategoriaResumen]:
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
        result[r["proyecto_id"]].append(
            CategoriaResumen(slug=r["slug"], nombre=r["nombre"])
        )
    return result


def _enriquecer(row: dict) -> ProyectoResumen:
    data = dict(row)
    data["es_ley"] = bool(data.get("numero_ley"))
    data["categorias"] = _cats_de_proyecto(data["id"])
    return ProyectoResumen(**data)


def _enriquecer_batch(rows: list[dict]) -> list[ProyectoResumen]:
    if not rows:
        return []
    ids = [r["id"] for r in rows]
    cats_map = _cats_batch(ids)
    result = []
    for row in rows:
        data = dict(row)
        data["es_ley"] = bool(data.get("numero_ley"))
        data["categorias"] = cats_map.get(data["id"], [])
        result.append(ProyectoResumen(**data))
    return result


# ══════════════════════════════════════════════════════════════════════
# LISTADO CON FILTROS Y PAGINACIÓN
# ══════════════════════════════════════════════════════════════════════

EstadoFiltro = Literal["ley", "discusion", "archivado", "otro"]
OrdenFiltro = Literal["reciente", "antiguo", "expediente", "titulo_az", "titulo_za"]


@router.get("/proyectos", response_model=ProyectosResponse, summary="Listar proyectos")
def listar_proyectos(
    pagina:     int = Query(1, ge=1, le=10_000),
    por_pagina: int = Query(20, ge=1, le=100),
    tipo:       Optional[str]  = Query(None, max_length=120),
    anio:       Optional[int]  = Query(None, ge=1900, le=2100),
    desde:      Optional[date] = Query(None),
    hasta:      Optional[date] = Query(None),
    solo_leyes: bool = Query(False),
    estado:     Optional[EstadoFiltro] = Query(None),
    orden:      OrdenFiltro = Query("reciente"),
    categoria:  Optional[str] = Query(None, max_length=60),
    diputado:   Optional[str] = Query(None, max_length=120),
):
    _validar_rango_fechas(desde, hasta)

    condiciones: list[str] = []
    params: list = []

    if tipo:
        condiciones.append("p.tipo_expediente ILIKE %s ESCAPE '\\'")
        params.append(f"%{_like_escape(tipo)}%")

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

    if estado:
        condiciones.append("p.estado_grupo = %s")
        params.append(estado)

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

    if diputado:
        termino_dip = f"%{_like_escape(diputado)}%"
        condiciones.append(
            """
            EXISTS (
                SELECT 1 FROM proponentes pr
                WHERE pr.proyecto_id = p.id
                  AND (pr.apellidos ILIKE %s ESCAPE '\\'
                       OR pr.nombre    ILIKE %s ESCAPE '\\'
                       OR CONCAT(pr.nombre, ' ', pr.apellidos) ILIKE %s ESCAPE '\\'
                       OR CONCAT(pr.apellidos, ' ', pr.nombre) ILIKE %s ESCAPE '\\')
            )
            """
        )
        params.extend([termino_dip, termino_dip, termino_dip, termino_dip])

    where = ("WHERE " + " AND ".join(condiciones)) if condiciones else ""

    orden_sql = {
        "reciente":   "p.fecha_inicio DESC NULLS LAST",
        "antiguo":    "p.fecha_inicio ASC NULLS LAST",
        "expediente": "p.numero_expediente DESC",
        "titulo_az":  "p.titulo ASC NULLS LAST",
        "titulo_za":  "p.titulo DESC NULLS LAST",
    }[orden]

    total = fetchval(f"SELECT COUNT(*) FROM proyectos p {where}", tuple(params)) or 0
    total_paginas = max(1, math.ceil(total / por_pagina))

    if total > 0 and pagina > total_paginas:
        return ProyectosResponse(
            datos=[],
            paginacion=Paginacion(
                total=total, pagina=pagina, por_pagina=por_pagina,
                total_paginas=total_paginas,
            ),
        )

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
            p.estado_actual,
            p.estado_grupo,
            p.creado_en,
            COUNT(DISTINCT pr.id)   AS total_proponentes,
            COUNT(DISTINCT tr.id)   AS total_tramites
        FROM proyectos p
        LEFT JOIN proponentes pr  ON pr.proyecto_id  = p.id
        LEFT JOIN tramitacion tr  ON tr.proyecto_id  = p.id
        {where}
        GROUP BY p.id
        ORDER BY {orden_sql}
        LIMIT %s OFFSET %s
    """

    rows = fetchall(sql, tuple(params_paginado))
    datos = _enriquecer_batch(rows)

    return ProyectosResponse(
        datos=datos,
        paginacion=Paginacion(
            total=total, pagina=pagina, por_pagina=por_pagina,
            total_paginas=total_paginas,
        ),
    )


# ══════════════════════════════════════════════════════════════════════
# BÚSQUEDA
# ══════════════════════════════════════════════════════════════════════

@router.get("/proyectos/buscar", response_model=ProyectosResponse, summary="Buscar proyectos")
def buscar_proyectos(
    q:          str = Query(..., min_length=2, max_length=200),
    desde:      Optional[date] = Query(None),
    hasta:      Optional[date] = Query(None),
    pagina:     int = Query(1, ge=1, le=10_000),
    por_pagina: int = Query(20, ge=1, le=100),
):
    _validar_rango_fechas(desde, hasta)

    termino = f"%{_like_escape(q.strip())}%"

    condiciones = [
        """
        (
            p.titulo ILIKE %s ESCAPE '\\'
            OR EXISTS (
                SELECT 1 FROM proponentes pr
                WHERE pr.proyecto_id = p.id
                  AND (pr.apellidos ILIKE %s ESCAPE '\\' OR pr.nombre ILIKE %s ESCAPE '\\')
            )
            OR EXISTS (
                SELECT 1 FROM tramitacion tr
                WHERE tr.proyecto_id = p.id
                  AND tr.organo ILIKE %s ESCAPE '\\'
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
    """

    total = fetchval(
        f"SELECT COUNT(DISTINCT p.id) {from_sql} {where_sql}",
        tuple(params),
    ) or 0
    total_paginas = max(1, math.ceil(total / por_pagina))

    if total > 0 and pagina > total_paginas:
        return ProyectosResponse(
            datos=[],
            paginacion=Paginacion(
                total=total, pagina=pagina, por_pagina=por_pagina,
                total_paginas=total_paginas,
            ),
        )

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
            p.estado_actual,
            p.estado_grupo,
            p.creado_en,
            COUNT(DISTINCT pr2.id)   AS total_proponentes,
            COUNT(DISTINCT tr2.id)   AS total_tramites
        {from_sql}
        {join_sql}
        {where_sql}
        GROUP BY p.id
        ORDER BY p.fecha_inicio DESC NULLS LAST
        LIMIT %s OFFSET %s
    """

    rows = fetchall(sql, tuple(params_query))
    datos = _enriquecer_batch(rows)

    return ProyectosResponse(
        datos=datos,
        paginacion=Paginacion(
            total=total, pagina=pagina, por_pagina=por_pagina,
            total_paginas=total_paginas,
        ),
    )


# ══════════════════════════════════════════════════════════════════════
# DETALLE
# ══════════════════════════════════════════════════════════════════════

@router.get(
    "/proyectos/{numero_expediente}",
    response_model=ProyectoDetalle,
    summary="Detalle de un proyecto",
)
def detalle_proyecto(numero_expediente: int):
    if numero_expediente < 1:
        raise HTTPException(422, "numero_expediente debe ser positivo.")

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
            p.estado_actual,
            p.estado_grupo,
            p.creado_en,
            COUNT(DISTINCT pr.id)  AS total_proponentes,
            COUNT(DISTINCT tr.id)  AS total_tramites
        FROM proyectos p
        LEFT JOIN proponentes pr  ON pr.proyecto_id  = p.id
        LEFT JOIN tramitacion tr  ON tr.proyecto_id  = p.id
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

    prop_rows = fetchall(
        "SELECT secuencia, apellidos, nombre FROM proponentes WHERE proyecto_id = %s ORDER BY secuencia",
        (row["id"],),
    )
    proponentes = [Proponente(**p) for p in prop_rows]

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

    categorias = _cats_de_proyecto(row["id"])

    data = dict(row)
    data["es_ley"] = bool(data.get("numero_ley"))
    data["proponentes"] = proponentes
    data["tramitacion"] = tramitacion
    data["categorias"] = categorias

    return ProyectoDetalle(**data)


# ══════════════════════════════════════════════════════════════════════
# TIPOS DE EXPEDIENTE
# ══════════════════════════════════════════════════════════════════════

@router.get("/proyectos-tipos", summary="Tipos de expediente disponibles")
def tipos_expediente():
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
