"""
routers/partidos.py
──────────────────────────────────────────────────────────────────────
Endpoints para partidos políticos e historial de diputados por partido.

Endpoints
─────────
  GET /api/v1/partidos                     → lista de partidos (filtrable por administración)
  GET /api/v1/partidos/{id}/diputados      → diputados de un partido en una administración
  GET /api/v1/diputados/{nombre}/partidos  → historial de partidos de un diputado
"""

import time
from typing import Optional
from fastapi import APIRouter, Query
from collections import OrderedDict

from database import fetchall, fetchone
from models import PartidoResumen, PartidosResponse, HistorialPartido

router = APIRouter()

# Caché liviano — los partidos cambian muy raramente
_cache: "OrderedDict[str, dict]" = OrderedDict()
_CACHE_TTL  = 600   # 10 min
_CACHE_MAX  = 32


def _cache_get(key: str):
    entry = _cache.get(key)
    if entry and (time.time() - entry["time"]) < _CACHE_TTL:
        _cache.move_to_end(key)
        return entry["data"]
    _cache.pop(key, None)
    return None


def _cache_set(key: str, data) -> None:
    _cache[key] = {"time": time.time(), "data": data}
    _cache.move_to_end(key)
    while len(_cache) > _CACHE_MAX:
        _cache.popitem(last=False)


# ══════════════════════════════════════════════════════════════════════
# GET /partidos
# ══════════════════════════════════════════════════════════════════════

@router.get(
    "/partidos",
    response_model=PartidosResponse,
    summary="Listar partidos políticos",
)
def listar_partidos(
    administracion: Optional[str] = Query(
        None,
        description="Filtrar por administración legislativa, ej. '2022-2026'",
        max_length=20,
    ),
):
    cache_key = f"partidos:{administracion or '_all'}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    if administracion:
        rows = fetchall(
            """
            SELECT
                p.id,
                p.codigo,
                p.nombre,
                COUNT(*) AS total_diputados
            FROM partidos p
            JOIN (
                SELECT DISTINCT ON (TRIM(h.apellidos || ' ' || h.nombre))
                    h.partido_id
                FROM historial_diputados h
                WHERE h.administracion = %s
                ORDER BY TRIM(h.apellidos || ' ' || h.nombre),
                         COALESCE(h.fecha_hasta, '9999-12-31') DESC,
                         h.id DESC
            ) latest ON latest.partido_id = p.id
            GROUP BY p.id, p.codigo, p.nombre
            ORDER BY total_diputados DESC, p.nombre
            """,
            (administracion,),
        )
    else:
        rows = fetchall(
            """
            SELECT
                p.id,
                p.codigo,
                p.nombre,
                COUNT(DISTINCT TRIM(h.apellidos || ' ' || h.nombre)) AS total_diputados
            FROM partidos p
            JOIN historial_diputados h ON h.partido_id = p.id
            GROUP BY p.id, p.codigo, p.nombre
            ORDER BY total_diputados DESC, p.nombre
            """,
        )

    datos = [PartidoResumen(**r) for r in rows]
    resp = PartidosResponse(datos=datos)
    _cache_set(cache_key, resp)
    return resp


# ══════════════════════════════════════════════════════════════════════
# GET /diputados/{nombre_completo}/partidos  — historial de un diputado
# ══════════════════════════════════════════════════════════════════════

@router.get(
    "/diputados/{nombre_completo}/partidos",
    response_model=list[HistorialPartido],
    summary="Historial de partidos de un diputado",
)
def historial_partidos_diputado(nombre_completo: str):
    """
    Devuelve todas las entradas en historial_diputados para el diputado
    identificado por su nombre completo (apellidos + nombre concatenados),
    ordenadas por administración y fecha_desde.
    """
    cache_key = f"dip_partidos:{nombre_completo.lower()}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    rows = fetchall(
        """
        SELECT
            h.partido_id,
            p.codigo,
            p.nombre,
            h.administracion,
            h.fecha_desde  AS desde,
            h.fecha_hasta  AS hasta
        FROM historial_diputados h
        JOIN partidos p ON p.id = h.partido_id
        WHERE unaccent(LOWER(h.apellidos || ' ' || h.nombre))
              = unaccent(LOWER(%s))
        ORDER BY h.administracion DESC, h.fecha_desde DESC
        """,
        (nombre_completo,),
    )

    result = [HistorialPartido(**r) for r in rows]
    _cache_set(cache_key, result)
    return result
