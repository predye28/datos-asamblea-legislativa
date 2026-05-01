import { api } from '@/lib/api'
import type { MetricasResponse } from '@/lib/api'
import { formatDiputadoName } from '@/lib/utils'
import FeatureBlocksGrid, { type CardPayload } from './FeatureBlocksGrid'
import styles from './FeatureBlocks.module.css'

function buildPayloads(
  data: MetricasResponse | null,
  data10: MetricasResponse | null,
): CardPayload[] {
  const g = data?.general
  const top = data?.top_diputados?.[0]
  const eficaz = data10?.top_diputados_eficacia?.[0]
  const ultimoMes = data?.por_mes?.[data.por_mes.length - 1]

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

  const cards = buildPayloads(data, data10)

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <FeatureBlocksGrid cards={cards} />
      </div>
    </section>
  )
}
