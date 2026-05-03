'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { EstadisticaPartido } from '@/lib/api'
import { getPaletaPartido } from '@/lib/partidos'
import { useLegislativePeriods } from '@/lib/periodos'
import { useT } from '@/i18n/LanguageProvider'
import styles from './partidos.module.css'
import FilterPill from '@/components/ui/FilterPill'

function IconFilter() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  )
}

function IconChevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

function IconX() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

function PartidoCard({
  partido,
  index,
  maxPropuestas,
}: {
  partido: EstadisticaPartido
  index: number
  maxPropuestas: number
}) {
  const { dict } = useT()
  const t = dict.partidosPage
  const paleta = getPaletaPartido(partido.codigo)
  const barW = maxPropuestas > 0 ? (partido.total_propuestas / maxPropuestas) * 100 : 0

  return (
    <Link href={`/partidos/${partido.codigo}`} className={styles.card}>
      <div className={styles.cardRank}>{index + 1}</div>
      <span className={styles.cardSwatch} style={{ background: paleta.bg }} />
      <div className={styles.cardBody}>
        <div className={styles.cardTop}>
          <span className={styles.cardName} style={{ color: paleta.bg }}>
            {partido.nombre}
          </span>
          <span className={styles.cardCount}>
            <strong>{partido.total_propuestas.toLocaleString('es-CR')}</strong>
            <span className={styles.cardCountLabel}> {partido.total_propuestas === 1 ? t.propuestasSingular : t.propuestasPlural}</span>
          </span>
        </div>
        <div className={styles.cardBar}>
          <div className={styles.cardBarFill} style={{ width: `${barW}%`, background: paleta.bg }} />
        </div>
        <div className={styles.cardMeta}>
          <span className={styles.cardMetaLeyes}>
            <strong>{partido.leyes_aprobadas}</strong>{' '}
            {partido.leyes_aprobadas === 1 ? t.leyesSingular : t.leyesPlural}
          </span>
          <span className={styles.cardMetaTasa}>
            <strong>{partido.tasa_aprobacion}%</strong>{' '}
            {t.tasaAprobacion}
          </span>
          {partido.total_diputados > 0 && (
            <span className={styles.cardMetaDip}>
              <strong>{partido.total_diputados}</strong>{' '}
              {partido.total_diputados === 1 ? t.diputadosSingular : t.diputadosPlural}
            </span>
          )}
        </div>
      </div>
      <span className={styles.cardArrow}><IconChevron /></span>
    </Link>
  )
}

export default function PartidosPage() {
  const { dict } = useT()
  const t = dict.partidosPage
  const periods = useLegislativePeriods()

  const [periodo, setPeriodo] = useState<string>('')
  const [datos, setDatos] = useState<EstadisticaPartido[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setDatos(null)
    const load = periodo
      ? api.metricas.metricasPartidos(periodo).then(r => r.por_partido)
      : api.metricas.metricasPartidosResumen().then(r => r.por_partido)
    load
      .then(setDatos)
      .catch(() => setDatos([]))
      .finally(() => setLoading(false))
  }, [periodo])

  const maxPropuestas = useMemo(
    () => (datos && datos.length > 0 ? datos[0].total_propuestas : 1),
    [datos],
  )

  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroDots} aria-hidden />
        <div className={styles.heroInner}>
          <span className={styles.heroEyebrow}>{t.heroEyebrow}</span>
          <h1 className={styles.heroTitle}>Partidos</h1>
          <p className={styles.heroDesc}>{t.heroDescPrefix}</p>
        </div>
      </section>

      {/* Filters bar */}
      <div className={styles.filtersBar}>
        <div className={styles.filtersInner}>
          <div className={styles.filtersLeft}>
            <span className={styles.filtersIcon}><IconFilter /></span>
            <span className={styles.filtersLabel}>{t.filterPeriodo}</span>
            <select
              className={styles.select}
              value={periodo}
              onChange={e => setPeriodo(e.target.value)}
            >
              <option value="">{t.cualquierPeriodo}</option>
              {periods.map(p => (
                <option key={p.label} value={p.label}>{p.label}</option>
              ))}
            </select>
          </div>
          {periodo && (
            <div className={styles.filtersRight}>
              <FilterPill
                label={periodo}
                onRemove={() => setPeriodo('')}
              />
            </div>
          )}
        </div>
      </div>

      {/* List */}
      <div className={styles.container}>
        {loading ? (
          <div className={styles.loading}>{t.cargando}</div>
        ) : !datos || datos.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>{t.sinResultadosTitle}</div>
            <div className={styles.emptyDesc}>{t.sinResultadosDesc}</div>
          </div>
        ) : (
          <div className={styles.list}>
            {datos.map((p, i) => (
              <PartidoCard
                key={p.partido_id}
                partido={p}
                index={i}
                maxPropuestas={maxPropuestas}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
