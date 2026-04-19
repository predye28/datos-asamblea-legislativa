'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { MetricasResponse, ProximoVencer } from '@/lib/api'
import { getAllLegislativePeriods, getPeriodos } from '@/lib/periodos'
import { formatTitle, formatName } from '@/lib/utils'
import styles from './estadisticas.module.css'
import FilterPill from '@/components/ui/FilterPill'
import CountUp from '@/components/shared/CountUp'
import { Button } from '@/components/ui/Button'
import { TimelineAreaChart } from '@/components/charts/TimelineAreaChart'
import { MonthlyBarsChart } from '@/components/charts/MonthlyBarsChart'
import { Sparkline as SparkSvg } from '@/components/charts/Sparkline'

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toLocaleString('es-CR') }
function fmtPct(n: number) { return `${n.toFixed(1)}%` }
function toISO(d: Date) { return d.toISOString().slice(0, 10) }
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

const PALETTE = [
  '#06B6D4', '#818CF8', '#22C55E', '#F59E0B',
  '#EC4899', '#A78BFA', '#14B8A6', '#F97316',
]

const TIPO_HELP: Record<string, string> = {
  'Ley Ordinaria': 'Norma general aprobada por mayoría simple.',
  'Reforma Constitucional': 'Modificación al texto de la Constitución Política.',
  'Aprobación de Contratos': 'Convenios que requieren aval legislativo.',
  'Aprobación de Convenios': 'Tratados y convenios internacionales.',
  'Tratado Internacional': 'Acuerdos con otros Estados u organismos.',
  'Acuerdo Legislativo': 'Decisiones internas del plenario.',
  'Ley Especial': 'Normas para materias o sectores específicos.',
  'Reforma a la Ley': 'Modificación parcial a una ley existente.',
}

type RangoRapido = '' | 'este_mes' | 'seis_meses' | 'este_anio' | 'personalizado'

const RANGO_LABEL: Record<RangoRapido, string> = {
  '': 'Histórico (todo)',
  'este_mes': 'Este mes',
  'seis_meses': 'Últimos 6 meses',
  'este_anio': 'Este año',
  'personalizado': 'Personalizado',
}

function rangoACifras(rango: RangoRapido): { desde?: string; hasta?: string } {
  const hoy = new Date()
  if (rango === 'este_mes') {
    const desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    return { desde: toISO(desde), hasta: toISO(hoy) }
  }
  if (rango === 'seis_meses') {
    const desde = new Date(hoy)
    desde.setDate(desde.getDate() - 180)
    return { desde: toISO(desde), hasta: toISO(hoy) }
  }
  if (rango === 'este_anio') {
    return { desde: `${hoy.getFullYear()}-01-01`, hasta: toISO(hoy) }
  }
  return {}
}

function IconFilter() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
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

