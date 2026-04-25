const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

export interface Categoria {
  id: number
  slug: string
  nombre: string
  orden: number
}

export interface CategoriaResumen {
  slug: string
  nombre: string
}

export interface Proponente {
  secuencia: number | null
  apellidos: string | null
  nombre: string | null
  nombre_completo?: string
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
  categorias: CategoriaResumen[]
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
  promedio_dias_aprobacion: number
}

export interface DiputadoRanking {
  apellidos: string
  nombre: string
  nombre_completo: string
  total_proyectos: number
}

export interface DiputadoEficacia {
  apellidos: string
  nombre: string
  nombre_completo: string
  total_proyectos: number
  leyes_aprobadas: number
  tasa_aprobacion: number
}

export interface PerfilDiputado {
  nombre_completo: string
  total_proyectos: number
  total_leyes: number
  tasa_aprobacion: number
  primer_proyecto: string
  ultimo_proyecto: string
  por_periodo: { periodo: string; total: number; leyes: number }[]
  temas: { tema: string; slug: string; total: number }[]
  ultimos_proyectos: {
    numero_expediente: number
    titulo: string | null
    fecha_inicio: string | null
    numero_ley: string | null
    estado_actual: string | null
  }[]
}

export interface ProyectosPorMes {
  anio: number
  mes: number
  mes_nombre: string
  total: number
}

export interface MetricasResponse {
  general: MetricaGeneral
  por_tipo: { tipo: string; total: number; porcentaje: number }[]
  por_mes: ProyectosPorMes[]
  top_diputados: DiputadoRanking[]
  top_diputados_eficacia?: DiputadoEficacia[]
  organos_activos: { organo: string; total_tramites: number }[]
  por_categoria: {
    categoria: string
    slug: string
    total: number
    porcentaje: number
    leyes_aprobadas: number
    tasa_aprobacion: number
  }[]
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

export class ApiError extends Error {
  status: number
  path: string
  constructor(status: number, path: string, message?: string) {
    super(message || `API error ${status}: ${path}`)
    this.name = 'ApiError'
    this.status = status
    this.path = path
  }
}

const DEFAULT_TIMEOUT_MS = 12_000
const MAX_RETRIES = 2 // total attempts = MAX_RETRIES + 1

function wait(ms: number) {
  return new Promise(res => setTimeout(res, ms))
}

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const isDev = process.env.NODE_ENV === 'development'
  let lastError: unknown

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), DEFAULT_TIMEOUT_MS)

    try {
      const res = await fetch(`${BASE}${path}`, {
        ...opts,
        signal: opts?.signal ?? ctrl.signal,
        headers: { 'Content-Type': 'application/json', ...opts?.headers },
        next: { revalidate: isDev ? 0 : 300 },
      })
      clearTimeout(timer)

      // Don't retry client errors (4xx) — they won't change.
      if (!res.ok) {
        if (res.status >= 400 && res.status < 500) {
          throw new ApiError(res.status, path)
        }
        throw new ApiError(res.status, path)
      }
      return await res.json() as T
    } catch (err) {
      clearTimeout(timer)
      lastError = err

      const isClientErr = err instanceof ApiError && err.status >= 400 && err.status < 500
      if (isClientErr || attempt === MAX_RETRIES) break

      // Exponential backoff: 400ms, 1s
      await wait(400 * Math.pow(2.5, attempt))
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`API fetch failed: ${path}`)
}

export const api = {
  proyectos: {
    list: (params: {
      pagina?: number
      por_pagina?: number
      tipo?: string
      anio?: number
      desde?: string
      hasta?: string
      solo_leyes?: boolean
      estado?: string
      orden?: string
      categoria?: string
      diputado?: string
    }) => {
      const qs = new URLSearchParams()
      if (params.pagina)     qs.set('pagina',     String(params.pagina))
      if (params.por_pagina) qs.set('por_pagina', String(params.por_pagina))
      if (params.tipo)       qs.set('tipo',       params.tipo)
      if (params.anio)       qs.set('anio',       String(params.anio))
      if (params.desde)      qs.set('desde',      params.desde)
      if (params.hasta)      qs.set('hasta',      params.hasta)
      if (params.solo_leyes) qs.set('solo_leyes', 'true')
      if (params.estado)     qs.set('estado',     params.estado)
      if (params.orden)      qs.set('orden',      params.orden)
      if (params.categoria)  qs.set('categoria',  params.categoria)
      if (params.diputado)   qs.set('diputado',   params.diputado)
      return apiFetch<ProyectosResponse>(`/proyectos?${qs}`)
    },
    buscar: (q: string, pagina = 1, desde?: string, hasta?: string) => {
      const qs = new URLSearchParams({ q, pagina: String(pagina) })
      if (desde) qs.set('desde', desde)
      if (hasta) qs.set('hasta', hasta)
      return apiFetch<ProyectosResponse>(`/proyectos/buscar?${qs}`)
    },
    detalle: (num: number) => apiFetch<ProyectoDetalle>(`/proyectos/${num}`),
    tipos: () => apiFetch<{ tipo_expediente: string; total: number }[]>('/proyectos-tipos'),
  },

  metricas: {
    general: (params: { desde?: string; hasta?: string } = {}) => {
      const qs = new URLSearchParams()
      if (params.desde) qs.set('desde', params.desde)
      if (params.hasta) qs.set('hasta', params.hasta)
      return apiFetch<MetricasResponse>(`/metricas?${qs}`)
    },
    proximosVencer: (dias = 90) =>
      apiFetch<{ datos: ProximoVencer[]; total: number; dias_consultados: number }>(
        `/metricas/proximos-vencer?dias=${dias}`
      ),
    lineaTiempo: () =>
      apiFetch<{ datos: { anio: number; leyes_aprobadas: number }[] }>('/metricas/linea-tiempo'),
    diputados: (params: { desde?: string; hasta?: string; q?: string }) => {
      const qs = new URLSearchParams()
      if (params.desde) qs.set('desde', params.desde)
      if (params.hasta) qs.set('hasta', params.hasta)
      if (params.q)     qs.set('q', params.q)
      return apiFetch<{ datos: DiputadoRanking[]; total: number }>(`/metricas/diputados?${qs}`)
    },
    perfilDiputado: (nombre: string) =>
      apiFetch<PerfilDiputado>(`/metricas/diputados/${encodeURIComponent(nombre)}`),
  },

  categorias: {
    listar: () => apiFetch<{ datos: Categoria[] }>('/categorias'),
  },
}
