// src/lib/periodos.ts

export const getPeriodos = () => {
  const d = new Date()
  let currYear = d.getFullYear()
  
  // Los períodos legislativos en CR inician el 1 de mayo cada 4 años.
  // Esos años son múltiplos de 4 más 2 (ej: 2014, 2018, 2022, 2026).
  let startYear = currYear
  while ((startYear % 4) !== 2) {
    startYear--
  }
  
  // Si estamos en el año de elección pero antes del 1 de mayo (mes 4 en JS, 0-indexed), 
  // todavía estamos en el período anterior.
  if (currYear === startYear && d.getMonth() < 4) {
    startYear -= 4
  }
  
  const endYear = startYear + 4

  return [
    {
      label: 'Este mes',
      desde: () => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    },
    {
      label: '6 meses',
      desde: () => {
        const d6 = new Date()
        d6.setMonth(d6.getMonth() - 6)
        return d6.toISOString().slice(0, 10)
      }
    },
    {
      label: 'Este año',
      desde: () => `${d.getFullYear()}-01-01`
    },
    {
      label: `Período ${startYear}-${String(endYear).slice(2)}`,
      desde: () => `${startYear}-05-01`
    }
  ]
}

export const getAllLegislativePeriods = () => {
  const periods = []
  const now = new Date()
  const currentYear = now.getFullYear()
  
  // Iniciamos en 1994 (periodo democrático moderno estable para esta data)
  let startYear = 1994
  
  // Generar periodos hasta que el startYear supere al año actual
  while (startYear <= currentYear) {
    if (startYear === currentYear && now.getMonth() < 4) {
      break;
    }
    const endYear = startYear + 4
    periods.push({
      label: `${startYear}-${endYear}`,
      desde: `${startYear}-05-01`,
      hasta: `${endYear}-04-30`
    })
    startYear = endYear
  }
  
  // Invertir para mostrar el más reciente primero
  return periods.reverse()
}
