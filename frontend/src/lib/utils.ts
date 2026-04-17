export function formatDateES(date: Date): string {
  const day = date.getDate()
  const month = date.toLocaleString('es-CR', { month: 'long' })
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

export function cleanText(text: string | null | undefined): string {
  if (!text) return ''
  let c = text.replace(/[\x00-\x1F\x7F-\x9F]/g, '')
  c = c.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  return c.trim().replace(/\s+/g, ' ')
}

export function formatTitle(title: string | null | undefined): string {
  const t = cleanText(title).toLowerCase()
  if (!t) return 'Sin título'
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export function formatQuantity(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

export function formatName(name: string | null | undefined): string {
  const t = cleanText(name).toLowerCase()
  if (!t) return ''
  return t.split(' ').filter(w => w.length > 0).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-CR', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  } catch { return dateStr }
}
