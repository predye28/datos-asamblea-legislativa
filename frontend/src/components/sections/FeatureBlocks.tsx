import { api } from '@/lib/api'
import type { MetricasResponse } from '@/lib/api'
import FeatureBlocksGrid, { type DataItem } from './FeatureBlocksGrid'
import styles from './FeatureBlocks.module.css'

const fmt = (n: number | undefined | null): string =>
  n == null ? '—' : n.toLocaleString('es-CR')

function buildProyectos(data: MetricasResponse | null): DataItem[] {
  if (!data) {
    return [
      { value: '—', label: 'proyectos registrados' },
      { value: '—', label: 'presentados este año' },
      { value: '—', label: 'de aprobación histórica' },
    ]
  }
  const g = data.general
  return [
    { value: fmt(g.total_proyectos), label: 'proyectos registrados' },
    { value: fmt(g.proyectos_este_anio), label: 'presentados este año' },
    { value: `${Math.round(g.tasa_aprobacion_pct)}%`, label: 'de aprobación histórica' },
  ]
}

function buildEstadisticas(data: MetricasResponse | null): DataItem[] {
  if (!data) {
    return [
      { value: '—', label: 'de proyectos se vuelven ley' },
      { value: '—', label: 'total de leyes aprobadas' },
      { value: '—', label: 'para aprobar una ley (promedio)' },
    ]
  }
  const g = data.general
  const dias = g.promedio_dias_aprobacion
  let tiempo = ''
  if (dias < 30) {
    const d = Math.round(dias)
    tiempo = d === 1 ? '1 día' : `${d} días`
  } else if (dias < 365) {
    const m = Math.round(dias / 30.44)
    tiempo = m === 1 ? '1 mes' : `${m} meses`
  } else {
    const años = dias / 365
    if (años >= 2) {
      tiempo = `${Math.round(años)} años`
    } else {
      const formatted = años.toFixed(1)
      tiempo = formatted === '1.0' ? '1 año' : `${formatted} años`
    }
  }
  return [
    { value: `${Math.round(g.tasa_aprobacion_pct)}%`, label: 'de proyectos se vuelven ley' },
    { value: fmt(g.total_leyes_aprobadas), label: 'total de leyes aprobadas' },
    { value: tiempo, label: 'para aprobar una ley (promedio)' },
  ]
}

function buildDiputados(data: MetricasResponse | null): DataItem[] {
  if (!data) {
    return [
      { value: '—', label: 'diputados registrados históricamente' },
      { value: '—', label: 'diputado más activo' },
      { value: '—', label: 'mejor eficacia' },
    ]
  }
  const g = data.general
  const top = data.top_diputados[0]
  const eficaz = data.top_diputados_eficacia?.[0]

  const getName = (d?: { apellidos?: string; nombre_completo?: string }) => {
    if (!d) return ''
    const raw = d.apellidos?.trim() || d.nombre_completo?.trim() || ''
    return raw.toLowerCase().replace(/(?:^|\s)\S/g, (a) => a.toUpperCase())
  }

  return [
    { value: String(g.total_diputados_activos), label: 'diputados registrados históricamente' },
    { value: top ? `${top.total_proyectos}` : '—', label: top ? <span>proyectos liderados por el más activo (<strong>{getName(top)}</strong>)</span> : 'diputado más activo' },
    { value: eficaz ? `${Math.round(eficaz.tasa_aprobacion)}%` : '—', label: eficaz ? <span>de efectividad del diputado más eficaz (<strong>{getName(eficaz)}</strong>)</span> : 'mejor eficacia' },
  ]
}

export default async function FeatureBlocks() {
  let data: MetricasResponse | null = null
  try {
    data = await api.metricas.general()
  } catch {
    data = null
  }

  const cards = [
    {
      accent: '#0EA5E9',
      title: 'Proyectos',
      promise: 'Buscá, filtrá y leé cualquier iniciativa legislativa presentada en la Asamblea.',
      data: buildProyectos(data),
      href: '/proyectos',
      cta: 'Explorar proyectos',
    },
    {
      accent: '#F59E0B',
      title: 'Estadísticas',
      promise: 'Gráficos y tendencias que muestran cómo trabaja la Asamblea en el tiempo.',
      data: buildEstadisticas(data),
      href: '/estadisticas',
      cta: 'Ver estadísticas',
    },
    {
      accent: '#6366F1',
      title: 'Diputados',
      promise: 'Perfil completo, proyectos presentados y eficacia legislativa de cada diputado.',
      data: buildDiputados(data),
      href: '/diputados',
      cta: 'Ver diputados',
    },
  ]

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionEyebrow}>Explorá la Asamblea</h2>
        </div>
        <FeatureBlocksGrid cards={cards} />
      </div>
    </section>
  )
}
