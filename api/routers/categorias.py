"""
routers/categorias.py
──────────────────────────────────────────────────────────────────────
Endpoint para el catálogo de categorías temáticas.

Endpoints
─────────
  GET /api/v1/categorias → lista todas las categorías ordenadas
"""

from fastapi import APIRouter

from database import fetchall
from models import Categoria, CategoriasResponse

router = APIRouter()


@router.get(
    "/categorias",
    response_model=CategoriasResponse,
    summary="Listado de categorías temáticas",
)
def listar_categorias():
    """
    Devuelve el catálogo completo de categorías temáticas ordenado por `orden`.
    Útil para poblar filtros y navegación por tema en el front.
    """
    rows = fetchall(
        "SELECT id, slug, nombre, orden FROM categorias ORDER BY orden, nombre"
    )
    return CategoriasResponse(datos=[Categoria(**r) for r in rows])
