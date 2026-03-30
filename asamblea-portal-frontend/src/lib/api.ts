// src/lib/api.ts
// Cliente centralizado para consumir la API de la Asamblea

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

// ── Tipos ──────────────────────────────────────────────────────────────

export interface Proponente {
  secuencia: number | null
  apellidos: string | null
  nombre: string | null
}

export interface TramiteItem {
  organo: string | null
  fecha_inicio: string | null
  fecha_termino: string | null
  tipo_tramite: string | null
}

export interface ProyectoResumen {
  id: number
  numero_expediente: number
  titulo: string | null
  tipo_expediente: string | null
  fecha_inicio: string | null
  vencimiento_cuatrienal: string | null
  fecha_publicacion: string | null
  numero_gaceta: string | null
  numero_ley: string | null
  total_proponentes: number
  total_tramites: number
  tiene_documento: boolean
  estado_actual: string | null
  es_ley: boolean
}

export interface ProyectoDetalle extends ProyectoResumen {
  proponentes: Proponente[]
  tramitacion: TramiteItem[]
  documentos: { tipo: string | null; ruta_archivo: string | null }[]
}

export interface Paginacion {
  total: number
  pagina: number
  por_pagina: number
  total_paginas: number
}

export interface ProyectosResponse {
  datos: ProyectoResumen[]
  paginacion: Paginacion
}

export interface MetricaGeneral {
  total_proyectos: number
  total_leyes_aprobadas: number
  tasa_aprobacion_pct: number
  total_diputados_activos: number
  proyectos_este_mes: number
  proyectos_este_anio: number
  promedio_tramites: number
}

export interface DiputadoRanking {
  apellidos: string
  nombre: string
  nombre_completo: string
  total_proyectos: number
}

export interface ProyectosPorMes {
  anio: number
  mes: number
  mes_nombre: string
  total: number
}

export interface OrganoActividad {
  organo: string
  total_tramites: number
}

export interface ProyectosPorTipo {
  tipo: string
  total: number
  porcentaje: number
}

export interface MetricasResponse {
  general: MetricaGeneral
  por_tipo: ProyectosPorTipo[]
  por_mes: ProyectosPorMes[]
  top_diputados: DiputadoRanking[]
  organos_activos: OrganoActividad[]
}

export interface ProximoVencer {
  numero_expediente: number
  titulo: string | null
  tipo_expediente: string | null
  vencimiento_cuatrienal: string | null
  dias_restantes: number
  estado_actual: string | null
  proponentes_resumen: string | null
}

export interface DetallesMes {
  anio: number
  mes: number
  mes_nombre: string
  resumen: {
    total_proyectos: number
    total_leyes: number
    tipos_distintos: number
  }
  top_proponentes: { nombre_completo: string; proyectos: number }[]
  proyectos: {
    numero_expediente: number
    titulo: string | null
    tipo_expediente: string | null
    fecha_inicio: string | null
    numero_ley: string | null
    vencimiento_cuatrienal: string | null
    estado_actual: string | null
  }[]
}

// ── Fetch helper ────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
    next: { revalidate: 300 }, // caché de 5 min en Next.js
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json()
}

// ── Endpoints ───────────────────────────────────────────────────────────

export const api = {
  proyectos: {
    list: (params: {
      pagina?: number
      por_pagina?: number
      tipo?: string
      anio?: number
      solo_leyes?: boolean
      orden?: string
    }) => {
      const qs = new URLSearchParams()
      if (params.pagina)     qs.set('pagina',     String(params.pagina))
      if (params.por_pagina) qs.set('por_pagina', String(params.por_pagina))
      if (params.tipo)       qs.set('tipo',       params.tipo)
      if (params.anio)       qs.set('anio',       String(params.anio))
      if (params.solo_leyes) qs.set('solo_leyes', 'true')
      if (params.orden)      qs.set('orden',      params.orden)
      return apiFetch<ProyectosResponse>(`/proyectos?${qs}`)
    },

    buscar: (q: string, pagina = 1) =>
      apiFetch<ProyectosResponse>(`/proyectos/buscar?q=${encodeURIComponent(q)}&pagina=${pagina}`),

    detalle: (num: number) =>
      apiFetch<ProyectoDetalle>(`/proyectos/${num}`),

    tipos: () =>
      apiFetch<{ tipo_expediente: string; total: number }[]>('/proyectos-tipos'),
  },

  metricas: {
    general: (params: { desde?: string; hasta?: string } = {}) => {
      const qs = new URLSearchParams()
      if (params.desde) qs.set('desde', params.desde)
      if (params.hasta) qs.set('hasta', params.hasta)
      return apiFetch<MetricasResponse>(`/metricas?${qs}`)
    },
    actividadSemanal: () => apiFetch<{ datos: unknown[]; total: number }>('/metricas/actividad-semanal'),
    proximosVencer: (dias = 90) => apiFetch<{ datos: ProximoVencer[]; total: number; dias_consultados: number }>(`/metricas/proximos-vencer?dias=${dias}`),
    lineaTiempo: () => apiFetch<{ datos: { anio: number; leyes_aprobadas: number }[] }>('/metricas/linea-tiempo'),
    detalleMes: (anio: number, mes: number) => apiFetch<DetallesMes>(`/metricas/detalle-mes?anio=${anio}&mes=${mes}`),
  },
}
