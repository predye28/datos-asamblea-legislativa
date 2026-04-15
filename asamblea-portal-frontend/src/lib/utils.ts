/**
 * Utilidades generales para el portal ciudadano
 */

/**
 * Limpia y sanitiza texto proveniente de la base de datos.
 * Corrige errores de codificación, caracteres nulos y normaliza espacios.
 */
export function cleanText(text: string | null | undefined): string {
  if (!text) return ''
  
  // 1. Eliminar caracteres de control y nulos (\x00, \u0000, etc)
  let cleaned = text.replace(/[\x00-\x1F\x7F-\x9F]/g, "")
  
  // 2. Corregir errores de codificación comunes de la plataforma legislativa
  // (A veces el scraper jala cosas mal codificadas del backend de la Asamblea)
  cleaned = cleaned.replace(/&quot;/g, '"')
  cleaned = cleaned.replace(/&amp;/g, '&')
  cleaned = cleaned.replace(/&lt;/g, '<')
  cleaned = cleaned.replace(/&gt;/g, '>')
  
  // 3. Normalizar espacios
  cleaned = cleaned.trim().replace(/\s+/g, ' ')
  
  return cleaned
}

/**
 * Formatea un título en Sentence Case robusto
 */
export function formatTitle(title: string | null | undefined): string {
  const text = cleanText(title).toLowerCase()
  if (!text) return 'Sin título'
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * Maneja el pluralismo de cantidades para etiquetas (ej: "1 paso" vs "2 pasos")
 */
export function formatQuantity(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

/**
 * Formatea nombres propios (Sentence Case para cada palabra)
 */
export function formatName(name: string | null | undefined): string {
  const text = cleanText(name).toLowerCase()
  if (!text) return ''
  return text
    .split(' ')
    .filter(w => w.length > 0)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
