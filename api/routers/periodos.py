"""
routers/periodos.py
──────────────────────────────────────────────────────────────────────
Períodos legislativos derivados dinámicamente de los datos en BD.

Un período legislativo costarricense dura 4 años.  Los diputados toman
posesión el 1 de mayo (p.ej. 2022-05-01 → 2026-04-30), que es la fecha
que usa esta API para delimitar períodos.  El 8 de mayo es el traspaso
de poderes de la presidencia, que es un evento distinto.

Esta API recorre el rango cubierto por los expedientes existentes y
devuelve solo los períodos que efectivamente tienen al menos un proyecto,
así el frontend nunca muestra períodos vacíos ni se queda atrás cuando
entran datos de un período nuevo.

Endpoint
────────
  GET /api/v1/periodos → lista de {label, desde, hasta}, más recientes primero
"""

import time
from datetime import date

from fastapi import APIRouter

from database import fetchone
from models import PeriodosResponse, PeriodoLegislativo

router = APIRouter()

_CACHE: dict = {"time": 0.0, "data": None}
_CACHE_TTL = 600  # 10 min — los períodos cambian muy de vez en cuando


def _periodo_inicio(d: date) -> date:
    """Devuelve la fecha 1 de mayo del período legislativo al que pertenece `d`.

    Los diputados costarricenses toman posesión el 1 de mayo cada cuatro
    años (2006, 2010, 2014, 2018, 2022, 2026…).  Antes de esa fecha el día
    de inicio corresponde al período del año anterior.
    """
    # Antes del 1 de mayo: aún corresponde al período del año anterior.
    anio = d.year if (d.month, d.day) >= (5, 1) else d.year - 1
    offset = (anio - 1994) % 4
    return date(anio - offset, 5, 1)


@router.get(
    "/periodos",
    response_model=PeriodosResponse,
    summary="Períodos legislativos disponibles según datos en BD",
)
def listar_periodos():
    cached = _CACHE["data"]
    if cached is not None and (time.time() - _CACHE["time"]) < _CACHE_TTL:
        return cached

    row = fetchone(
        "SELECT MIN(fecha_inicio) AS min_f, MAX(fecha_inicio) AS max_f "
        "FROM proyectos WHERE fecha_inicio IS NOT NULL"
    )
    periodos: list[PeriodoLegislativo] = []
    if row and row["min_f"] and row["max_f"]:
        cursor = _periodo_inicio(row["min_f"])
        fin = row["max_f"]
        while cursor <= fin:
            siguiente = date(cursor.year + 4, 5, 1)
            hasta = date(siguiente.year, 4, 30)
            periodos.append(PeriodoLegislativo(
                label=f"{cursor.year}-{siguiente.year}",
                desde=cursor,
                hasta=hasta,
            ))
            cursor = siguiente

    periodos.reverse()  # más reciente primero
    resp = PeriodosResponse(datos=periodos)
    _CACHE["time"] = time.time()
    _CACHE["data"] = resp
    return resp
