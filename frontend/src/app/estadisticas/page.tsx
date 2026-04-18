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

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toLocaleString('es-CR') }
function fmtPct(n: number) { return `${n.toFixed(1)}%` }
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

const PALETTE = [
  '#06B6D4', // cyan
  '#818CF8', // violeta suave
  '#22C55E', // verde
  '#F59E0B', // ámbar
  '#EC4899', // rosa
  '#A78BFA', // violeta
  '#14B8A6', // teal
  '#F97316', // naranja
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

// ── Sparkline (para la portada) ──────────────────────────────────────────────

function Sparkline({ data }: { data: { anio: number; leyes_aprobadas: number }[] }) {
  if (data.length < 2) return null
  const slice = data.slice(-18)
  const W = 360, H = 80
  const max = Math.max(...slice.map(d => d.leyes_aprobadas), 1)
  const step = W / (slice.length - 1)
  const toX = (i: number) => i * step
  const toY = (v: number) => 4 + (1 - v / max) * (H - 8)
  const path = slice.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(d.leyes_aprobadas)}`).join(' ')
  const last = slice[slice.length - 1]
  return (
    <svg className={styles.sparkSvg} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
      <path d={path} fill="none" stroke="#06B6D4" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={toX(slice.length - 1)} cy={toY(last.leyes_aprobadas)} r="3.5" fill="#06B6D4" />
    </svg>
  )
}

// ── SVG Area chart (leyes por año) con anotaciones ──────────────────────────

function LeyesArea({ data }: { data: { anio: number; leyes_aprobadas: number }[] }) {
  if (data.length < 2) return null
  const W = 1000, H = 320
  const pad = { t: 28, r: 28, b: 40, l: 52 }
  const max = Math.max(...data.map(d => d.leyes_aprobadas), 1)
  const stepX = (W - pad.l - pad.r) / (data.length - 1)

  const toX = (i: number) => pad.l + i * stepX
  const toY = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b)

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(d.leyes_aprobadas)}`).join(' ')
  const areaPath = `${linePath} L${toX(data.length - 1)},${H - pad.b} L${pad.l},${H - pad.b} Z`

  const peakIdx = data.reduce((m, d, i) => (d.leyes_aprobadas > data[m].leyes_aprobadas ? i : m), 0)
  const peak = data[peakIdx]
  const px = toX(peakIdx), py = toY(peak.leyes_aprobadas)

  const gridY = [0, 0.25, 0.5, 0.75, 1].map(f => pad.t + f * (H - pad.t - pad.b))
  const gridVals = [max, Math.round(max * 0.75), Math.round(max * 0.5), Math.round(max * 0.25), 0]

  const years = data.map(d => d.anio)
  const xTicks = years.filter(y => y % 10 === 0 || y === years[0] || y === years[years.length - 1])

  return (
    <div className={styles.chartContainer}>
      <svg className={styles.chartSvg} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Leyes aprobadas por año">
        <defs>
          <linearGradient id="leyesGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridY.map((y, i) => (
          <g key={i} className={styles.chartGrid}>
            <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="#333333" strokeDasharray="2 4" strokeWidth="1" />
            <text x={pad.l - 10} y={y + 4} textAnchor="end" fill="#888888" fontFamily="IBM Plex Mono" fontSize="16">
              {gridVals[i]}
            </text>
          </g>
        ))}

        <path d={areaPath} fill="url(#leyesGrad)" />
        <path d={linePath} fill="none" stroke="#06B6D4" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />

        {/* Línea guía al pico + anotación (se oculta en móvil) */}
        <g className={styles.chartAnnot}>
          <line x1={px} x2={px} y1={py + 8} y2={pad.t - 8} stroke="#F59E0B" strokeDasharray="2 3" strokeWidth="1" opacity="0.55" />
          <text
            x={px}
            y={pad.t - 14}
            textAnchor={peakIdx > data.length * 0.75 ? 'end' : peakIdx < data.length * 0.25 ? 'start' : 'middle'}
            fill="#F59E0B"
            fontFamily="IBM Plex Mono"
            fontSize="16"
            fontWeight="700"
            letterSpacing="0.05em"
          >
            PICO · {peak.anio} · {peak.leyes_aprobadas} LEYES
          </text>
        </g>
        <circle cx={px} cy={py} r="6" fill="#F59E0B" stroke="#1A1A1A" strokeWidth="2.5" />

        {xTicks.map(y => {
          const idx = years.indexOf(y)
          return (
            <text
              key={y}
              x={toX(idx)}
              y={H - 14}
              textAnchor="middle"
              fill="#888888"
              fontFamily="IBM Plex Mono"
              fontSize="16"
              className={styles.chartXTick}
            >
              {y}
            </text>
          )
        })}
      </svg>
      <p className={styles.peakCaption}>
        Pico histórico en <strong>{peak.anio}</strong> con <strong>{fmt(peak.leyes_aprobadas)} leyes aprobadas</strong>.
      </p>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function EstadisticasPage() {
  const [periodo, setPeriodo] = useState('')
  const [data, setData]       = useState<MetricasResponse | null>(null)
  const [timeline, setTimeline] = useState<{ anio: number; leyes_aprobadas: number }[]>([])
  const [proxVencer, setProxVencer] = useState<ProximoVencer[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const allPeriods = getAllLegislativePeriods()
      const relPeriods = getPeriodos()
      const legPeriod = allPeriods.find(p => p.label === periodo)
      const relPeriod = relPeriods.find(p => p.label === periodo)
      const desde = legPeriod?.desde || relPeriod?.desde()
      const hasta = legPeriod?.hasta

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
  }, [periodo])

  useEffect(() => { fetchData() }, [fetchData])

  const periodOptions = [
    { value: '', label: 'Histórico (todo)' },
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

  const maxDip = topDip[0]?.total_proyectos ?? 1
  const maxOrg = organos[0]?.total_tramites ?? 1

  // Stats del timeline para pull-quotes
  const timelineStats = useMemo(() => {
    if (timeline.length < 2) return null
    const sorted = [...timeline]
    const peak = sorted.reduce((m, d) => d.leyes_aprobadas > m.leyes_aprobadas ? d : m, sorted[0])
    const low = sorted.reduce((m, d) => d.leyes_aprobadas < m.leyes_aprobadas ? d : m, sorted[0])
    const promedio = sorted.reduce((s, d) => s + d.leyes_aprobadas, 0) / sorted.length
    return { peak, low, promedio, totalAnios: sorted.length, desde: sorted[0].anio, hasta: sorted[sorted.length - 1].anio }
  }, [timeline])

  const topTipo = tipos[0]
  const topTipo2 = tipos[1]
  const top2Pct = (topTipo?.porcentaje ?? 0) + (topTipo2?.porcentaje ?? 0)

  const isLegislativePeriod = getAllLegislativePeriods().some(p => p.label === periodo)
  const hasFilter = periodo !== ''
  const hoy = new Date()
  const fechaHoy = hoy.toLocaleDateString('es-CR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className={styles.page}>

      {/* ── 00 · Portada editorial ── */}
      <section className={styles.portada}>
        <div className={styles.heroDots} aria-hidden />
        <div className={styles.portadaInner}>
          <div className={styles.portadaText}>
            <div className={styles.portadaMasthead}>
              <span className={styles.portadaEdicion}>EDICIÓN N.º {new Date().getFullYear()}</span>
              <span className={styles.portadaSep}>·</span>
              <span className={styles.portadaFecha}>ACTUALIZADO {fechaHoy.toUpperCase()}</span>
            </div>
            <h1 className={styles.portadaTitle}>
              La Asamblea,<br />contada en cifras.
            </h1>
            <p className={styles.portadaDeck}>
              Una lectura transparente de cómo trabaja el Congreso costarricense:
              cuánto se propone, cuánto se aprueba y quiénes llevan el peso del trabajo legislativo.
            </p>

            {g && (
              <div className={styles.tickerRow}>
                <div className={styles.tickerChip}>
                  <span className={styles.tickerValue}>
                    <CountUp end={g.total_proyectos} />
                  </span>
                  <span className={styles.tickerLabel}>proyectos presentados</span>
                </div>
                <div className={styles.tickerChip}>
                  <span className={styles.tickerValue} style={{ color: 'var(--positive)' }}>
                    <CountUp end={g.total_leyes_aprobadas} />
                  </span>
                  <span className={styles.tickerLabel}>leyes vigentes</span>
                </div>
                <div className={styles.tickerChip}>
                  <span className={styles.tickerValue} style={{ color: '#F59E0B' }}>
                    <CountUp end={g.tasa_aprobacion_pct} decimals={1} suffix="%" />
                  </span>
                  <span className={styles.tickerLabel}>tasa de aprobación</span>
                </div>
              </div>
            )}
          </div>

          {timeline.length > 2 && (
            <div className={styles.portadaAside}>
              <div className={styles.sparkKicker}>LEYES POR AÑO · ÚLT. {Math.min(18, timeline.length)} AÑOS</div>
              <Sparkline data={timeline} />
              <div className={styles.sparkFoot}>
                <span>{timeline[Math.max(0, timeline.length - 18)].anio}</span>
                <span className={styles.sparkDash} />
                <span>{timeline[timeline.length - 1].anio}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Filters ── */}
      <div className={styles.filtersBar}>
        <div className={styles.filtersInner}>
          <span className={styles.filtersLabel}><IconFilter /> Período</span>
          <FilterPill
            value={periodo}
            onChange={setPeriodo}
            placeholder="Histórico (todo)"
            active={hasFilter}
            options={periodOptions}
          />
          {hasFilter && (
            <button className={styles.clearBtn} onClick={() => setPeriodo('')}>
              <IconX /> Limpiar
            </button>
          )}
        </div>
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
                  Mostrando datos de <strong>{periodo}</strong>
                  {isLegislativePeriod && ' · período legislativo'}
                </span>
              </div>
            )}

            {/* ── 01 · KPIs ── */}
            <SectionIntro
              num="01"
              kicker="Los indicadores"
              title="Seis cifras que resumen el trabajo legislativo"
              deck="Pulso general del Congreso: volumen, eficacia y ritmo. Cada número es una puerta de entrada a una historia más larga."
            />
            <div className={styles.kpiGrid}>
              <Kpi
                roman="I"
                eyebrow={hasFilter ? 'En el período' : 'En total'}
                value={<CountUp end={g?.total_proyectos ?? 0} />}
                label="Proyectos presentados"
                help={hasFilter ? `Iniciativas ingresadas en ${periodo}.` : 'Iniciativas ingresadas desde 1949.'}
                color="var(--accent)"
              />
              <Kpi
                roman="II"
                eyebrow="Aprobadas"
                value={<CountUp end={g?.total_leyes_aprobadas ?? 0} />}
                label="Leyes vigentes"
                help="Proyectos que completaron el trámite y entraron en vigencia."
                color="var(--positive)"
              />
              <Kpi
                roman="III"
                eyebrow={hasFilter ? 'Tasa del período' : 'Tasa histórica'}
                value={<CountUp end={g?.tasa_aprobacion_pct ?? 0} decimals={1} suffix="%" />}
                label="De aprobación"
                help="Porcentaje de proyectos presentados que se convirtieron en ley."
                color="#F59E0B"
              />
              <Kpi
                roman="IV"
                eyebrow="Tiempo promedio"
                value={
                  g?.promedio_dias_aprobacion
                    ? <CountUp end={g.promedio_dias_aprobacion / 365} decimals={1} suffix=" años" />
                    : '—'
                }
                label="Para aprobar una ley"
                help="Tiempo medio entre la presentación y la aprobación final."
                color="#818CF8"
              />
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

            {/* ── 02 · El pulso (Leyes por año con pull-quotes) ── */}
            {timelineStats && (
              <>
                <SectionIntro
                  num="02"
                  kicker="El pulso"
                  title={`${timelineStats.totalAnios} años de producción legislativa`}
                  deck={`Cantidad de proyectos convertidos en ley entre ${timelineStats.desde} y ${timelineStats.hasta}. Los picos reflejan ciclos políticos, las caídas marcan años de bloqueo o transición.`}
                />
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
                    <LeyesArea data={timeline} />
                  </div>
                </div>
              </>
            )}

            {/* ── 03 · Cartelera de temas ── */}
            {categorias.length > 0 && (
              <>
                <SectionIntro
                  num="03"
                  kicker="¿De qué se habla?"
                  title="Los temas que mueven la agenda"
                  deck="Ranking por volumen de proyectos presentados. El tema protagonista ocupa el espacio destacado; los siguientes componen la cartelera de la edición."
                />
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

            {/* ── 04 · Doble podio (diputados) ── */}
            {(topDip.length > 0 || topEfic.length > 0) && (
              <>
                <SectionIntro
                  num="04"
                  kicker="Los protagonistas"
                  title="Quiénes proponen · quiénes aprueban"
                  deck={
                    <>
                      Dos rankings distintos. A la izquierda, <strong>volumen</strong>: los que presentan más iniciativas.
                      A la derecha, <strong>eficacia</strong>: los que logran que un porcentaje alto de sus proyectos se convierta en ley.
                      Volumen no es eficacia.
                    </>
                  }
                />
                <div className={styles.podioGrid}>
                  {/* Columna A — Volumen */}
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

                  {/* Columna B — Eficacia */}
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
                <p className={styles.podioNote}>
                  <em>Volumen no es eficacia.</em> Comparar ambas columnas revela quiénes trabajan mucho y quiénes, además, logran que lo suyo llegue a la meta.
                </p>
              </>
            )}

            {/* ── 05 · El reloj legislativo ── */}
            {proxVencer.length > 0 && (
              <>
                <SectionIntro
                  num="05"
                  kicker="El reloj"
                  title="Lo que está por vencer"
                  deck="Proyectos cuyo plazo cuatrienal expira pronto. Si no se aprueban a tiempo, se archivan. Ordenados por urgencia."
                />
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
                <p className={styles.figcaption}>
                  Los proyectos en la Asamblea tienen un plazo de <strong>cuatro años</strong> para ser aprobados. Vencido el plazo, se archivan sin trámite.
                </p>
              </>
            )}

            {/* ── 06 · Anatomía de un expediente ── */}
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

            {/* ── 07 · Órganos en acción ── */}
            {organos.length > 0 && (
              <>
                <SectionIntro
                  num="07"
                  kicker="Los órganos"
                  title="Dónde se mueve el trabajo legislativo"
                  deck="Comisiones, departamentos y oficinas con más trámites procesados: cada paso formal registrado sobre un expediente."
                />
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

            {/* ── 08 · Colofón ── */}
            <div className={styles.colofon}>
              <div className={styles.colofonKicker}>08 · COLOFÓN</div>
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
