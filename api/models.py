"""
models.py — Schemas de respuesta (Pydantic v2)
"""

from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field, computed_field


# ── Bloques reutilizables ──────────────────────────────────────────────

class CategoriaResumen(BaseModel):
    slug:   str
    nombre: str


class Categoria(BaseModel):
    id:     int
    slug:   str
    nombre: str
    orden:  int = 0

class Proponente(BaseModel):
    secuencia: Optional[int]    = None
    apellidos: Optional[str]    = None
    nombre:    Optional[str]    = None

    @computed_field
    @property
    def nombre_completo(self) -> str:
        return f"{self.apellidos or ''} {self.nombre or ''}".strip()


class TramiteItem(BaseModel):
    organo:       Optional[str]  = None
    fecha_inicio: Optional[date] = None
    fecha_termino: Optional[date] = None
    tipo_tramite: Optional[str]  = None


class DocumentoItem(BaseModel):
    tipo:         Optional[str] = None
    ruta_archivo: Optional[str] = None


# ── Proyecto en listado (tarjeta resumida) ────────────────────────────

class ProyectoResumen(BaseModel):
    id:                     int
    numero_expediente:      int
    titulo:                 Optional[str]  = None
    tipo_expediente:        Optional[str]  = None
    fecha_inicio:           Optional[date] = None
    vencimiento_cuatrienal: Optional[date] = None
    fecha_publicacion:      Optional[date] = None
    numero_gaceta:          Optional[str]  = None
    numero_ley:             Optional[str]  = None
    creado_en:              Optional[datetime] = None
    # Campos calculados / enriquecidos
    total_proponentes:      int = 0
    total_tramites:         int = 0
    tiene_documento:        bool = False
    estado_actual:          Optional[str] = None   # último órgano en tramitación
    es_ley:                 bool = False            # tiene numero_ley
    categorias:             list[CategoriaResumen] = []


# ── Proyecto completo (vista de detalle) ─────────────────────────────────

class ProyectoDetalle(ProyectoResumen):
    proponentes: list[Proponente]  = []
    tramitacion: list[TramiteItem] = []
    documentos:  list[DocumentoItem] = []


# ── Paginación genérica ────────────────────────────────────────────────

class Paginacion(BaseModel):
    total:        int
    pagina:       int
    por_pagina:   int
    total_paginas: int


class ProyectosResponse(BaseModel):
    datos:      list[ProyectoResumen]
    paginacion: Paginacion


# ── Métricas ciudadanas ────────────────────────────────────────────────

class MetricaGeneral(BaseModel):
    total_proyectos:         int
    total_leyes_aprobadas:   int
    tasa_aprobacion_pct:     float          # porcentaje redondeado
    total_diputados_activos: int
    proyectos_este_mes:      int
    proyectos_este_anio:     int
    promedio_tramites:       float
    promedio_dias_aprobacion: int = 0


class ProyectosPorTipo(BaseModel):
    tipo:  str
    total: int
    porcentaje: float


class ProyectosPorMes(BaseModel):
    anio:  int
    mes:   int
    mes_nombre: str
    total: int


class DiputadoRanking(BaseModel):
    apellidos: str
    nombre:    str
    nombre_completo: str
    total_proyectos: int


class OrganoActividad(BaseModel):
    organo: str
    total_tramites: int


class ProyectosPorCategoria(BaseModel):
    categoria: str
    slug: str
    total: int
    porcentaje: float
    leyes_aprobadas: int = 0
    tasa_aprobacion: float = 0.0


class MetricasResponse(BaseModel):
    general:          MetricaGeneral
    por_tipo:         list[ProyectosPorTipo]
    por_mes:          list[ProyectosPorMes]       # últimos 12 meses
    top_diputados:    list[DiputadoRanking]        # top 10
    organos_activos:  list[OrganoActividad]        # top 10 más activos
    por_categoria:    list[ProyectosPorCategoria]  # top temas


# ── Respuesta de catálogo de categorías ──────────────────────────────────

class CategoriasResponse(BaseModel):
    datos: list[Categoria]
