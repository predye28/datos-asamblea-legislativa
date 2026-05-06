'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { MetricasResponse, ProximoVencer, MetricasPartidosResponse } from '@/lib/api'
import { useLegislativePeriods, getPeriodos } from '@/lib/periodos'
import { formatTitle, formatDiputadoName } from '@/lib/utils'
import { useT } from '@/i18n/LanguageProvider'
import styles from './estadisticas.module.css'
import { DiputadoAvatar } from '@/components/ui/DiputadoAvatar'
import { getPaletaPartido } from '@/lib/partidos'
import FilterPill from '@/components/ui/FilterPill'
import CountUp from '@/components/shared/CountUp'
import { Button } from '@/components/ui/Button'
import { TimelineAreaChart } from '@/components/charts/TimelineAreaChart'
import { MonthlyBarsChart } from '@/components/charts/MonthlyBarsChart'
import { PartidosPieChart } from '@/components/charts/PartidosPieChart'

function fmtN(n: number, locale: string) { return n.toLocaleString(locale) }
function fmtPct(n: number) { return `${n.toFixed(1)}%` }
function toISO(d: Date) { return d.toISOString().slice(0, 10) }

type RangoRapido = '' | 'este_mes' | 'seis_meses' | 'este_anio' | 'diez_anios' | 'personalizado'

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
  if (rango === 'diez_anios') {
    const desde = new Date(hoy)
    desde.setFullYear(desde.getFullYear() - 10)
    return { desde: toISO(desde), hasta: toISO(hoy) }
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
  const { dict } = useT()
  const t = dict.estadisticasPage
  const fmt = (n: number) => fmtN(n, dict.common.locale)

  const RANGO_LABEL: Record<RangoRapido, string> = {
    '': t.rangoFiltroHistorico,
    'este_mes': t.rangoEsteMes,
    'seis_meses': t.rango6Meses,
    'este_anio': t.rangoEsteAnio,
    'diez_anios': t.rango10Anios,
    'personalizado': t.rangoPersonalizado,
  }

  const searchParams = useSearchParams()
  const [rangoRapido, setRangoRapido] = useState<RangoRapido>('')
  const [customDesde, setCustomDesde] = useState('')
  const [customHasta, setCustomHasta] = useState('')
  const [periodo, setPeriodo] = useState(() => searchParams.get('periodo') || '2022-2026')
  const [data, setData] = useState<MetricasResponse | null>(null)
  const [globalData, setGlobalData] = useState<MetricasResponse | null>(null)
  const [timeline, setTimeline] = useState<{ anio: number; leyes_aprobadas: number }[]>([])
  const [proxVencer, setProxVencer] = useState<ProximoVencer[]>([])
  const [metricasPartidos, setMetricasPartidos] = useState<MetricasPartidosResponse | null>(null)
  const [loading, setLoading] = useState(true)
  // Los filtros se muestran de inmediato, sin esperar la primera carga.
  const [filtersAnimated, setFiltersAnimated] = useState(true)
  const legislativePeriods = useLegislativePeriods()

  // Rango efectivo (prioridad: custom > rápido > legislativo > histórico)
  const { desde, hasta } = useMemo(() => {
    if (rangoRapido === 'personalizado') return { desde: customDesde || undefined, hasta: customHasta || undefined }
    if (rangoRapido) return rangoACifras(rangoRapido)
    const relPeriods = getPeriodos()
    const legPeriod = legislativePeriods.find(p => p.label === periodo)
    const relPeriod = relPeriods.find(p => p.label === periodo)
    return { desde: legPeriod?.desde || relPeriod?.desde(), hasta: legPeriod?.hasta }
  }, [rangoRapido, customDesde, customHasta, periodo, legislativePeriods])

  // Datos globales (KPIs del hero) y timeline / próximos a vencer:
  // se cargan UNA SOLA VEZ y de forma independiente para que los 4 bloques
  // de arriba aparezcan apenas estén listos, sin esperar al resto.
  useEffect(() => {
    let cancelled = false
    api.metricas.general({})
      .then(g => { if (!cancelled) setGlobalData(g) })
      .catch(() => { if (!cancelled) setGlobalData(null) })
    api.metricas.lineaTiempo()
      .then(tl => { if (!cancelled) setTimeline(tl.datos) })
      .catch(() => {})
    api.metricas.proximosVencer(90)
      .then(p => { if (!cancelled) setProxVencer(p.datos || []) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Datos filtrados por el período seleccionado (recarga al cambiar filtros).
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.metricas.general({ desde, hasta })
      .then(metricas => {
        if (!cancelled) {
          setData(metricas)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData(null)
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [desde, hasta])

  const periodOptions = [
    { value: '', label: t.todosPeriodos },
    ...getPeriodos().map(p => ({ value: p.label, label: p.label })),
    { value: '__sep__', label: t.separadorLegislativos, disabled: true },
    ...legislativePeriods.map(p => ({ value: p.label, label: p.label })),
  ]

  const g = globalData?.general
  const categorias = useMemo(() => data?.por_categoria ?? [], [data])
  const topDip = useMemo(() => data?.top_diputados ?? [], [data])
  // Mínimo de proyectos para entrar al ranking de eficacia.
  // Sin esto, diputados antiguos con 3 proyectos todos aprobados aparecen
  // con 100% — lo cual es técnicamente cierto pero engañoso comparado con
  // legisladores modernos prolíficos.
  // Lo escalamos a ~5% del proponente más activo, con piso 5 y techo 15.
  const eficaciaThreshold = useMemo(() => {
    const top = data?.top_diputados?.[0]?.total_proyectos ?? 0
    return Math.min(15, Math.max(5, Math.floor(top * 0.05)))
  }, [data])

  // Si en el período seleccionado no hay 10 diputados que cumplan el umbral,
  // bajamos el umbral hasta llegar a 10 (con piso 3 para evitar 100% engañosos
  // de un único proyecto aprobado).
  const topEfic = useMemo(() => {
    const all = data?.top_diputados_eficacia ?? []
    const strict = all.filter(d => d.total_proyectos >= eficaciaThreshold)
    if (strict.length >= 10) return strict.slice(0, 10)
    const fallback = Math.max(3, Math.floor(eficaciaThreshold / 2))
    return all.filter(d => d.total_proyectos >= fallback).slice(0, 10)
  }, [data, eficaciaThreshold])
  const tipos = data?.por_tipo ?? []
  const organos = data?.organos_activos ?? []
  const porMes = useMemo(() => globalData?.por_mes ?? [], [globalData])

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
  const isLegislativePeriod = legislativePeriods.some(p => p.label === periodo)

  // Cargar métricas por partido solo cuando hay un período legislativo seleccionado
  useEffect(() => {
    if (!isLegislativePeriod || !periodo) {
      setMetricasPartidos(null)
      return
    }
    let cancelled = false
    api.metricas.metricasPartidos(periodo)
      .then(mp => { if (!cancelled) setMetricasPartidos(mp) })
      .catch(() => { if (!cancelled) setMetricasPartidos(null) })
    return () => { cancelled = true }
  }, [periodo, isLegislativePeriod])

  const rangoTextoHumano = hasRapido
    ? (rangoRapido === 'personalizado' && customDesde && customHasta
      ? t.rangoPersonalizadoFmt(customDesde, customHasta)
      : RANGO_LABEL[rangoRapido].toLowerCase())
    : hasLegislative
      ? periodo
      : t.rangoHistorico

  const filtroLabel = hasRapido
    ? (rangoRapido === 'personalizado' && customDesde && customHasta
      ? t.rangoPersonalizadoFmtLabel(customDesde, customHasta)
      : RANGO_LABEL[rangoRapido])
    : hasLegislative
      ? periodo
      : t.rangoFiltroHistorico

  const onChangePeriodo = (v: string) => {
    setPeriodo(v)
    setRangoRapido('')
  }

  // Mapea el período activo (legislativo o rango rápido) al label que
  // entiende el filtro de /proyectos, para preservarlo al navegar a un tema.
  const RAPIDO_A_PROYECTOS: Partial<Record<RangoRapido, string>> = {
    'este_mes': 'Este mes',
    'seis_meses': '6 meses',
    'este_anio': 'Este año',
  }
  const periodoParaProyectos = hasLegislative
    ? periodo
    : (RAPIDO_A_PROYECTOS[rangoRapido] ?? '')

  const hrefProyectosPorTema = (slug: string) => {
    const qs = new URLSearchParams({ categoria: slug })
    if (periodoParaProyectos) qs.set('periodo', periodoParaProyectos)
    return `/proyectos?${qs.toString()}`
  }
  const limpiarTodo = () => {
    setRangoRapido('')
    setPeriodo('')
    setCustomDesde('')
    setCustomHasta('')
  }

  let _sec = 1
  const secPartidos = isLegislativePeriod && metricasPartidos && metricasPartidos.por_partido.length > 0 ? String(_sec++).padStart(2, '0') : ''
  const secTemas = categorias.length > 0 ? String(_sec++).padStart(2, '0') : ''
  const secDiputados = topDip.length > 0 || topEfic.length > 0 ? String(_sec++).padStart(2, '0') : ''
  const secRitmo = mensualStats && porMes.length >= 3 ? String(_sec++).padStart(2, '0') : ''
  const secPulso = timelineStats ? String(_sec++).padStart(2, '0') : ''

  return (
    <div className={styles.page}>

      <section className={styles.hero}>
        <div className={styles.heroDots} aria-hidden />
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <span className={styles.heroEyebrow}>{t.heroEyebrow}</span>
            <h1 className={styles.heroTitle}>{t.heroTitle}</h1>
            <p className={styles.heroDesc}>{t.heroDesc}</p>
          </div>
        </div>
      </section>

      <div className={`${styles.filtersBar} ${filtersAnimated ? styles.filtersBarReady : ''}`}>
        <div className={styles.filtersInner}>
          <span className={styles.filtersLabel}><IconFilter /> {t.filtroPeriodoLabel}</span>
          <FilterPill
            value={periodo}
            onChange={onChangePeriodo}
            placeholder={t.todosPeriodos}
            active={hasLegislative}
            options={periodOptions}
          />
          {hasFilter && (
            <Button variant="ghost" size="sm" onClick={limpiarTodo} leftIcon={<IconX />}>
              {t.limpiar}
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <SkeletonPage />
      ) : !data ? (
        <div className={styles.main}>
          <div className={styles.container}>
            <p style={{ color: 'var(--ink-faint)', padding: '80px 0', textAlign: 'center' }}>
              {t.noData}
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
                  {t.bannerPrefix} <strong>{rangoTextoHumano}</strong>
                  {isLegislativePeriod && t.bannerSuffix}
                </span>
              </div>
            )}

            {/* ── Partidos políticos (solo en períodos legislativos) ── */}
            {isLegislativePeriod && metricasPartidos && metricasPartidos.por_partido.length > 0 && (
              <>
                <SectionIntro
                  num={secPartidos}
                  kicker="Partidos políticos"
                  title="Actividad legislativa por partido"
                  deck={`De ${fmtN(metricasPartidos.total_propuestas, dict.common.locale)} propuestas registradas en este período, así se distribuyen entre los partidos con representación en la Asamblea.`}
                  filtro={periodo}
                />
                <div className={styles.partidosPieWrap}>
                  <PartidosPieChart
                    datos={metricasPartidos.por_partido}
                    total_propuestas={metricasPartidos.total_propuestas}
                    periodo={periodo}
                  />
                </div>
              </>
            )}

            {/* ── 01 · Temas ── */}
            {categorias.length > 0 && (
              <>
                <SectionIntro
                  num={secTemas}
                  kicker={t.section01Kicker}
                  title={t.section01Title}
                  deck={t.section01Deck}
                  filtro={filtroLabel}
                />
                <p className={styles.insight}>
                  {topTema && (
                    <>
                      {/* Nombre del tema — viene del SIL, no se traduce */}
                      <strong>{formatTitle(topTema.categoria, dict.estado.sinTitulo)}</strong> {t.insightTemaDominaPrefix}{' '}
                      <strong>{topTema.total} {t.insightProyectos}</strong>
                      {temaMasEficaz && temaMasEficaz.slug !== topTema.slug && temaMasEficaz.tasa_aprobacion > 0 && (
                        <>{t.insightPero} <strong>{formatTitle(temaMasEficaz.categoria, dict.estado.sinTitulo)}</strong> {t.insightTemaEficacia}<strong>{fmtPct(temaMasEficaz.tasa_aprobacion)}{t.insightLlegaALeyClose}</strong></>
                      )}
                      .
                    </>
                  )}
                </p>
                <div className={styles.temasList}>
                  {categorias.slice(0, 10).map((c, i) => {
                    const maxTotal = categorias[0].total || 1
                    const width = (c.total / maxTotal) * 100
                    return (
                      <Link
                        key={c.slug}
                        href={hrefProyectosPorTema(c.slug)}
                        className={styles.temaRow}
                      >
                        <span className={styles.temaRank}>{i + 1}</span>
                        <div className={styles.temaBody}>
                          <div className={styles.temaNameRow}>
                            {/* Nombre del tema — no se traduce */}
                            <span className={styles.temaName}>{formatTitle(c.categoria, dict.estado.sinTitulo)}</span>
                            <span className={styles.temaRate}>{fmtPct(c.tasa_aprobacion)} {t.insightLlegaALey}</span>
                          </div>
                          <div className={styles.temaBar}>
                            <div className={styles.temaFill} style={{ width: `${width}%` }} />
                          </div>
                        </div>
                        <div className={styles.temaCount}>
                          <strong>{fmt(c.total)}</strong>
                          <span>{t.insightProyectos}</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </>
            )}
            {/* ── 02 · Diputados ── */}
            {(topDip.length > 0 || topEfic.length > 0) && (
              <>
                <SectionIntro
                  num={secDiputados}
                  kicker={t.section02Kicker}
                  title={t.section02Title}
                  deck={
                    <>
                      {t.section02DeckLeftPrefix} <strong>{t.section02DeckLeftStrong}</strong>{t.section02DeckRightPrefix} <strong>{t.section02DeckRightStrong}</strong>{t.section02DeckRightSuffix}
                    </>
                  }
                  filtro={filtroLabel}
                />
                {topEfic.length >= 3 && topDip.length >= 3 && (
                  <p className={styles.insight}>
                    {overlapTop > 0 ? (
                      <>
                        {t.insightOverlap(overlapTop)}{' '}
                        <strong>{t.insightOverlapStrong}</strong>
                      </>
                    ) : (
                      <>
                        {t.insightDiferentesPrefix} <strong>{t.insightDiferentesStrong}</strong>{t.insightDiferentesSuffix}
                      </>
                    )}
                  </p>
                )}
                <div className={styles.podioGrid}>
                  <div className={styles.podioCol}>
                    <div className={styles.podioColHead}>
                      <span className={styles.podioColKicker}>{t.columnaAKicker}</span>
                      <h3 className={styles.podioColTitle}>{t.columnaATitle}</h3>
                      <p className={styles.podioColDeck}>{t.columnaADeck}</p>
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
                            <DiputadoAvatar
                              nombreCompleto={d.nombre_completo}
                              size="md"
                              partyColor={d.partido_codigo ? getPaletaPartido(d.partido_codigo).bg : undefined}
                            />
                            <div className={styles.dipBody}>
                              {/* Nombre del diputado — no se traduce */}
                              <div className={styles.dipName}>{formatDiputadoName(d.nombre_completo)}</div>
                              <div className={styles.dipBar}>
                                <div className={styles.dipFill} style={{ width: `${width}%` }} />
                              </div>
                            </div>
                            <div className={styles.dipMeta}>
                              <strong>{fmt(d.total_proyectos)}</strong>
                              <span>{t.insightProyectos}</span>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>

                  {topEfic.length > 0 && (
                    <div className={styles.podioCol}>
                      <div className={styles.podioColHead}>
                        <span className={`${styles.podioColKicker} ${styles.podioColKickerGreen}`}>{t.columnaBKicker}</span>
                        <h3 className={styles.podioColTitle}>{t.columnaBTitle}</h3>
                        <p className={styles.podioColDeck}>
                          {t.columnaBDeckPrefix}{' '}
                          <strong>{t.columnaBDeckStrong(eficaciaThreshold)}</strong>{t.columnaBDeckSuffix}
                        </p>
                      </div>
                      <div className={styles.dipList}>
                        {topEfic.slice(0, 10).map((d, i) => (
                          <Link
                            key={`efic-${i}`}
                            href={`/diputados/${encodeURIComponent(d.nombre_completo)}`}
                            className={`${styles.dipRow} ${styles.dipRowGreen}`}
                          >
                            <span className={`${styles.dipRank} ${styles.medalGreen}`}>{i + 1}</span>
                            <DiputadoAvatar
                              nombreCompleto={d.nombre_completo}
                              size="md"
                              partyColor={d.partido_codigo ? getPaletaPartido(d.partido_codigo).bg : undefined}
                            />
                            <div className={styles.dipBody}>
                              <div className={styles.dipName}>{formatDiputadoName(d.nombre_completo)}</div>
                              <div className={styles.dipBar}>
                                <div className={styles.dipFillGreen} style={{ width: `${d.tasa_aprobacion}%` }} />
                              </div>
                            </div>
                            <div className={`${styles.dipMeta} ${styles.dipMetaGreen}`}>
                              <strong>{fmtPct(d.tasa_aprobacion)}</strong>
                              <span>{d.leyes_aprobadas} {t.de} {d.total_proyectos}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── 03 · Anatomía (tipos) — deshabilitado temporalmente ── */}
            {/* {tipos.length > 0 && (
              <>
                <SectionIntro
                  num="03"
                  kicker="Anatomía"
                  title="¿De qué se compone el trabajo legislativo?"
                  deck="No todos los proyectos son iguales. Cada tipo de expediente sigue un trámite distinto. Así se reparte el total."
                  filtro={filtroLabel}
                />
                <div className={styles.anatomiaPanel}>
                  <div className={styles.anatomiaBajada}>
                    <div className={styles.anatomiaBig}>
                      <CountUp end={top2Pct} decimals={1} suffix="%" />
                    </div>
                    <p>
                      del volumen total viene de solo <strong>dos tipos</strong> de expediente:
                      <em> {topTipo ? formatTitle(topTipo.tipo) : ''}</em> y <em>{topTipo2 ? formatTitle(topTipo2.tipo) : ''}</em>.
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
                          <div className={styles.glosarioName}>{formatTitle(t.tipo)}</div>
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
            )} */}

            {/* ── 04 · Órganos — deshabilitado temporalmente ── */}
            {/* {organos.length > 0 && (
              <>
                <SectionIntro
                  num="04"
                  kicker="Los órganos"
                  title="Dónde se mueve el trabajo legislativo"
                  deck="Comisiones, departamentos y oficinas con más trámites procesados: cada paso formal registrado sobre un expediente."
                  filtro={filtroLabel}
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
            )} */}

            {/* ── 05 · Ritmo mensual ── */}
            {mensualStats && porMes.length >= 3 && (
              <>
                <SectionIntro
                  num={secRitmo}
                  kicker={t.section03Kicker}
                  title={t.section03Title}
                  deck={t.section03Deck}
                  filtro={t.section03Filtro}
                />
                <p className={styles.insight}>
                  {mensualStats.pico.total > mensualStats.promedio * 1.2 ? (
                    <>
                      {t.insightPicoPrefix} <strong>{t.insightPicoStrong(mensualStats.pico.mes_nombre, mensualStats.pico.anio)}</strong> {t.insightPicoCon}{' '}
                      <strong>{mensualStats.pico.total} {t.insightPicoProyectosPlural}</strong> {t.insightPicoSobreProm(Math.round((mensualStats.pico.total / mensualStats.promedio - 1) * 100), mensualStats.promedio.toFixed(1))}
                    </>
                  ) : (
                    <>{t.insightEstable} <strong>{t.insightEstableProyectosMes(mensualStats.promedio.toFixed(1))}</strong>.</>
                  )}
                </p>
                <div className={styles.mensualPanel}>
                  <MonthlyBarsChart data={mensualStats.ultimos} height={260} />
                </div>
              </>
            )}

            {/* ── 06 · Pulso histórico ── */}
            {timelineStats && (
              <>
                <SectionIntro
                  num={secPulso}
                  kicker={t.section04Kicker}
                  title={t.section04Title(timelineStats.totalAnios)}
                  deck={t.section04Deck(timelineStats.desde, timelineStats.hasta)}
                  filtro={t.section04Filtro(timelineStats.desde, timelineStats.hasta)}
                />
                <p className={styles.insight}>
                  {Math.abs(timelineStats.deltaPct) >= 5 ? (
                    <>
                      {t.insightTendencia}{' '}
                      <strong>{timelineStats.deltaPct > 0 ? t.insightTendenciaSubio(Math.abs(timelineStats.deltaPct)) : t.insightTendenciaCayo(Math.abs(timelineStats.deltaPct))}</strong>{' '}
                      {t.insightTendenciaSuffix} <strong>{t.insightLeyesAnio(timelineStats.promedio.toFixed(1))}</strong>.
                    </>
                  ) : (
                    <>{t.insightEstableHistorico} <strong>{t.insightLeyesAnio(timelineStats.promedio.toFixed(1))}</strong>.</>
                  )}
                </p>
                <div className={styles.pulsoPanel}>
                  <TimelineAreaChart data={timeline} height={300} />
                  <div className={styles.pulsoStats}>
                    <div className={styles.pulsoStat}>
                      <div className={styles.pulsoStatLabel}>{t.pulsoMaxLabel}</div>
                      <div className={styles.pulsoStatValue} style={{ color: '#F59E0B' }}>
                        {timelineStats.peak.anio}
                      </div>
                      <div className={styles.pulsoStatHelp}>
                        {t.pulsoMaxHelp(timelineStats.peak.leyes_aprobadas)}
                      </div>
                    </div>
                    <div className={styles.pulsoStat}>
                      <div className={styles.pulsoStatLabel}>{t.pulsoMinLabel}</div>
                      <div className={styles.pulsoStatValue}>{timelineStats.low.anio}</div>
                      <div className={styles.pulsoStatHelp}>
                        {t.pulsoMinHelp(timelineStats.low.leyes_aprobadas)}
                      </div>
                    </div>
                    <div className={styles.pulsoStat}>
                      <div className={styles.pulsoStatLabel}>{t.pulsoPromLabel}</div>
                      <div className={styles.pulsoStatValue} style={{ color: 'var(--accent)' }}>
                        <CountUp end={timelineStats.promedio} decimals={1} />
                      </div>
                      <div className={styles.pulsoStatHelp}>
                        {t.pulsoPromHelp(timelineStats.totalAnios)}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Party stats section is rendered FIRST — see above */}

            {/* ── 08 · Lo que está por vencer (urgente) — deshabilitado temporalmente ── */}
            {/* {proxVencer.length > 0 && (
              <>
                <SectionIntro
                  num="07"
                  kicker="Lo urgente"
                  title="Proyectos por vencer"
                  deck="Cada proyecto tiene cuatro años para ser aprobado. Si no lo logra, se archiva sin trámite. Estos son los más cercanos al límite."
                  filtro="Próximos 90 días"
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
                        href={`/proyecto/${p.numero_expediente}`}
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
            )} */}

          </div>
        </div>
      )}
    </div>
  )
}

// ── Subcomponents ────────────────────────────────────────────────────────────



function SectionIntro({ num, kicker, title, deck, filtro }: {
  num: string; kicker: string; title: string; deck: React.ReactNode; filtro?: string
}) {
  const { dict } = useT()
  return (
    <div className={styles.sectionIntro}>
      <div className={styles.sectionHead}>
        <span className={styles.sectionNum} aria-hidden>{num}</span>
        <div className={styles.sectionHeadText}>
          <span className={styles.sectionKickerLabel}>{kicker}</span>
          <h2 className={styles.sectionTitle}>{title}</h2>
        </div>
      </div>
      <p className={styles.sectionDeck}>{deck}</p>
      {filtro && (
        <div className={styles.filtroHint}>
          <span className={styles.filtroHintDot} />
          <span className={styles.filtroHintLabel}>{dict.estadisticasPage.bannerFiltroLabel}</span>
          <strong>{filtro}</strong>
        </div>
      )}
    </div>
  )
}


