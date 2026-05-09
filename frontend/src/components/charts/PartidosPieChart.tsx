'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Doughnut } from 'react-chartjs-2'
import type { EstadisticaPartido } from '@/lib/api'
import { getPaletaPartido, getBanderaUrl, getSiglasPopulares } from '@/lib/partidos'
import { formatTitle } from '@/lib/utils'
import styles from './PartidosPieChart.module.css'

ChartJS.register(ArcElement, Tooltip, Legend)

// Plugin inline que dibuja siglas + % dentro de cada segmento del donut
const arcLabelsPlugin = {
  id: 'arcLabels',
  afterDatasetDraw(chart: ChartJS) {
    const ctx = chart.ctx
    const meta = chart.getDatasetMeta(0)
    if (!meta?.data) return
    const dataset = chart.data.datasets[0]
    const totalVal = (dataset.data as number[]).reduce((s, v) => s + (v as number), 0)
    meta.data.forEach((arc, index) => {
      const value = dataset.data[index] as number
      if (!value) return
      const pct = totalVal > 0 ? (value / totalVal) * 100 : 0
      if (pct < 5) return
      const pos = (arc as ArcElement).getCenterPoint(false)
      const label = (chart.data.labels?.[index] as string | undefined) ?? ''
      // Tomar las primeras siglas: primeras 3-4 letras si corto, o primera palabra
      const sigla = label.split(' ').length > 1
        ? label.split(' ').map(w => w[0]).join('').slice(0, 4).toUpperCase()
        : label.slice(0, 4).toUpperCase()
      ctx.save()
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = 'rgba(0,0,0,0.7)'
      ctx.shadowBlur = 4
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 13px monospace'
      ctx.fillText(sigla, pos.x, pos.y - 9)
      ctx.font = '700 12px sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.90)'
      ctx.fillText(`${pct.toFixed(1)}%`, pos.x, pos.y + 8)
      ctx.restore()
    })
  },
}

type Vista = 'propuestas' | 'leyes' | 'hemiciclo'

interface Props {
  datos: EstadisticaPartido[]
  total_propuestas: number
  periodo: string
}

// ── Hemiciclo (parliament chart) ─────────────────────────────────────────────

function buildHemicicloSeats(totalDip: number): { seatsPerRow: number[]; radii: number[] } {
  const ROWS = 4
  const INNER_R = 100
  const ROW_GAP = 36
  const radii = Array.from({ length: ROWS }, (_, i) => INNER_R + i * ROW_GAP)
  const totalC = radii.reduce((s, r) => s + r, 0)
  const seatsPerRow = radii.map(r => Math.round(totalDip * r / totalC))
  const diff = totalDip - seatsPerRow.reduce((s, n) => s + n, 0)
  if (diff !== 0) {
    seatsPerRow[seatsPerRow.indexOf(Math.max(...seatsPerRow))] += diff
  }
  return { seatsPerRow, radii }
}

