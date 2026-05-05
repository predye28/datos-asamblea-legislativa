function toFotoSlug(nombreCompleto: string): string {
  return Array.from(nombreCompleto.toLowerCase().normalize('NFD'))
    .filter(ch => { const c = ch.charCodeAt(0); return c < 0x0300 || c > 0x036F })
    .join('')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

export function getFotoUrl(nombreCompleto: string): string {
  if (!nombreCompleto) return ''
  return `/diputados/fotos/${toFotoSlug(nombreCompleto)}.jpg`
}
