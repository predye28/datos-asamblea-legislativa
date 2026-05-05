/**
 * partidos.ts
 * Paleta de colores oficial de los partidos políticos de Costa Rica.
 * Cubre los partidos modernos más relevantes (2002-2026) y los históricos
 * más importantes. Los colores siguen la identidad visual reconocible de
 * cada partido; los independientes usan un gris neutro.
 */

export interface PartidoPaleta {
  /** Color primario del partido (fondo de badge, punto en gráfico) */
  bg:   string
  /** Color del texto sobre el fondo primario */
  text: string
  /** Versión suave para fondo de chip/tag */
  soft: string
  /** Borde del chip */
  border: string
}

/** Mapa de código de partido → paleta */
const PALETAS: Record<string, PartidoPaleta> = {
  // ── Liberación Nacional (verde) ──────────────────────────────────────
  LN: { bg: '#1a7a3a', text: '#fff', soft: '#e6f4eb', border: '#1a7a3a' },

  // ── Unidad Social Cristiana (azul) ──────────────────────────────────
  USC: { bg: '#0057a8', text: '#fff', soft: '#e5eef9', border: '#0057a8' },

  // ── Acción Ciudadana (amarillo) ──────────────────────────────────────
  AC: { bg: '#f5a623', text: '#2d1800', soft: '#fef7e8', border: '#f5a623' },

  // ── Progreso Social Democrático (azul/verde) ────────────────────────
  PSD: { bg: '#040F9F', text: '#fff', soft: '#e6e7f5', border: '#040F9F' },

  // ── Frente Amplio (amarillo) ─────────────────────────────────────────
  PFA: { bg: '#FFD600', text: '#1a1100', soft: '#fffbe6', border: '#FFD600' },

  // ── Nueva República (azul oscuro) ───────────────────────────────────
  NR: { bg: '#1b2f6e', text: '#fff', soft: '#e8ecf7', border: '#1b2f6e' },

  // ── Restauración Nacional (azul y amarillo) ──────────────────────────
  RN: { bg: '#0056B3', text: '#fff', soft: '#e6eff7', border: '#0056B3' },

  // ── Liberal Progresista (naranja) ────────────────────────────────────
  LP: { bg: '#F37021', text: '#fff', soft: '#fef0e8', border: '#F37021' },

  // ── Movimiento Libertario (rojo) ─────────────────────────────────────
  ML: { bg: '#D60228', text: '#fff', soft: '#fbe6ea', border: '#D60228' },

  // ── Republicano Social Cristiano (azul celeste) ──────────────────────
  RSC: { bg: '#2980b9', text: '#fff', soft: '#e8f4fb', border: '#2980b9' },

  // ── Integración Nacional (verde esmeralda) ───────────────────────────
  IN: { bg: '#16a085', text: '#fff', soft: '#e6f6f4', border: '#16a085' },

  // ── Accesibilidad sin Exclusión (verde lima) ─────────────────────────
  ASE: { bg: '#5d8a2c', text: '#fff', soft: '#eef5e7', border: '#5d8a2c' },

  // ── Renovación Costarricense (azul pizarra) ──────────────────────────
  RC: { bg: '#2c3e6b', text: '#fff', soft: '#e8ecf4', border: '#2c3e6b' },

  // ── Alianza Demócrata Cristiana (naranja coral) ──────────────────────
  ADC: { bg: '#d35400', text: '#fff', soft: '#faeee6', border: '#d35400' },

  // ── Fuerza Democrática (rojo carmín) ────────────────────────────────
  FD: { bg: '#a93226', text: '#fff', soft: '#f9ecea', border: '#a93226' },

  // ── Unión Nacional / Unificación Nacional (azul marino) ─────────────
  UN:  { bg: '#154360', text: '#fff', soft: '#e7eff8', border: '#154360' },
  PUN: { bg: '#154360', text: '#fff', soft: '#e7eff8', border: '#154360' },

  // ── Unidad (transición USC) ──────────────────────────────────────────
  UNI: { bg: '#2471a3', text: '#fff', soft: '#e8f4fb', border: '#2471a3' },

  // ── Pueblo Unido (rojo) ──────────────────────────────────────────────
  PU: { bg: '#b03a2e', text: '#fff', soft: '#f9ecea', border: '#b03a2e' },

  // ── Republicano Nacional (azul noche) ───────────────────────────────
  PRN: { bg: '#1c2951', text: '#fff', soft: '#e7eaf4', border: '#1c2951' },

  // ── Demócrata (gris azulado) ─────────────────────────────────────────
  PD: { bg: '#566573', text: '#fff', soft: '#edf0f2', border: '#566573' },

  // ── Independiente (agrupado) — gris neutro ───────────────────────────
  IND: { bg: '#6c757d', text: '#fff', soft: '#f0f0f0', border: '#6c757d' },
  PI:  { bg: '#6c757d', text: '#fff', soft: '#f0f0f0', border: '#6c757d' },
}

/** Paleta por defecto para partidos no mapeados */
const DEFAULT_PALETA: PartidoPaleta = {
  bg: '#8e8e93',
  text: '#fff',
  soft: '#f2f2f7',
  border: '#8e8e93',
}

/**
 * Retorna la paleta de un partido dado su código.
 * Si el código empieza con "DI" (independiente individual), retorna la paleta IND.
 */
export function getPaletaPartido(codigo: string): PartidoPaleta {
  if (!codigo) return DEFAULT_PALETA
  const upper = codigo.toUpperCase()
  if (PALETAS[upper]) return PALETAS[upper]
  // Todos los independientes individuales (DI...) reciben la paleta gris
  if (upper.startsWith('DI')) return PALETAS.IND
  return DEFAULT_PALETA
}

/**
 * Retorna el color primario (bg) para uso directo en gráficos.
 * Recibe lista de códigos y devuelve array de colores en el mismo orden.
 */
export function getColoresGrafico(codigos: string[]): string[] {
  return codigos.map(c => getPaletaPartido(c).bg)
}

const CODIGOS_CON_BANDERA = new Set([
  'AC', 'ADC', 'ASE', 'FD', 'IN', 'LN', 'LP', 'ML',
  'NR', 'PFA', 'PSD', 'PU', 'RC', 'RN', 'RSC', 'UN', 'USC',
])

export function getBanderaUrl(codigo: string): string | null {
  if (!codigo) return null
  if (CODIGOS_CON_BANDERA.has(codigo.toUpperCase())) {
    return `/partidos/banderas/${codigo.toLowerCase()}.jpg`
  }
  return null
}

/** Diccionario de mapeo de códigos oficiales a siglas populares */
export const SIGLAS_POPULARES: Record<string, string> = {
  'LN': 'PLN',
  'USC': 'PUSC',
  'AC': 'PAC',
  'PSD': 'PPSD',
  'PFA': 'FA',
  'NR': 'PNR',
  'RN': 'PRN',
  'LP': 'PLP',
  'ML': 'PML',
  'RSC': 'PRSC',
  'IN': 'PIN',
  'ASE': 'PASE',
  'RC': 'PRC',
  'FD': 'PFD',
  'UN': 'PUN'
}

/**
 * Retorna la sigla popular de un partido dado su código oficial.
 * Si no tiene una sigla popular mapeada, retorna el código original.
 */
export function getSiglasPopulares(codigo: string): string {
  if (!codigo) return ''
  const upper = codigo.toUpperCase()
  // Si empieza con DI, es un diputado independiente
  if (upper.startsWith('DI')) return 'IND'
  return SIGLAS_POPULARES[upper] || upper
}