function HemicicloChart({ datos, periodo }: { datos: EstadisticaPartido[]; periodo: string }) {
  const totalDip = datos.reduce((s, p) => s + p.total_diputados, 0)

  if (totalDip === 0) {
    return (
      <div className={styles.hemicicloEmpty}>
        No hay datos de composición de diputados para este período.
      </div>
    )
  }

  const partiesWithDip = [...datos]
    .filter(p => p.total_diputados > 0)
    .sort((a, b) => b.total_diputados - a.total_diputados)

  const seatColors: string[] = []
  partiesWithDip.forEach(p => {
    const color = getPaletaPartido(p.codigo).bg
    for (let i = 0; i < p.total_diputados; i++) seatColors.push(color)
  })

  const CX = 270
  const CY = 238
  const SEAT_R = 7
  const { seatsPerRow, radii } = buildHemicicloSeats(totalDip)

  const seats: { x: number; y: number }[] = []
  seatsPerRow.forEach((n, row) => {
    const r = radii[row]
    for (let j = 0; j < n; j++) {
      const angle = Math.PI - (n === 1 ? Math.PI / 2 : (j / (n - 1)) * Math.PI)
      seats.push({ x: CX + r * Math.cos(angle), y: CY - r * Math.sin(angle) })
    }
  })

  return (
    <div className={styles.hemicicloWrap}>
      <svg
        viewBox="0 0 540 300"
        className={styles.hemicicloSvg}
        aria-label={`Composición de la Asamblea - ${periodo}`}
        role="img"
      >
        {seats.map((seat, i) => (
          <circle
            key={i}
            cx={seat.x}
            cy={seat.y}
            r={SEAT_R}
            fill={seatColors[i] ?? '#6c757d'}
            className={styles.hemicicloSeat}
            style={{ animationDelay: `${i * 12}ms` }}
          />
        ))}
        <text
          x={CX}
          y={CY + 22}
          textAnchor="middle"
          style={{ fill: 'var(--ink)', fontFamily: 'var(--serif, Georgia, serif)', fontSize: '36px', fontWeight: 900 }}
        >
          {totalDip}
        </text>
        <text
          x={CX}
          y={CY + 40}
          textAnchor="middle"
          style={{ fill: 'var(--ink-muted, #94a3b8)', fontFamily: 'var(--label, sans-serif)', fontSize: '11px', fontWeight: 700, letterSpacing: '2px' }}
        >
          DIPUTADOS
        </text>
        <text
          x={CX}
          y={CY + 58}
          textAnchor="middle"
          style={{ fill: 'var(--ink-faint, #64748b)', fontFamily: 'var(--body, sans-serif)', fontSize: '11px' }}
        >
          {periodo}
        </text>
      </svg>

      <div className={styles.hemicicloLegend}>
        {partiesWithDip.map(p => {
          const paleta = getPaletaPartido(p.codigo)
          const sigla = getSiglasPopulares(p.codigo)
          return (
            <Link
              key={p.codigo}
              href={`/partidos/${p.codigo}`}
              className={styles.hemicicloLegendItem}
            >
              <span className={styles.hemicicloLegendDot} style={{ background: paleta.bg }} />
              <span className={styles.hemicicloLegendCount}>{p.total_diputados}</span>
              <span className={styles.hemicicloLegendCode}>{sigla}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

const TOP_N = 9

export function PartidosPieChart({ datos, total_propuestas, periodo }: Props) {
  const [vista, setVista] = useState<Vista>('propuestas')
  const [hemicicloKey, setHemicicloKey] = useState(0)

  const showHemiciclo = () => {
    setVista('hemiciclo')
    setHemicicloKey(k => k + 1)
  }

  const sorted =
    vista === 'propuestas'
      ? [...datos].sort((a, b) => b.total_propuestas - a.total_propuestas)
      : [...datos]
          .filter(d => d.leyes_aprobadas > 0)
          .sort((a, b) => b.leyes_aprobadas - a.leyes_aprobadas)

  const top = sorted.slice(0, TOP_N)
  const rest = sorted.slice(TOP_N)
  const restValue = rest.reduce(
    (s, p) => s + (vista === 'propuestas' ? p.total_propuestas : p.leyes_aprobadas),
    0,
  )

  interface ChartEntry {
    name: string
    fullName: string
    value: number
    codigo: string
    tasa: number
    pct: number
  }

  const chartData: ChartEntry[] = [
    ...top.map(p => ({
      name: p.nombre.length > 20 ? p.nombre.slice(0, 18) + '…' : p.nombre,
      fullName: p.nombre,
      value: vista === 'propuestas' ? p.total_propuestas : p.leyes_aprobadas,
      codigo: p.codigo,
      tasa: p.tasa_aprobacion,
      pct: p.pct_propuestas,
    })),
    ...(rest.length > 0 && restValue > 0
      ? [{ name: 'Otros', fullName: 'Otros partidos', value: restValue, codigo: 'IND', tasa: 0, pct: 0 }]
      : []),
  ].filter(d => d.value > 0)

  const total = chartData.reduce((s, d) => s + d.value, 0)
  const maxRankValue = top.length > 0
    ? (vista === 'propuestas' ? top[0].total_propuestas : top[0].leyes_aprobadas)
    : 1

  const topByApproval = [...datos]
    .filter(p => p.total_propuestas >= 10)
    .sort((a, b) => b.tasa_aprobacion - a.tasa_aprobacion)[0]

  // Chart.js config
  const paletas = chartData.map(d => getPaletaPartido(d.codigo))
  // Usamos el código como label para que el plugin lo muestre en el arco
  const chartJsData = {
    labels: chartData.map(d => getSiglasPopulares(d.codigo)),
    datasets: [{
      data: chartData.map(d => d.value),
      backgroundColor: paletas.map(p => p.bg + 'dd'),
      hoverBackgroundColor: paletas.map(p => p.bg),
      borderColor: paletas.map(p => p.bg),
      borderWidth: 2,
      hoverBorderWidth: 3,
      hoverOffset: 12,
    }],
  }

  const chartOptions: import('chart.js').ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: '50%',
    animation: {
      animateRotate: true,
      animateScale: false,
      duration: 1100,
      easing: 'easeOutQuart',
    } as import('chart.js').ChartOptions<'doughnut'>['animation'],
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a1e22',
        titleColor: '#fff',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
        callbacks: {
          title: (items) => {
            const d = chartData[items[0].dataIndex]
            return d ? formatTitle(d.fullName) : ''
          },
          label: (item) => {
            const d = chartData[item.dataIndex]
            const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0'
            if (vista === 'propuestas') {
              return ` ${d.value.toLocaleString('es-CR')} propuestas (${pct}% del total)`
            }
            return ` ${d.value.toLocaleString('es-CR')} leyes aprobadas`
          },
        },
      },
    },
  }

  return (
    <div className={styles.wrap}>

      {/* Tab selector */}
      <div className={styles.tabGroup}>
        <div className={styles.tabHeader}>
          <span className={styles.tabGroupLabel}>Ver estadísticas de:</span>
          {vista === 'hemiciclo' && (
            <div className={styles.tabHintWrap}>
              <span className={styles.tabHint} tabIndex={0} role="button">
                ?
                <span className={styles.tabHintTooltip} role="tooltip">
                  La composición refleja los asientos al iniciar el período. Durante el cuatrienio, algunos diputados pudieron separarse o cambiar de partido.
                </span>
              </span>
            </div>
          )}
        </div>
        <div className={styles.tabBar}>
          <button
            className={`${styles.tab} ${vista === 'propuestas' ? styles.tabActive : ''}`}
            onClick={() => setVista('propuestas')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            Propuestas presentadas
          </button>
          <button
            className={`${styles.tab} ${vista === 'leyes' ? styles.tabActiveLeyes : ''}`}
            onClick={() => setVista('leyes')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Leyes aprobadas
          </button>
          <button
            className={`${styles.tab} ${vista === 'hemiciclo' ? styles.tabActiveHemiciclo : ''}`}
            onClick={showHemiciclo}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Composición
          </button>
        </div>
      </div>

      {vista === 'hemiciclo' ? (
        <HemicicloChart key={hemicicloKey} datos={datos} periodo={periodo} />
      ) : (
        <>
          {/* Main: donut izquierda + ranking derecha */}
          <div className={styles.grid}>

            {/* Donut Chart.js */}
            <div className={styles.chartArea}>
              <div className={styles.chartWrapper}>
                <Doughnut data={chartJsData} options={chartOptions} plugins={[arcLabelsPlugin]} />
                {/* Center label */}
                <div className={styles.center}>
                  <div className={styles.centerNum}>{total.toLocaleString('es-CR')}</div>
                  <div className={styles.centerLabel}>
                    {vista === 'propuestas' ? 'propuestas' : 'leyes aprobadas'}
                  </div>
                  <div className={styles.centerPeriodo}>{periodo}</div>
                </div>
              </div>
            </div>

            {/* Ranking */}
            <div className={styles.ranking}>
              {top.slice(0, 8).map((p, i) => {
                const paleta = getPaletaPartido(p.codigo)
                const value = vista === 'propuestas' ? p.total_propuestas : p.leyes_aprobadas
                const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
                const barW = maxRankValue > 0 ? (value / maxRankValue) * 100 : 0
                return (
                  <Link key={p.partido_id} href={`/partidos/${p.codigo}`} className={styles.rankRow} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <span className={styles.rankNum}>{i + 1}</span>
                    {getBanderaUrl(p.codigo)
                      ? <img src={getBanderaUrl(p.codigo)!} alt="" className={styles.flagBandera} aria-hidden />
                      : <span className={styles.flagSwatch} style={{ background: paleta.bg }} />
                    }
                    <div className={styles.rankBody}>
                      <div className={styles.rankTop}>
                        <span className={styles.rankName}>
                          {formatTitle(p.nombre.length > 32 ? p.nombre.slice(0, 30) + '…' : p.nombre)}
                        </span>
                        <span className={styles.rankStats}>
                          <strong>{value.toLocaleString('es-CR')}</strong>
                          <span className={styles.rankPct}>{pct}% del total</span>
                        </span>
                      </div>
                      <div className={styles.rankBarTrack}>
                        <div
                          className={styles.rankBarFill}
                          style={{ width: `${barW}%`, background: paleta.bg }}
                        />
                      </div>
                      <div className={styles.rankMeta}>
                        {vista === 'propuestas' ? (
                          <div className={styles.rankMetaRow}>
                            <div className={styles.rankMetaItem}>
                              <span className={styles.rankMetaVal}>{p.diputados_activos}</span>
                              <span className={styles.rankMetaLbl}>dip.</span>
                            </div>
                            <div className={styles.rankMetaItem}>
                              <span className={`${styles.rankMetaVal} ${styles.valGreen}`}>{p.leyes_aprobadas}</span>
                              <span className={styles.rankMetaLbl}>leyes</span>
                            </div>
                            <div className={styles.rankMetaItem}>
                              <span className={`${styles.rankMetaVal} ${styles.valAccent}`}>{p.tasa_aprobacion}%</span>
                              <span className={styles.rankMetaLbl}>eficacia</span>
                            </div>
                          </div>
                        ) : (
                          <div className={styles.rankMetaRow}>
                            <div className={styles.rankMetaItem}>
                              <span className={`${styles.rankMetaVal} ${styles.valAccent}`}>{p.tasa_aprobacion}%</span>
                              <span className={styles.rankMetaLbl}>aprob.</span>
                            </div>
                            <div className={styles.rankMetaItem}>
                              <span className={`${styles.rankMetaVal} ${styles.valGreen}`}>{p.leyes_aprobadas}</span>
                              <span className={styles.rankMetaLbl}>leyes</span>
                            </div>
                            <div className={styles.rankMetaItem}>
                              <span className={styles.rankMetaVal}>{p.total_propuestas}</span>
                              <span className={styles.rankMetaLbl}>prop.</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Insights: Partido más activo + Mayor tasa — debajo del ranking */}
          {(datos[0] || topByApproval) && (
            <div className={styles.insights}>
              {datos[0] && (() => {
                const paleta = getPaletaPartido(datos[0].codigo)
                const moreActive = datos[0]
                return (
                  <div className={styles.insightCard} style={{ borderLeftColor: paleta.bg }}>
                    <div className={styles.insightBody}>
                      <div className={styles.insightKicker}>Partido más activo</div>
                      <div className={styles.insightName} style={{ color: paleta.bg }}>
                        {formatTitle(moreActive.nombre.length > 36 ? moreActive.nombre.slice(0, 34) + '…' : moreActive.nombre)}
                      </div>
                      <div className={styles.insightStats}>
                        <div className={styles.insightStat}>
                          <strong>{moreActive.total_propuestas}</strong>
                          <span>proyectos presentados</span>
                        </div>
                        <div className={styles.insightStatDivider} />
                        <div className={styles.insightStat}>
                          <strong style={{ color: '#22c55e' }}>{moreActive.leyes_aprobadas}</strong>
                          <span>leyes aprobadas</span>
                        </div>
                        <div className={styles.insightStatDivider} />
                        <div className={styles.insightStat}>
                          <strong style={{ color: 'var(--accent)' }}>{moreActive.tasa_aprobacion}%</strong>
                          <span>de eficacia</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
              {topByApproval && (() => {
                const paleta = getPaletaPartido(topByApproval.codigo)
                return (
                  <div className={styles.insightCard} style={{ borderLeftColor: '#22c55e' }}>
                    <div className={styles.insightBody}>
                      <div className={styles.insightKicker}>Mayor tasa de aprobación</div>
                      <div className={styles.insightName} style={{ color: paleta.bg }}>
                        {formatTitle(topByApproval.nombre.length > 36 ? topByApproval.nombre.slice(0, 34) + '…' : topByApproval.nombre)}
                      </div>
                      <div className={styles.insightStats}>
                        <div className={styles.insightStat}>
                          <strong style={{ color: '#22c55e', fontSize: '22px' }}>{topByApproval.tasa_aprobacion}%</strong>
                          <span>de sus propuestas se aprobaron</span>
                        </div>
                        <div className={styles.insightStatDivider} />
                        <div className={styles.insightStat}>
                          <strong style={{ color: '#22c55e' }}>{topByApproval.leyes_aprobadas}</strong>
                          <span>leyes de {topByApproval.total_propuestas} propuestas</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </>
      )}

    </div>
  )
}
