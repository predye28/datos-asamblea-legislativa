export type EstadoGrupo = 'ley' | 'discusion' | 'archivado' | 'otro'

export interface EstadoInfo {
  grupo: EstadoGrupo
  etiqueta: string
  textoCompleto: string
}

export function clasificarEstado(estadoActual: string | null, esLey: boolean): EstadoGrupo {
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

export function etiquetaEstado(estadoActual: string | null, esLey: boolean, numeroLey?: string | null): EstadoInfo {
  const grupo = clasificarEstado(estadoActual, esLey)
  const textoCompleto = esLey
    ? `Ley vigente${numeroLey ? ` N.º ${numeroLey}` : ''}`
    : (estadoActual || 'Sin estado registrado')

  let etiqueta = textoCompleto
  if (grupo === 'ley') etiqueta = numeroLey ? `LEY N.º ${numeroLey}` : 'LEY VIGENTE'
  else if (grupo === 'archivado') etiqueta = 'Archivado'
  else if (grupo === 'discusion') {
    const s = (estadoActual || '').toLowerCase()
    if (s.includes('plenario')) etiqueta = 'En plenario'
    else if (s.includes('comisión') || s.includes('comision')) etiqueta = 'En comisión'
    else if (s.includes('primer debate')) etiqueta = 'Primer debate'
    else if (s.includes('segundo debate')) etiqueta = 'Segundo debate'
    else etiqueta = 'En trámite'
  } else if (grupo === 'otro') {
    etiqueta = textoCompleto.length > 28 ? textoCompleto.slice(0, 26) + '…' : textoCompleto
  }

  return { grupo, etiqueta, textoCompleto }
}

export const ESTADO_FILTROS: { value: string; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'discusion', label: 'En discusión' },
  { value: 'ley', label: 'Ley vigente' },
  { value: 'archivado', label: 'Archivado' },
]
