import { api } from '@/lib/api'
import type { MetricasResponse } from '@/lib/api'
import { formatDiputadoName } from '@/lib/utils'
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
      { value: '—', label: 'de los proyectos nunca llegan a convertirse en ley' },
      { value: '—', label: 'trámites recorre en promedio un proyecto antes de aprobarse' },
      { value: '—', label: 'el tema más exitoso de la agenda' },
    ]
  }
  const g = data.general
  const nuncaLey = Math.round(100 - g.tasa_aprobacion_pct)
  const tramites = Math.round(g.promedio_tramites)
  const topCat = data.por_categoria
    ?.filter(c => c.leyes_aprobadas > 0)
    .sort((a, b) => b.tasa_aprobacion - a.tasa_aprobacion)[0]
  return [
    {
      value: `${nuncaLey}%`,
      label: 'de los proyectos nunca llegan a convertirse en ley',
    },
    {
      value: String(tramites),
      label: 'trámites recorre en promedio un proyecto antes de aprobarse',
    },
    {
      value: topCat ? `${Math.round(topCat.tasa_aprobacion)}%` : '—',
      label: topCat
        ? <span>de efectividad en <strong>{topCat.categoria}</strong> — el tema más exitoso de la agenda</span>
        : 'el tema más exitoso de la agenda',
    },
  ]
}

function buildDiputados(data: MetricasResponse | null, data10: MetricasResponse | null): DataItem[] {
  if (!data) {
    return [
      { value: '—', label: 'diputados registrados históricamente' },
      { value: '—', label: 'diputado más activo' },
      { value: '—', label: 'mejor eficacia' },
    ]
  }
  const g = data.general
  const top = data.top_diputados[0]
  const eficaz = data10?.top_diputados_eficacia?.[0]

  return [
    { value: String(g.total_diputados_activos), label: 'diputados registrados históricamente' },
    { value: top ? `${top.total_proyectos}` : '—', label: top ? <span>proyectos liderados por el más activo (<strong>{formatDiputadoName(top.nombre_completo)}</strong>)</span> : 'diputado más activo' },
    { value: eficaz ? `${Math.round(eficaz.tasa_aprobacion)}%` : '—', label: eficaz ? <span>de efectividad en 10 años del diputado más eficaz (<strong>{formatDiputadoName(eficaz.nombre_completo)}</strong>)</span> : 'mejor eficacia' },
  ]
}

export default async function FeatureBlocks() {
  let data: MetricasResponse | null = null
  let data10: MetricasResponse | null = null
  try {
    const hace10 = new Date()
    hace10.setFullYear(hace10.getFullYear() - 10)
    const desde10 = hace10.toISOString().slice(0, 10)
    ;[data, data10] = await Promise.all([
      api.metricas.general(),
      api.metricas.general({ desde: desde10 }),
    ])
  } catch {
    data = null
    data10 = null
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
      accent: '#6366F1',
      title: 'Diputados',
      promise: 'Perfil completo, proyectos presentados y eficacia legislativa de cada diputado.',
      data: buildDiputados(data, data10),
      href: '/diputados',
      cta: 'Ver diputados',
    },
    {
      accent: '#F59E0B',
      title: 'Estadísticas',
      promise: 'Gráficos y tendencias que muestran cómo trabaja la Asamblea en el tiempo.',
      data: buildEstadisticas(data),
      href: '/estadisticas',
      cta: 'Ver estadísticas',
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
