export const getPeriodos = () => {
  const d = new Date()
  let startYear = d.getFullYear()
  while ((startYear % 4) !== 2) startYear--
  if (d.getFullYear() === startYear && d.getMonth() < 4) startYear -= 4
  const endYear = startYear + 4
  return [
    { label: 'Este mes',  desde: () => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01` },
    { label: '6 meses',   desde: () => { const d6=new Date(); d6.setMonth(d6.getMonth()-6); return d6.toISOString().slice(0,10) } },
    { label: 'Este año',  desde: () => `${d.getFullYear()}-01-01` },
    { label: `Período ${startYear}-${String(endYear).slice(2)}`, desde: () => `${startYear}-05-01` },
  ]
}

export const getAllLegislativePeriods = () => {
  const periods = []
  const now = new Date()
  const currentYear = now.getFullYear()
  let startYear = 1994
  while (startYear <= currentYear) {
    if (startYear === currentYear && now.getMonth() < 4) break
    const endYear = startYear + 4
    periods.push({ label: `${startYear}-${endYear}`, desde: `${startYear}-05-01`, hasta: `${endYear}-04-30` })
    startYear = endYear
  }
  return periods.reverse()
}