function IconUp() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 14l5-5 5 5" /></svg>
}
function IconDown() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 10l5 5 5-5" /></svg>
}
function IconFlat() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14" /></svg>
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonPage() {
  return (
    <div className={styles.main}>
      <div className={styles.container}>
        <div className={styles.skKpiGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skKpi}>
              <div className={`${styles.skLine} ${styles.skShort}`} />
              <div className={`${styles.skLine} ${styles.skBig}`} />
              <div className={`${styles.skLine} ${styles.skMid}`} />
            </div>
          ))}
        </div>
        <div className={styles.skPanel}>
          {Array.from({ length: 8 }).map((_, j) => (
            <div key={j} className={styles.skLine} style={{ width: `${90 - j * 6}%` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function EstadisticasPage() {
  const [rangoRapido, setRangoRapido] = useState<RangoRapido>('')
  const [customDesde, setCustomDesde] = useState('')
  const [customHasta, setCustomHasta] = useState('')
  const [periodo, setPeriodo] = useState('')
  const [data, setData] = useState<MetricasResponse | null>(null)
  const [timeline, setTimeline] = useState<{ anio: number; leyes_aprobadas: number }[]>([])
  const [proxVencer, setProxVencer] = useState<ProximoVencer[]>([])
  const [loading, setLoading] = useState(true)

  // Rango efectivo (prioridad: custom > rápido > legislativo > histórico)
  const { desde, hasta } = useMemo(() => {
    if (rangoRapido === 'personalizado') return { desde: customDesde || undefined, hasta: customHasta || undefined }
    if (rangoRapido) return rangoACifras(rangoRapido)
    const allPeriods = getAllLegislativePeriods()
    const relPeriods = getPeriodos()
    const legPeriod = allPeriods.find(p => p.label === periodo)
    const relPeriod = relPeriods.find(p => p.label === periodo)
    return { desde: legPeriod?.desde || relPeriod?.desde(), hasta: legPeriod?.hasta }
  }, [rangoRapido, customDesde, customHasta, periodo])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [metricas, tl, prox] = await Promise.all([
        api.metricas.general({ desde, hasta }),
        api.metricas.lineaTiempo(),
        api.metricas.proximosVencer(90).catch(() => ({ datos: [] as ProximoVencer[] })),
      ])
      setData(metricas)
      setTimeline(tl.datos)
      setProxVencer(prox.datos || [])
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [desde, hasta])

  useEffect(() => { fetchData() }, [fetchData])

  const periodOptions = [
    { value: '', label: 'Todos los períodos' },
    ...getPeriodos().map(p => ({ value: p.label, label: p.label })),
    { value: '__sep__', label: '── Períodos legislativos ──', disabled: true },
    ...getAllLegislativePeriods().map(p => ({ value: p.label, label: p.label })),
  ]

  const g = data?.general
  const categorias = data?.por_categoria ?? []
  const topDip = data?.top_diputados ?? []
  const topEfic = useMemo(
    () => (data?.top_diputados_eficacia ?? []).filter(d => d.total_proyectos >= 3),
    [data]
  )
  const tipos = data?.por_tipo ?? []
  const organos = data?.organos_activos ?? []
  const porMes = data?.por_mes ?? []

  const maxDip = topDip[0]?.total_proyectos ?? 1
  const maxOrg = organos[0]?.total_tramites ?? 1

  const timelineStats = useMemo(() => {
    if (timeline.length < 2) return null
    const sorted = [...timeline]
    const peak = sorted.reduce((m, d) => d.leyes_aprobadas > m.leyes_aprobadas ? d : m, sorted[0])
    const low = sorted.reduce((m, d) => d.leyes_aprobadas < m.leyes_aprobadas ? d : m, sorted[0])
    const promedio = sorted.reduce((s, d) => s + d.leyes_aprobadas, 0) / sorted.length
    const ultimos3 = sorted.slice(-3)
    const promUltimos = ultimos3.reduce((s, d) => s + d.leyes_aprobadas, 0) / Math.max(1, ultimos3.length)
    const deltaPct = promedio > 0 ? ((promUltimos - promedio) / promedio) * 100 : 0
    return {
      peak, low, promedio,
      totalAnios: sorted.length,
      desde: sorted[0].anio,
      hasta: sorted[sorted.length - 1].anio,
      deltaPct,
    }
  }, [timeline])

  const mensualStats = useMemo(() => {
    if (porMes.length === 0) return null
    const ultimos = porMes.slice(-12)
    const promedio = ultimos.reduce((s, d) => s + d.total, 0) / ultimos.length
    const pico = ultimos.reduce((m, d) => d.total > m.total ? d : m, ultimos[0])
    const valle = ultimos.reduce((m, d) => d.total < m.total ? d : m, ultimos[0])
    // delta mes actual vs anterior
    const ultimoMes = porMes[porMes.length - 1]
    const mesAnterior = porMes[porMes.length - 2]
    const delta = ultimoMes && mesAnterior && mesAnterior.total > 0
      ? ((ultimoMes.total - mesAnterior.total) / mesAnterior.total) * 100
      : 0
    return { ultimos, promedio, pico, valle, ultimoMes, mesAnterior, delta }
  }, [porMes])

  const topTipo = tipos[0]
  const topTipo2 = tipos[1]
  const top2Pct = (topTipo?.porcentaje ?? 0) + (topTipo2?.porcentaje ?? 0)

  const topTema = categorias[0]
  const temaMasEficaz = useMemo(() => {
    const conMin = categorias.filter(c => c.total >= 3)
    if (conMin.length === 0) return null
    return conMin.reduce((m, c) => c.tasa_aprobacion > m.tasa_aprobacion ? c : m, conMin[0])
  }, [categorias])

  const urgentesCount = proxVencer.filter(p => p.dias_restantes < 30).length
  const overlapTop = useMemo(() => {
    const volNames = new Set(topDip.slice(0, 10).map(d => d.nombre_completo))
    return topEfic.slice(0, 10).filter(d => volNames.has(d.nombre_completo)).length
  }, [topDip, topEfic])

  const topOrgano = organos[0]
  const totalTramites = organos.reduce((s, o) => s + o.total_tramites, 0)
  const topOrganoPct = topOrgano && totalTramites > 0 ? (topOrgano.total_tramites / totalTramites) * 100 : 0

  const hasRapido = rangoRapido !== ''
  const hasLegislative = periodo !== ''
  const hasFilter = hasRapido || hasLegislative
  const isLegislativePeriod = getAllLegislativePeriods().some(p => p.label === periodo)
  const hoy = new Date()
  const fechaHoy = hoy.toLocaleDateString('es-CR', { day: 'numeric', month: 'long', year: 'numeric' })

  const rangoTextoHumano = hasRapido
    ? (rangoRapido === 'personalizado' && customDesde && customHasta
        ? `del ${customDesde} al ${customHasta}`
        : RANGO_LABEL[rangoRapido].toLowerCase())
    : hasLegislative
      ? periodo
      : 'histórico'

  const onChangeRapido = (v: RangoRapido) => {
    setRangoRapido(v)
    setPeriodo('')
  }
  const onChangePeriodo = (v: string) => {
    setPeriodo(v)
    setRangoRapido('')
  }
  const limpiarTodo = () => {
    setRangoRapido('')
    setPeriodo('')
    setCustomDesde('')
    setCustomHasta('')
  }

  return (
    <div className={styles.page}>

      {/* ── 00 · Hero de datos ── */}
      <section className={styles.heroData}>
        <div className={styles.heroDots} aria-hidden />
        <div className={styles.heroDataInner}>
          <div className={styles.heroDataHead}>
            <div className={styles.portadaMasthead}>
              <span className={styles.portadaEdicion}>EDICIÓN N.º {new Date().getFullYear()}</span>
              <span className={styles.portadaSep}>·</span>
              <span className={styles.portadaFecha}>ACTUALIZADO {fechaHoy.toUpperCase()}</span>
            </div>
            <h1 className={styles.heroDataTitle}>
              La Asamblea, <span className={styles.heroDataTitleAccent}>en cifras.</span>
            </h1>
            <p className={styles.heroDataDeck}>
              Cuatro números para entender cómo trabaja el Congreso costarricense. Abajo, el detalle.
            </p>
          </div>

          {g && (
            <div className={styles.heroKpiGrid}>
              <HeroKpi
                label="Proyectos presentados"
                sub={hasFilter ? `en ${rangoTextoHumano}` : 'desde 1949'}
                value={<CountUp end={g.total_proyectos} />}
                color="var(--accent)"
              />
              <HeroKpi
                label="Leyes vigentes"
                sub="completaron el trámite"
                value={<CountUp end={g.total_leyes_aprobadas} />}
                color="var(--positive)"
                spark={timeline.length > 2 ? <SparkSvg data={timeline} width={160} height={32} color="var(--positive)" /> : null}
              />
              <HeroKpi
                label="Tasa de aprobación"
                sub="proyectos que llegan a ley"
                value={<CountUp end={g.tasa_aprobacion_pct} decimals={1} suffix="%" />}
                color="#F59E0B"
              />
              <HeroKpi
                label="Años para aprobar"
                sub="tiempo medio hasta la ley"
                value={
                  g.promedio_dias_aprobacion
                    ? <CountUp end={g.promedio_dias_aprobacion / 365} decimals={1} />
                    : '—'
                }
                color="#818CF8"
              />
            </div>
          )}
        </div>
      </section>

      {/* ── Resumen ejecutivo ── */}
      {!loading && data && (
        <ResumenEjecutivo
          mensual={mensualStats ? {
            ultimoMes: mensualStats.ultimoMes,
            delta: mensualStats.delta,
            hayAnterior: !!mensualStats.mesAnterior,
          } : null}
          topTema={topTema}
          tasa={g?.tasa_aprobacion_pct ?? 0}
          urgentes={urgentesCount}
          hasFilter={hasFilter}
          rangoTexto={rangoTextoHumano}
        />
      )}

      {/* ── Filters ── */}
      <div className={styles.filtersBar}>
        <div className={styles.filtersInner}>
          <span className={styles.filtersLabel}><IconFilter /> Rango</span>
          <div className={styles.rangoChips} role="tablist" aria-label="Rango de tiempo">
            {(['', 'este_mes', 'seis_meses', 'este_anio', 'personalizado'] as RangoRapido[]).map(r => (
              <button
                key={r}
                role="tab"
                aria-selected={rangoRapido === r}
                className={`${styles.rangoChip} ${rangoRapido === r ? styles.rangoChipActive : ''}`}
                onClick={() => onChangeRapido(r)}
              >
                {r === '' ? 'Histórico' : RANGO_LABEL[r]}
              </button>
            ))}
          </div>
          <span className={styles.filtersSep} aria-hidden />
          <span className={styles.filtersLabelSecondary}>Período legislativo</span>
          <FilterPill
            value={periodo}
            onChange={onChangePeriodo}
            placeholder="Todos"
            active={hasLegislative}
            options={periodOptions}
          />
          {hasFilter && (
            <Button variant="ghost" size="sm" onClick={limpiarTodo} leftIcon={<IconX />}>
              Limpiar
            </Button>
          )}
        </div>
        {rangoRapido === 'personalizado' && (
          <div className={styles.customRow}>
            <label className={styles.customLabel}>
              Desde
              <input
                type="date"
                value={customDesde}
                onChange={e => setCustomDesde(e.target.value)}
                className={styles.customInput}
              />
            </label>
            <label className={styles.customLabel}>
              Hasta
              <input
                type="date"
                value={customHasta}
                onChange={e => setCustomHasta(e.target.value)}
                className={styles.customInput}
              />
            </label>
          </div>
        )}
      </div>

      {loading ? (
        <SkeletonPage />
      ) : !data ? (
        <div className={styles.main}>
          <div className={styles.container}>
            <p style={{ color: 'var(--ink-faint)', padding: '80px 0', textAlign: 'center' }}>
              No se pudieron cargar los datos.
            </p>
          </div>
        </div>
      ) : (
        <div className={styles.main}>
          <div className={styles.container}>

            {hasFilter && (
              <div className={styles.periodBanner}>
                <span className={styles.periodBannerDot} />
                <span className={styles.periodBannerText}>
                  Mostrando datos <strong>{rangoTextoHumano}</strong>
                  {isLegislativePeriod && ' · período legislativo'}
                </span>
              </div>
            )}

            {/* ── 01 · Lo que está por vencer (urgente) ── */}
            {proxVencer.length > 0 && (
              <>
                <SectionIntro
                  num="01"
                  kicker="Lo urgente"
                  title="Proyectos por vencer"
                  deck="Cada proyecto tiene cuatro años para ser aprobado. Si no lo logra, se archiva sin trámite. Estos son los más cercanos al límite."
                />
                <p className={`${styles.insight} ${urgentesCount > 0 ? styles.insightUrgent : ''}`}>
                  {urgentesCount > 0
                    ? <><strong>{urgentesCount} {urgentesCount === 1 ? 'proyecto vence' : 'proyectos vencen'}</strong> en menos de 30 días. Si no se aprueban, se archivan.</>
                    : <>Ningún proyecto vence en los próximos 30 días. La ventana inmediata está libre.</>}
                </p>
                <div className={styles.relojGrid}>
                  {proxVencer.slice(0, 6).map((p) => {
                    const urg = p.dias_restantes < 30 ? 'red' : p.dias_restantes < 90 ? 'amber' : 'neutral'
                    return (
                      <Link
                        key={p.numero_expediente}
                        href={`/proyectos/${p.numero_expediente}`}
                        className={`${styles.relojCard} ${styles[`reloj_${urg}`]}`}
                      >
                        <div className={styles.relojHead}>
                          <span className={styles.relojExp}>EXP. {p.numero_expediente}</span>
                          <span className={styles.relojTipo}>{p.tipo_expediente || '—'}</span>
                        </div>
                        <h4 className={styles.relojTitle}>
                          {p.titulo || 'Proyecto sin título'}
                        </h4>
                        <div className={styles.relojFooter}>
                          <div className={styles.relojDays}>
                            <strong>{p.dias_restantes}</strong>
                            <span>días restantes</span>
                          </div>
                          {p.proponentes_resumen && (
                            <div className={styles.relojProp} title={p.proponentes_resumen}>
                              {p.proponentes_resumen}
                            </div>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </>
            )}

            {/* ── 02 · Temas ── */}
            {categorias.length > 0 && (
              <>
                <SectionIntro
                  num="02"
                  kicker="¿De qué se habla?"
                  title="Los temas que mueven la agenda"
                  deck="Ranking por volumen de proyectos presentados. El tema protagonista ocupa el espacio destacado; los demás componen la lista."
                />
                <p className={styles.insight}>
                  {topTema && (
                    <>
                      <strong>{formatTitle(topTema.categoria)}</strong> domina la agenda con{' '}
                      <strong>{topTema.total} proyectos</strong>
                      {temaMasEficaz && temaMasEficaz.slug !== topTema.slug && temaMasEficaz.tasa_aprobacion > 0 && (
                        <>, pero <strong>{formatTitle(temaMasEficaz.categoria)}</strong> tiene la mayor efectividad (<strong>{fmtPct(temaMasEficaz.tasa_aprobacion)} llega a ley</strong>)</>
                      )}
                      .
                    </>
                  )}
                </p>
                <div className={styles.cartelera}>
                  {categorias.slice(0, 9).map((c, i) => {
                    const color = PALETTE[i % PALETTE.length]
                    return (
                      <Link
                        key={c.slug}
                        href={`/proyectos?categoria=${c.slug}`}
                        className={`${styles.cartTile} ${i === 0 ? styles.cartHero : ''}`}
                        style={{ '--tile-accent': color } as React.CSSProperties}
                      >
                        <div className={styles.cartRank}>{String(i + 1).padStart(2, '0')}</div>
                        <h3 className={styles.cartTitle}>{formatTitle(c.categoria)}</h3>
                        <div className={styles.cartMeta}>
                          <span className={styles.cartCount}>
                            {i === 0 ? <CountUp end={c.total} /> : fmt(c.total)}
                            <span>proyectos</span>
                          </span>
                          <span className={styles.cartRate}>
                            {fmtPct(c.tasa_aprobacion)} <em>llega a ley</em>
                          </span>
                        </div>
                        <span className={styles.cartArrow}>Ver proyectos →</span>
                      </Link>
                    )
                  })}
                </div>
              </>
            )}

            {/* ── 03 · Ritmo mensual ── */}
            {mensualStats && porMes.length >= 3 && (
              <>
                <SectionIntro
                  num="03"
                  kicker="El ritmo"
                  title="Proyectos presentados mes a mes"
                  deck="Últimos 12 meses de actividad. Verde señala picos (30% sobre el promedio), ámbar indica meses bajos."
                />
                <p className={styles.insight}>
                  {mensualStats.pico.total > mensualStats.promedio * 1.2 ? (
                    <>
                      Hubo un <strong>pico en {mensualStats.pico.mes_nombre} {mensualStats.pico.anio}</strong> con{' '}
                      <strong>{mensualStats.pico.total} proyectos</strong> ({Math.round((mensualStats.pico.total / mensualStats.promedio - 1) * 100)}% sobre el promedio de {mensualStats.promedio.toFixed(1)}).
                    </>
                  ) : (
                    <>La actividad mensual se mantiene estable alrededor de <strong>{mensualStats.promedio.toFixed(1)} proyectos por mes</strong>.</>
                  )}
                </p>
                <div className={styles.mensualPanel}>
                  <MonthlyBarsChart data={mensualStats.ultimos} height={260} />
                </div>
              </>
            )}

            {/* ── 04 · Pulso histórico ── */}
            {timelineStats && (
              <>
                <SectionIntro
                  num="04"
                  kicker="La historia larga"
                  title={`${timelineStats.totalAnios} años de producción legislativa`}
                  deck={`Cantidad de proyectos convertidos en ley entre ${timelineStats.desde} y ${timelineStats.hasta}. Los picos reflejan ciclos políticos, las caídas marcan años de bloqueo o transición.`}
                />
                <p className={styles.insight}>
                  {Math.abs(timelineStats.deltaPct) >= 5 ? (
                    <>
                      En los últimos 3 años la producción legislativa{' '}
                      <strong>{timelineStats.deltaPct > 0 ? 'subió' : 'cayó'} un {Math.abs(timelineStats.deltaPct).toFixed(0)}%</strong>{' '}
                      respecto al promedio histórico de <strong>{timelineStats.promedio.toFixed(1)} leyes/año</strong>.
                    </>
                  ) : (
                    <>Los últimos 3 años se mantienen cerca del promedio histórico de <strong>{timelineStats.promedio.toFixed(1)} leyes/año</strong>.</>
                  )}
                </p>
                <div className={styles.pulsoGrid}>
                  <aside className={styles.pullQuotes}>
                    <figure className={styles.pullQuote}>
                      <div className={styles.pullKicker}>AÑO PICO</div>
                      <div className={styles.pullNum} style={{ color: '#F59E0B' }}>{timelineStats.peak.anio}</div>
                      <figcaption>
                        <strong>{timelineStats.peak.leyes_aprobadas}</strong> leyes aprobadas — el máximo histórico en un solo año.
                      </figcaption>
                    </figure>
                    <figure className={styles.pullQuote}>
                      <div className={styles.pullKicker}>AÑO MÁS BAJO</div>
                      <div className={styles.pullNum}>{timelineStats.low.anio}</div>
                      <figcaption>
                        Solo <strong>{timelineStats.low.leyes_aprobadas}</strong> leyes aprobadas. Ciclos de obstrucción o transición política.
                      </figcaption>
                    </figure>
                    <figure className={styles.pullQuote}>
                      <div className={styles.pullKicker}>PROMEDIO</div>
                      <div className={styles.pullNum} style={{ color: 'var(--accent)' }}>
                        <CountUp end={timelineStats.promedio} decimals={1} />
                      </div>
                      <figcaption>
                        leyes por año a lo largo de <strong>{timelineStats.totalAnios}</strong> años de registro.
                      </figcaption>
                    </figure>
                  </aside>
                  <div className={styles.pulsoChart}>
                    <TimelineAreaChart data={timeline} height={340} />
                    <p className={styles.peakCaption}>
                      Pico histórico en <strong>{timelineStats.peak.anio}</strong> con{' '}
                      <strong>{fmt(timelineStats.peak.leyes_aprobadas)} leyes aprobadas</strong>.
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* ── 05 · Diputados ── */}
            {(topDip.length > 0 || topEfic.length > 0) && (
              <>
                <SectionIntro
                  num="05"
                  kicker="Los protagonistas"
                  title="Quiénes proponen · quiénes aprueban"
                  deck={
                    <>
                      Dos rankings distintos. A la izquierda, <strong>volumen</strong>: los que presentan más iniciativas.
                      A la derecha, <strong>eficacia</strong>: los que logran que un porcentaje alto de sus proyectos se convierta en ley.
                    </>
                  }
                />
                {topEfic.length > 0 && (
                  <p className={styles.insight}>
                    Solo <strong>{overlapTop} de los 10</strong> diputados más activos aparecen también en el top de eficacia.{' '}
                    <strong>Volumen no garantiza resultado.</strong>
                  </p>
                )}
                <div className={styles.podioGrid}>
                  <div className={styles.podioCol}>
                    <div className={styles.podioColHead}>
                      <span className={styles.podioColKicker}>COLUMNA A</span>
                      <h3 className={styles.podioColTitle}>Los que más proponen</h3>
                      <p className={styles.podioColDeck}>Top 10 por número total de proyectos presentados en el período.</p>
                    </div>
                    <div className={styles.dipList}>
                      {topDip.slice(0, 10).map((d, i) => {
                        const width = (d.total_proyectos / maxDip) * 100
                        const medal = i === 0 ? styles.medalGold : i === 1 ? styles.medalSilver : i === 2 ? styles.medalBronze : styles.medalPlain
                        return (
                          <Link
                            key={`dip-${i}`}
                            href={`/diputados/${encodeURIComponent(d.nombre_completo)}`}
                            className={styles.dipRow}
                          >
                            <span className={`${styles.dipRank} ${medal}`}>{i + 1}</span>
                            <div className={styles.dipBody}>
                              <div className={styles.dipName}>{formatName(d.nombre_completo)}</div>
                              <div className={styles.dipBar}>
                                <div className={styles.dipFill} style={{ width: `${width}%` }} />
                              </div>
                            </div>
                            <div className={styles.dipMeta}>
                              <strong>{fmt(d.total_proyectos)}</strong>
                              <span>proyectos</span>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>

                  {topEfic.length > 0 && (
                    <div className={styles.podioCol}>
                      <div className={styles.podioColHead}>
                        <span className={`${styles.podioColKicker} ${styles.podioColKickerGreen}`}>COLUMNA B</span>
                        <h3 className={styles.podioColTitle}>Los que más aprueban</h3>
                        <p className={styles.podioColDeck}>Top 10 por tasa de aprobación (mínimo 3 proyectos presentados).</p>
                      </div>
                      <div className={styles.dipList}>
                        {topEfic.slice(0, 10).map((d, i) => (
                          <Link
                            key={`efic-${i}`}
                            href={`/diputados/${encodeURIComponent(d.nombre_completo)}`}
                            className={`${styles.dipRow} ${styles.dipRowGreen}`}
                          >
                            <span className={`${styles.dipRank} ${styles.medalGreen}`}>{i + 1}</span>
                            <div className={styles.dipBody}>
                              <div className={styles.dipName}>{formatName(d.nombre_completo)}</div>
                              <div className={styles.dipBar}>
                                <div className={styles.dipFillGreen} style={{ width: `${d.tasa_aprobacion}%` }} />
                              </div>
                            </div>
                            <div className={`${styles.dipMeta} ${styles.dipMetaGreen}`}>
                              <strong>{fmtPct(d.tasa_aprobacion)}</strong>
                              <span>{d.leyes_aprobadas} de {d.total_proyectos}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── 06 · Anatomía (tipos) ── */}
            {tipos.length > 0 && (
              <>
                <SectionIntro
                  num="06"
                  kicker="Anatomía"
                  title="¿De qué se compone el trabajo legislativo?"
                  deck="No todos los proyectos son iguales. Cada tipo de expediente sigue un trámite distinto. Así se reparte el total."
                />
                <div className={styles.anatomiaPanel}>
                  <div className={styles.anatomiaBajada}>
                    <div className={styles.anatomiaBig}>
                      <CountUp end={top2Pct} decimals={1} suffix="%" />
                    </div>
                    <p>
                      del volumen total viene de solo <strong>dos tipos</strong> de expediente:
                      <em> {topTipo?.tipo}</em> y <em>{topTipo2?.tipo}</em>.
                    </p>
                  </div>

                  <div className={styles.stackedBar} role="img" aria-label="Distribución porcentual por tipo de expediente">
                    {tipos.map((t, i) => (
                      <div
                        key={t.tipo}
                        className={styles.stackedSeg}
                        style={{ width: `${t.porcentaje}%`, background: PALETTE[i % PALETTE.length] }}
                        title={`${t.tipo} — ${fmtPct(t.porcentaje)}`}
                      />
                    ))}
                  </div>
                  <div className={styles.stackedTicks}>
                    <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                  </div>

                  <div className={styles.glosario}>
                    {tipos.map((t, i) => (
                      <div key={t.tipo} className={styles.glosarioItem}>
                        <span className={styles.glosarioRoman} style={{ color: PALETTE[i % PALETTE.length] }}>
                          {ROMAN[i] || `${i + 1}`}
                        </span>
                        <div className={styles.glosarioBody}>
                          <div className={styles.glosarioName}>{t.tipo}</div>
                          {TIPO_HELP[t.tipo] && (
                            <div className={styles.glosarioDesc}>{TIPO_HELP[t.tipo]}</div>
                          )}
                          <div className={styles.glosarioBar}>
                            <div
                              className={styles.glosarioFill}
                              style={{ width: `${t.porcentaje}%`, background: PALETTE[i % PALETTE.length] }}
                            />
                          </div>
                        </div>
                        <div className={styles.glosarioCount}>
                          {fmtPct(t.porcentaje)}
                          <span>{fmt(t.total)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── 07 · Órganos ── */}
            {organos.length > 0 && (
              <>
                <SectionIntro
                  num="07"
                  kicker="Los órganos"
                  title="Dónde se mueve el trabajo legislativo"
                  deck="Comisiones, departamentos y oficinas con más trámites procesados: cada paso formal registrado sobre un expediente."
                />
                {topOrgano && (
                  <p className={styles.insight}>
                    <strong>{topOrgano.organo}</strong> concentra el <strong>{fmtPct(topOrganoPct)}</strong> de los trámites registrados.
                  </p>
                )}
                <div className={styles.mastheadPanel}>
                  {organos.slice(0, 10).map((o, i) => {
                    const pct = Math.max(6, (o.total_tramites / maxOrg) * 100)
                    const role = o.organo.toLowerCase().includes('plenario') ? 'Plenario'
                      : o.organo.toLowerCase().includes('comisión') || o.organo.toLowerCase().includes('comision') ? 'Comisión'
                      : o.organo.toLowerCase().includes('departamento') ? 'Departamento'
                      : o.organo.toLowerCase().includes('secretar') ? 'Secretaría'
                      : 'Órgano'
                    return (
                      <div key={o.organo} className={styles.mastheadRow}>
                        <span className={styles.mastheadRank}>{String(i + 1).padStart(2, '0')}</span>
                        <div className={styles.mastheadBody}>
                          <div className={styles.mastheadName} title={o.organo}>{o.organo}</div>
                          <div className={styles.mastheadRole}>{role}</div>
                          <div className={styles.organBar}>
                            <div className={styles.organFill} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <div className={styles.mastheadMeta}>
                          <strong>{fmt(o.total_tramites)}</strong>
                          <span>trámites</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* ── 08 · Indicadores complementarios ── */}
            <SectionIntro
              num="08"
              kicker="También importa"
              title="Dos indicadores complementarios"
              deck="Ritmo y actividad reciente. No son las cifras estrella, pero contextualizan el trabajo legislativo."
            />
            <div className={styles.kpiGridMini}>
              <Kpi
                roman="V"
                eyebrow="Trámites"
                value={g?.promedio_tramites
                  ? <CountUp end={g.promedio_tramites} decimals={1} />
                  : '—'}
                label="Por proyecto (promedio)"
                help="Pasos formales que recorre una iniciativa en promedio."
                color="#EC4899"
              />
              <Kpi
                roman="VI"
                eyebrow={isLegislativePeriod ? 'Año en curso' : 'Este año'}
                value={<CountUp end={g?.proyectos_este_anio ?? 0} />}
                label={`Proyectos en ${new Date().getFullYear()}`}
                help="Iniciativas presentadas durante el año calendario actual."
                color="#14B8A6"
              />
            </div>

            {/* ── 09 · Colofón ── */}
            <div className={styles.colofon}>
              <div className={styles.colofonKicker}>09 · COLOFÓN</div>
              <h3 className={styles.colofonTitle}>Sobre esta edición</h3>
              <div className={styles.colofonCols}>
                <div>
                  <div className={styles.colofonLabel}>Fuente</div>
                  <p>
                    Datos abiertos de la Asamblea Legislativa de Costa Rica, procesados y servidos por esta plataforma.
                  </p>
                </div>
                <div>
                  <div className={styles.colofonLabel}>Actualización</div>
                  <p>
                    {fechaHoy}. Las métricas se recalculan automáticamente cuando se publican nuevos expedientes.
                  </p>
                </div>
                <div>
                  <div className={styles.colofonLabel}>Metodología</div>
                  <p>
                    Cada proyecto se cuenta una sola vez por expediente. La tasa de aprobación mide proyectos convertidos en ley
                    sobre el total presentado en el período elegido.
                  </p>
                </div>
              </div>
              <blockquote className={styles.colofonQuote}>
                Los datos son públicos. Esta es una forma de leerlos.
              </blockquote>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

// ── Subcomponents ────────────────────────────────────────────────────────────

function ResumenEjecutivo({
  mensual, topTema, tasa, urgentes, hasFilter, rangoTexto,
}: {
  mensual: { ultimoMes: { total: number; mes_nombre: string; anio: number } | undefined; delta: number; hayAnterior: boolean } | null
  topTema: { categoria: string; total: number } | undefined
  tasa: number
  urgentes: number
  hasFilter: boolean
  rangoTexto: string
}) {
  const deltaAbs = mensual ? Math.abs(mensual.delta) : 0
  const isEstable = deltaAbs < 5
  const deltaColor = isEstable ? 'var(--ink-muted)' : mensual && mensual.delta > 0 ? 'var(--positive)' : 'var(--danger)'
  const DeltaIcon = isEstable ? IconFlat : mensual && mensual.delta > 0 ? IconUp : IconDown

  return (
    <section className={styles.resumen}>
      <div className={styles.resumenInner}>
        <div className={styles.resumenKicker}>
          <span className={styles.resumenDot} />
          RESUMEN · HOY
        </div>
        <ul className={styles.resumenList}>
          {mensual?.ultimoMes && (
            <li className={styles.resumenItem}>
              En <strong>{mensual.ultimoMes.mes_nombre.toLowerCase()}</strong> se presentaron{' '}
              <strong>{mensual.ultimoMes.total} proyectos</strong>
              {mensual.hayAnterior && (
                <span className={styles.resumenDelta} style={{ color: deltaColor }}>
                  <DeltaIcon />
                  {isEstable ? 'estable' : `${mensual.delta > 0 ? '+' : ''}${mensual.delta.toFixed(0)}% vs mes anterior`}
                </span>
              )}.
            </li>
          )}
          {topTema && (
            <li className={styles.resumenItem}>
              El tema más discutido es <strong>{topTema.categoria.toLowerCase()}</strong>, con <strong>{topTema.total} iniciativas</strong>.
            </li>
          )}
          {tasa > 0 && (
            <li className={styles.resumenItem}>
              Solo el <strong>{tasa.toFixed(0)}%</strong> de los proyectos llega a ser ley{hasFilter ? ` ${rangoTexto}` : ' (histórico)'}.
            </li>
          )}
          {urgentes > 0 && (
            <li className={styles.resumenItem}>
              <strong style={{ color: 'var(--danger)' }}>{urgentes} {urgentes === 1 ? 'expediente vence' : 'expedientes vencen'}</strong> en menos de 30 días.
            </li>
          )}
        </ul>
      </div>
    </section>
  )
}

function SectionIntro({ num, kicker, title, deck }: {
  num: string; kicker: string; title: string; deck: React.ReactNode
}) {
  return (
    <div className={styles.sectionIntro}>
      <div className={styles.sectionKicker}>
        <span className={styles.sectionNum}>{num}</span>
        <span className={styles.sectionKickerLabel}>{kicker}</span>
        <span className={styles.sectionKickerLine} />
      </div>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <p className={styles.sectionDeck}>{deck}</p>
    </div>
  )
}

function HeroKpi({ label, sub, value, color, spark }: {
  label: string
  sub: string
  value: React.ReactNode
  color: string
  spark?: React.ReactNode
}) {
  return (
    <div className={styles.heroKpi} style={{ '--kpi-color': color } as React.CSSProperties}>
      <div className={styles.heroKpiAccent} />
      <div className={styles.heroKpiValue}>{value}</div>
      <div className={styles.heroKpiLabel}>{label}</div>
      <div className={styles.heroKpiSub}>{sub}</div>
      {spark && <div className={styles.heroKpiSpark}>{spark}</div>}
    </div>
  )
}

function Kpi({ roman, eyebrow, value, label, help, color }: {
  roman: string
  eyebrow: string
  value: React.ReactNode
  label: string
  help: string
  color: string
}) {
  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiCardAccent} style={{ background: `linear-gradient(to right, ${color}, transparent)` }} />
      <div className={styles.kpiHead}>
        <span className={styles.kpiRoman} style={{ color }}>{roman}</span>
        <span className={styles.kpiEyebrow} style={{ color }}>{eyebrow}</span>
      </div>
      <p className={styles.kpiBig} style={{ color }}>{value}</p>
      <div className={styles.kpiRule} />
      <p className={styles.kpiLabel}>{label}</p>
      <p className={styles.kpiSub}>{help}</p>
    </div>
  )
}
