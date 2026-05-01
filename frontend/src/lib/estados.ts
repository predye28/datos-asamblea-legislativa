import type { Dictionary } from '@/i18n/dictionaries/es'

export type EstadoGrupo = 'ley' | 'discusion' | 'archivado' | 'otro'

// Clave UI categorizada que NOSOTROS asignamos. Se traduce vía dict.estado.
export type EstadoEtiquetaKey =
  | 'leyVigente'
  | { kind: 'leyNumero'; numero: string }
  | 'archivado'
  | 'enPlenario'
  | 'enComision'
  | 'primerDebate'
  | 'segundoDebate'
  | 'enTramite'
  | { kind: 'raw'; text: string } // Texto oficial del backend; no se traduce.

export interface EstadoInfo {
  grupo: EstadoGrupo
  etiquetaKey: EstadoEtiquetaKey
  textoCompleto: string // Cadena oficial del SIL — nunca se traduce.
}

// Fallback para datos viejos sin estado_grupo poblado.
// La lógica autoritativa vive en el backend (sync_engine.clasificar_estado_grupo).
function clasificarFallback(estadoActual: string | null, esLey: boolean): EstadoGrupo {
  if (esLey) return 'ley'
  const s = (estadoActual || '').toLowerCase()
  if (!s) return 'otro'
  if (s.includes('archiv') || s.includes('desech')) return 'archivado'
  if (
    s.includes('comisión') || s.includes('comision') ||
    s.includes('plenario') ||
    s.includes('estudio') ||
    s.includes('trámite') || s.includes('tramite') ||
    s.includes('primer debate') || s.includes('segundo debate') ||
    s.includes('dictamen')
  ) return 'discusion'
  return 'otro'
}

export function resolverGrupo(
  estadoGrupo: string | null | undefined,
  estadoActual: string | null,
  esLey: boolean,
): EstadoGrupo {
  if (estadoGrupo === 'ley' || estadoGrupo === 'discusion'
      || estadoGrupo === 'archivado' || estadoGrupo === 'otro') {
    return estadoGrupo
  }
  return clasificarFallback(estadoActual, esLey)
}

export function etiquetaEstado(
  estadoActual: string | null,
  esLey: boolean,
  numeroLey?: string | null,
  estadoGrupo?: string | null,
): EstadoInfo {
  const grupo = resolverGrupo(estadoGrupo, estadoActual, esLey)
  const textoCompleto = esLey
    ? `Ley vigente${numeroLey && numeroLey.toUpperCase() !== 'SI' ? ` N.º ${numeroLey}` : ''}`
    : (estadoActual || 'Sin estado registrado')

  let etiquetaKey: EstadoEtiquetaKey
  if (grupo === 'ley') {
    etiquetaKey = (numeroLey && numeroLey.toUpperCase() !== 'SI') ? { kind: 'leyNumero', numero: numeroLey } : 'leyVigente'
  } else if (grupo === 'archivado') {
    etiquetaKey = 'archivado'
  } else if (grupo === 'discusion') {
    const s = (estadoActual || '').toLowerCase()
    if (s.includes('plenario')) etiquetaKey = 'enPlenario'
    else if (s.includes('comisión') || s.includes('comision')) etiquetaKey = 'enComision'
    else if (s.includes('primer debate')) etiquetaKey = 'primerDebate'
    else if (s.includes('segundo debate')) etiquetaKey = 'segundoDebate'
    else etiquetaKey = 'enTramite'
  } else {
    // grupo === 'otro' → mostramos el texto oficial truncado (no se traduce).
    const trimmed = textoCompleto.length > 28 ? textoCompleto.slice(0, 26) + '…' : textoCompleto
    etiquetaKey = { kind: 'raw', text: trimmed }
  }

  return { grupo, etiquetaKey, textoCompleto }
}

// Resuelve la clave a string usando el diccionario activo.
export function renderEtiquetaEstado(key: EstadoEtiquetaKey, dict: Dictionary): string {
  if (typeof key === 'string') return dict.estado[key]
  if (key.kind === 'leyNumero') return dict.estado.leyNumero(key.numero)
  return key.text
}

export function getEstadoFiltros(dict: Dictionary): { value: string; label: string }[] {
  return [
    { value: '',          label: dict.estado.filtroTodos },
    { value: 'discusion', label: dict.estado.filtroDiscusion },
    { value: 'ley',       label: dict.estado.filtroLey },
    { value: 'archivado', label: dict.estado.filtroArchivado },
  ]
}
