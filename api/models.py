"""
models.py — Schemas de respuesta (Pydantic v2)
"""

from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field


# ── Bloques reutilizables ──────────────────────────────────────────────

class Proponente(BaseModel):
    secuencia: Optional[int]    = None
    apellidos: Optional[str]    = None
    nombre:    Optional[str]    = None

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


# ── Proyecto completo (vista de detalle) ─────────────────────────────

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


class MetricasResponse(BaseModel):
    general:          MetricaGeneral
    por_tipo:         list[ProyectosPorTipo]
    por_mes:          list[ProyectosPorMes]       # últimos 12 meses
    top_diputados:    list[DiputadoRanking]        # top 10
    organos_activos:  list[OrganoActividad]        # top 10 más activos
