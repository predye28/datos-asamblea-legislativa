'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { EstadisticaPartido } from '@/lib/api'
import { getPaletaPartido } from '@/lib/partidos'
import { useLegislativePeriods } from '@/lib/periodos'
import { useT } from '@/i18n/LanguageProvider'
import { formatName } from '@/lib/utils'
import styles from './partidos.module.css'
import FilterPill from '@/components/ui/FilterPill'
import { Button } from '@/components/ui/Button'

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

const MEDAL_COLORS = ['#F6AD55', '#A0AEC0', '#CD853F']

// Primera letra en mayúscula, resto igual
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// ── Party card ───────────────────────────────────────────────────────────────

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
  const medalColor = index < 3 ? MEDAL_COLORS[index] : undefined

  return (
    <Link href={`/partidos/${partido.codigo}`} className={styles.card}>
      {/* Barra de acento izquierda */}
      <span className={styles.cardAccent} />

      {/* Cuerpo principal */}
      <div className={styles.cardBody}>
        <div className={styles.cardNameRow}>
          <span
            className={styles.cardRank}
            style={medalColor ? { color: medalColor, borderColor: medalColor } : undefined}
          >
            {index + 1}
          </span>
          <span className={styles.cardName}>{formatName(partido.nombre)}</span>
          <span
            className={styles.cardFlag}
            style={{ background: paleta.bg }}
            title={partido.codigo}
          />
        </div>
        <div className={styles.cardBar}>
          <div
            className={styles.cardBarFill}
            style={{ width: `${barW}%` }}
          />
        </div>
        <div className={styles.cardMeta}>
          <span className={styles.cardMetaItem}>
            <strong className={styles.cardMetaVal}>{partido.leyes_aprobadas}</strong>
            <span className={styles.cardMetaLabel}>
              {cap(partido.leyes_aprobadas === 1 ? t.leyesSingular : t.leyesPlural)}
            </span>
          </span>
          <span className={styles.cardMetaSep} aria-hidden>/</span>
          <span className={styles.cardMetaItem}>
            <strong className={styles.cardMetaValAccent}>{partido.tasa_aprobacion}%</strong>
            <span className={styles.cardMetaLabel}>{cap(t.tasaAprobacion)}</span>
          </span>
          {partido.total_diputados > 0 && (
            <>
              <span className={styles.cardMetaSep} aria-hidden>/</span>
              <span className={styles.cardMetaItem}>
                <strong className={styles.cardMetaValMuted}>{partido.total_diputados}</strong>
                <span className={styles.cardMetaLabel}>
                  {cap(partido.total_diputados === 1 ? t.diputadosSingular : t.diputadosPlural)}
                </span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Bloque de conteo — igual que diputados */}
      <div className={styles.cardCount}>
        <strong className={styles.cardCountNum}>
          {partido.total_propuestas.toLocaleString('es-CR')}
        </strong>
        <span className={styles.cardCountLabel}>
          {partido.total_propuestas === 1 ? t.propuestasSingular : t.propuestasPlural}
        </span>
      </div>

      <span className={styles.cardArrow}><IconChevron /></span>
    </Link>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PartidosPage() {
  const { dict } = useT()
  const t = dict.partidosPage
  const periods = useLegislativePeriods()

  const [periodo, setPeriodo] = useState<string>('')
  const [datos, setDatos] = useState<EstadisticaPartido[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [filtersAnimated] = useState(true)

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

  const periodOptions = useMemo(() => [
    { value: '', label: t.cualquierPeriodo },
    { value: '__sep__', label: t.separadorLegislativos, disabled: true },
    ...periods.map(p => ({ value: p.label, label: p.label })),
  ], [periods, t])

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
      <div className={`${styles.filtersBar} ${filtersAnimated ? styles.filtersBarReady : ''}`}>
        <div className={styles.filtersInner}>
          <span className={styles.filtersLabel}><IconFilter /> {t.filterPeriodo}</span>
          <FilterPill
            value={periodo}
            onChange={setPeriodo}
            placeholder={t.cualquierPeriodo}
            active={!!periodo}
            options={periodOptions}
          />
          {periodo && (
            <Button variant="ghost" size="sm" onClick={() => setPeriodo('')} leftIcon={<IconX />}>
              {t.limpiar}
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className={styles.main}>
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
    </div>
  )
}
