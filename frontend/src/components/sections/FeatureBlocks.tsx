import { api } from '@/lib/api'
import type { MetricasResponse, MetricasPartidosResumenResponse } from '@/lib/api'
import { formatDiputadoName } from '@/lib/utils'
import FeatureBlocksGrid, { type CardPayload } from './FeatureBlocksGrid'
import styles from './FeatureBlocks.module.css'

function buildPayloads(
  data: MetricasResponse | null,
  data10: MetricasResponse | null,
  partidos: MetricasPartidosResumenResponse | null,
): CardPayload[] {
  const g = data?.general
  const top = data?.top_diputados?.[0]
  const eficaz = data10?.top_diputados_eficacia?.[0]
  const ultimoMes = data?.por_mes?.[data.por_mes.length - 1]

  const masActivo = partidos?.por_partido?.[0] ?? null
  const mayorTasa = partidos?.por_partido
    ? [...partidos.por_partido]
        .filter(p => p.total_propuestas >= 20)
        .sort((a, b) => b.tasa_aprobacion - a.tasa_aprobacion)[0] ?? null
    : null

  return [
    {
      id: 'proyectos',
      accent: '#0EA5E9',
      href: '/proyectos',
      data: {
        registrados: g?.total_proyectos ?? null,
        esteAnio: g?.proyectos_este_anio ?? null,
        aprobacion: g ? Math.round(g.tasa_aprobacion_pct) : null,
      },
    },
    {
      id: 'diputados',
      accent: '#6366F1',
      href: '/diputados',
      data: {
        historicos: g?.total_diputados_activos ?? null,
        topActivoCount: top?.total_proyectos ?? null,
        topActivoNombre: top ? formatDiputadoName(top.nombre_completo) : null,
        topEficaciaPct: eficaz ? Math.round(eficaz.tasa_aprobacion) : null,
        topEficaciaNombre: eficaz ? formatDiputadoName(eficaz.nombre_completo) : null,
      },
    },
    {
      id: 'partidos',
      accent: '#10B981',
      href: '/partidos',
      data: {
        totalPartidos: partidos?.por_partido?.length ?? null,
        masActivoCount: masActivo?.total_propuestas ?? null,
        masActivoNombre: masActivo?.nombre ?? null,
        mayorTasaPct: mayorTasa ? Math.round(mayorTasa.tasa_aprobacion) : null,
        mayorTasaNombre: mayorTasa?.nombre ?? null,
      },
    },
    {
      id: 'estadisticas',
      accent: '#F59E0B',
      href: '/estadisticas',
      data: {
        nuncaLey: g ? Math.round(100 - g.tasa_aprobacion_pct) : null,
        tramites: g ? Math.round(g.promedio_tramites) : null,
        ultimoMesTotal: ultimoMes?.total ?? null,
        ultimoMesNombre: ultimoMes?.mes_nombre ?? null,
        ultimoMesAnio: ultimoMes?.anio ?? null,
      },
    },
  ]
}

export default async function FeatureBlocks() {
  let data: MetricasResponse | null = null
  let data10: MetricasResponse | null = null
  let partidos: MetricasPartidosResumenResponse | null = null
  try {
    const hace10 = new Date()
    hace10.setFullYear(hace10.getFullYear() - 10)
    const desde10 = hace10.toISOString().slice(0, 10)
    ;[data, data10, partidos] = await Promise.all([
      api.metricas.general(),
      api.metricas.general({ desde: desde10 }),
      api.metricas.metricasPartidosResumen(),
    ])
  } catch {
    data = null
    data10 = null
    partidos = null
  }

  const cards = buildPayloads(data, data10, partidos)

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <FeatureBlocksGrid cards={cards} />
      </div>
    </section>
  )
}
