'use client'
// src/app/estadisticas/page.tsx
import { useEffect, useMemo, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceDot,
} from 'recharts'
import Link from 'next/link'
import { api, MetricasResponse } from '@/lib/api'
import { getAllLegislativePeriods } from '@/lib/periodos'
import SectionRule from '@/components/ui/SectionRule'
import Hero from '@/components/sections/Hero'
import ProximosVencer from '@/components/sections/ProximosVencer'
import TimelineInteractiva from '@/components/sections/TimelineInteractiva'
import TemasDestacados from '@/components/sections/TemasDestacados'
import LoadingIndicator from '@/components/ui/LoadingIndicator'
import styles from './estadisticas.module.css'

// Paleta editorial — limitada y con propósito
const PALETTE = [
  '#D30001', // ruby
  '#FFDA6B', // dorado
  '#22C55E', // positivo
  '#3B82F6', // azul
  '#A78BFA', // violeta suave
  '#F97316', // naranja
  '#06B6D4', // cian
  '#EC4899', // rosa
]

// Descripciones breves para tipos de expediente
const TIPO_HELP: Record<string, string> = {
  'Ley Ordinaria': 'Norma general aprobada por mayoría simple.',
  'Reforma Constitucional': 'Modificación al texto de la Constitución Política.',
  'Aprobación de Contratos': 'Convenios y contratos que requieren aval legislativo.',
  'Aprobación de Convenios': 'Tratados y convenios internacionales.',
  'Tratado Internacional': 'Acuerdos con otros Estados u organismos.',
  'Acuerdo Legislativo': 'Decisiones internas del plenario.',
  'Ley Especial': 'Normas dirigidas a materias o sectores específicos.',
}

export default function EstadisticasPage() {
  const [data, setData] = useState<MetricasResponse | null>(null)
  const [linea, setLinea] = useState<{ anio: number; leyes_aprobadas: number }[]>([])
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [periodo, setPeriodo] = useState('')

  const periodos = getAllLegislativePeriods()

  const handlePeriodChange = (val: string) => {
    setPeriodo(val)
    if (!val) { setDesde(''); setHasta(''); return }
    const p = periodos.find(x => x.label === val)
    if (p) { setDesde(p.desde); setHasta(p.hasta) }
  }

  useEffect(() => {
    api.metricas.general({ desde, hasta }).then(setData)
  }, [desde, hasta])

  useEffect(() => {
    api.metricas.lineaTiempo().then(d => setLinea(d.datos))
  }, [])

  // Pico histórico de leyes aprobadas
  const peak = useMemo(() => {
    if (!linea.length) return null
    return linea.reduce((a, b) => (b.leyes_aprobadas > a.leyes_aprobadas ? b : a))
  }, [linea])

  if (!data) return (
    <div style={{ paddingBottom: 40 }}>
      <LoadingIndicator text="Calculando estadísticas en tiempo real..." fillSpace={true} />
    </div>
  )

  const { general, por_tipo, por_mes, organos_activos } = data

  // Eficacia por tema — dot-plot
  const eficaciaTemas = [...data.por_categoria]
    .filter(c => c.total > 5)
    .sort((a, b) => b.tasa_aprobacion - a.tasa_aprobacion)
    .slice(0, 8)
  const eficaciaProm = eficaciaTemas.length
    ? eficaciaTemas.reduce((s, c) => s + c.tasa_aprobacion, 0) / eficaciaTemas.length
    : 0

  // Diputados destacados
  const topDiputados = data.top_diputados_eficacia ?? []
  const maxDipProyectos = topDiputados.reduce((m, d) => Math.max(m, d.total_proyectos), 0) || 1

  // Órganos activos — limitar a top 8 para legibilidad
  const topOrganos = organos_activos.slice(0, 8)
  const maxTram = topOrganos[0]?.total_tramites ?? 1

  return (
    <div style={{ paddingBottom: 40 }}>
      <Hero
        kicker="Análisis de datos"
        headline="Estadísticas legislativas"
        deck="Una mirada profunda a los patrones y tendencias de la Asamblea. Datos oficiales."
        actions={[
          { label: 'Explorar proyectos →', href: '/proyectos', type: 'primary' },
          { label: 'Explorar diputados', href: '/diputados', type: 'secondary' }
        ]}
      />

      <div className="container">

        {/* ── Selector de período ───────────────────────── */}
        <SectionRule label="Período de análisis" />
        <div className={styles.periodoWrap}>
          <select
            value={periodo}
            onChange={e => handlePeriodChange(e.target.value)}
            className={styles.periodoSelect}
            aria-label="Seleccionar período legislativo"
          >
            <option value="">Todos los registros históricos</option>
            {periodos.map(p => (
              <option key={p.label} value={p.label}>Período {p.label}</option>
            ))}
          </select>
          {periodo && (
            <button
              className={styles.clearBtn}
              onClick={() => { setDesde(''); setHasta(''); setPeriodo('') }}
            >
              Limpiar filtro ✕
            </button>
          )}
          <p className={styles.periodoMeta}>
            {periodo
              ? <>Mostrando datos del período <strong>{periodo}</strong> ({desde} al {hasta}).</>
              : <>Mostrando la <strong>base de datos completa</strong>, sin filtros de tiempo.</>
            }
          </p>
        </div>

        {/* ── KPIs ──────────────────────────────────────── */}
        <SectionRule label="Números clave" />
        <div className={styles.blockIntro}>
          <h3>Pulso general del trabajo legislativo</h3>
          <p>Las seis cifras que resumen qué tanto se propone, qué tanto se aprueba y qué tan rápido avanza un proyecto en la corriente legislativa.</p>
        </div>
        <div className={styles.kpiGrid}>
          {[
            {
              label: 'Proyectos presentados',
              value: general.total_proyectos.toLocaleString('es-CR'),
              help: 'Total de iniciativas ingresadas en la corriente legislativa.',
              cls: '',
            },
            {
              label: 'Leyes aprobadas',
              value: general.total_leyes_aprobadas.toLocaleString('es-CR'),
              help: 'Proyectos que completaron el trámite y entraron en vigencia.',
              cls: styles.kpiAccent,
            },
            {
              label: 'Tasa de aprobación',
              value: `${general.tasa_aprobacion_pct.toFixed(1)}%`,
              help: 'Porcentaje de proyectos presentados que se convierten en ley.',
              cls: styles.kpiPositive,
            },
            {
              label: 'Días promedio para ser ley',
              value: general.promedio_dias_aprobacion.toLocaleString('es-CR'),
              help: 'Tiempo medio entre la presentación y la aprobación final.',
              cls: '',
            },
            {
              label: 'Trámites por proyecto',
              value: general.promedio_tramites.toFixed(1),
              help: 'Promedio de pasos formales que recorre cada iniciativa.',
              cls: '',
            },
            {
              label: 'Proyectos este año',
              value: general.proyectos_este_anio.toLocaleString('es-CR'),
              help: 'Iniciativas presentadas durante el año en curso.',
              cls: '',
            },
          ].map(k => (
            <div key={k.label} className={`${styles.kpi} ${k.cls}`}>
              <div className={styles.kpiLabel}>{k.label}</div>
              <div className={styles.kpiValue}>{k.value}</div>
              <div className={styles.kpiHelp}>{k.help}</div>
            </div>
          ))}
        </div>

        {/* ── Temas en debate ───────────────────────────── */}
        <SectionRule label="Temas en debate" />
        <TemasDestacados desde={desde} hasta={hasta} periodoLabel={periodo ? `período ${periodo}` : undefined} />

        {/* ── Eficacia por tema (dot-plot) ──────────────── */}
        <SectionRule label="Eficacia por tema" />
        <div className={styles.blockIntro}>
          <h3>¿Qué temas logran convertirse en ley?</h3>
          <p>
            La <strong>eficacia</strong> es el porcentaje de proyectos presentados dentro de un tema que completan el trámite y se aprueban como ley.
            Mientras más a la derecha el punto, más alto el éxito.
          </p>
        </div>
        <div className={styles.card}>
          <div className={styles.dotplot}>
            <div className={styles.dotplotScaleWrap}>
              <div className={styles.dotplotScale}>
                {[0, 25, 50, 75, 100].map(v => (
                  <span key={v} style={{ left: `${v}%` }}>{v}%</span>
                ))}
              </div>
            </div>
            {eficaciaTemas.map((c, i) => (
              <div key={c.slug} className={styles.dotRow}>
                <div className={styles.dotLabel} title={c.categoria}>{c.categoria}</div>
                <div className={styles.dotTrack}>
                  <div
                    className={styles.dotPoint}
                    style={{
                      left: `${c.tasa_aprobacion}%`,
                      background: PALETTE[i % PALETTE.length],
                      boxShadow: `0 0 0 1px ${PALETTE[i % PALETTE.length]}, 0 2px 6px rgba(0,0,0,0.4)`,
                    }}
                    title={`${c.tasa_aprobacion}% — ${c.leyes_aprobadas} de ${c.total} proyectos`}
                  />
                  <div
                    className={styles.dotValue}
                    style={{ left: `${Math.min(c.tasa_aprobacion, 85)}%` }}
                  >
                    {c.tasa_aprobacion}%
                    <span>{c.leyes_aprobadas}/{c.total}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {eficaciaTemas.length > 0 && (
            <p className={styles.figcaption}>
              Promedio de eficacia entre los temas mostrados: <strong>{eficaciaProm.toFixed(1)}%</strong>.
              Solo se consideran temas con más de cinco proyectos presentados.
            </p>
          )}
        </div>

        {/* ── Diputados destacados ──────────────────────── */}
        {topDiputados.length > 0 && (
          <>
            <SectionRule label="Diputados destacados" />
            <div className={styles.blockIntro}>
              <h3>Quiénes logran que sus proyectos lleguen a ser ley</h3>
              <p>
                Ordenados por <strong>tasa de éxito</strong> — porcentaje de propuestas presentadas por cada diputado que terminaron aprobándose.
                Solo se consideran proponentes con al menos cinco proyectos.
              </p>
            </div>
            <div className={styles.card}>
              <div className={styles.rankList}>
                {topDiputados.map((d, i) => {
                  const nombre = d.nombre_completo
                    .toLowerCase()
                    .split(' ')
                    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' ')
                  const relWidth = Math.max(6, (d.total_proyectos / maxDipProyectos) * 100)
                  return (
                    <Link
                      key={d.nombre_completo + i}
                      href={`/diputados/${encodeURIComponent(d.nombre_completo)}`}
                      className={styles.rankItem}
                    >
                      <span className={styles.rankNum}>{String(i + 1).padStart(2, '0')}</span>
                      <div className={styles.rankBody}>
                        <div className={styles.rankName}>{nombre}</div>
                        <div className={styles.rankBar}>
                          <div
                            className={`${styles.rankFill} ${styles.gold}`}
                            style={{ width: `${relWidth}%` }}
                          />
                        </div>
                      </div>
                      <div className={styles.rankMeta}>
                        <strong>{d.tasa_aprobacion}%</strong>
                        {d.leyes_aprobadas} de {d.total_proyectos}
                      </div>
                    </Link>
                  )
                })}
              </div>
              <p className={styles.figcaption}>
                La barra dorada es proporcional al <strong>volumen de proyectos presentados</strong>;
                el porcentaje grande representa la <strong>tasa de éxito</strong>.
              </p>
            </div>
          </>
        )}

        {/* ── Próximos a vencer ─────────────────────────── */}
        <SectionRule label="Proyectos próximos a vencer" />
        <ProximosVencer clientMode={true} maxItems={5} />

        {/* ── Timeline mensual ──────────────────────────── */}
        <TimelineInteractiva datosIniciales={por_mes} />

        {/* ── Distribución por tipo (stacked bar único) ─ */}
        <SectionRule label="Distribución por tipo de expediente" />
        <div className={styles.blockIntro}>
          <h3>No todos los proyectos son iguales</h3>
          <p>
            Cada tipo de expediente sigue un trámite y una mayoría diferente. Esta barra muestra cómo se reparten el total de iniciativas presentadas.
          </p>
        </div>
        <div className={styles.card}>
          <div className={styles.stackedBar} role="img" aria-label="Distribución porcentual por tipo de expediente">
            {por_tipo.map((t, i) => (
              <div
                key={t.tipo}
                className={styles.stackedSeg}
                style={{
                  width: `${t.porcentaje}%`,
                  background: PALETTE[i % PALETTE.length],
                }}
                title={`${t.tipo} — ${t.porcentaje.toFixed(1)}%`}
              />
            ))}
          </div>
          <div className={styles.stackedTicks}>
            <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
          </div>
          <div className={styles.stackedLegend}>
            {por_tipo.map((t, i) => (
              <div key={t.tipo} className={styles.stackedLegendItem}>
                <span
                  className={styles.stackedDot}
                  style={{ background: PALETTE[i % PALETTE.length] }}
                />
                <div>
                  <div className={styles.stackedName}>{t.tipo}</div>
                  {TIPO_HELP[t.tipo] && (
                    <div className={styles.stackedDesc}>{TIPO_HELP[t.tipo]}</div>
                  )}
                </div>
                <div className={styles.stackedCount}>
                  {t.porcentaje.toFixed(1)}%
                  <span>{t.total.toLocaleString('es-CR')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Histórico de leyes por año (area chart) ──── */}
        {linea.length > 0 && (
          <>
            <SectionRule label="Leyes aprobadas por año — histórico" />
            <div className={styles.blockIntro}>
              <h3>Productividad legislativa, año tras año</h3>
              <p>Cantidad de proyectos que se convirtieron en ley en cada ejercicio. Útil para identificar años de alta actividad y ciclos políticos.</p>
            </div>
            <div className={styles.card}>
              <div className={styles.chartWrap}>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={linea} margin={{ top: 16, right: 16, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="leyesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FFDA6B" stopOpacity={0.55} />
                        <stop offset="100%" stopColor="#FFDA6B" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#3D332D" strokeDasharray="2 4" vertical={false} />
                    <XAxis
                      dataKey="anio"
                      tick={{ fontFamily: 'IBM Plex Mono', fontSize: 11, fill: '#888888' }}
                      axisLine={false} tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontFamily: 'IBM Plex Mono', fontSize: 11, fill: '#888888' }}
                      axisLine={false} tickLine={false}
                      width={36}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#231F1C',
                        border: '1px solid #3D332D',
                        borderRadius: 8,
                        fontFamily: 'Inter',
                        fontSize: 12,
                        color: '#F9F9F9',
                      }}
                      labelStyle={{ color: '#BCBCBC', fontWeight: 600, marginBottom: 4 }}
                      cursor={{ stroke: '#FFDA6B', strokeWidth: 1, strokeDasharray: '3 3' }}
                      formatter={(v: number) => [v.toLocaleString('es-CR'), 'Leyes aprobadas']}
                      labelFormatter={(l) => `Año ${l}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="leyes_aprobadas"
                      stroke="#FFDA6B"
                      strokeWidth={2}
                      fill="url(#leyesGrad)"
                    />
                    {peak && (
                      <ReferenceDot
                        x={peak.anio}
                        y={peak.leyes_aprobadas}
                        r={5}
                        fill="#D30001"
                        stroke="#F9F9F9"
                        strokeWidth={2}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {peak && (
                <p className={styles.peakNote}>
                  Pico histórico en <strong>{peak.anio}</strong> con <strong>{peak.leyes_aprobadas.toLocaleString('es-CR')} leyes aprobadas</strong>.
                </p>
              )}
            </div>
          </>
        )}

        {/* ── Órganos más activos ───────────────────────── */}
        <SectionRule label="Órganos más activos en tramitación" />
        <div className={styles.blockIntro}>
          <h3>Dónde se mueve el trabajo legislativo</h3>
          <p>
            Comisiones, departamentos y oficinas que procesaron más <strong>trámites</strong> — cada paso formal registrado sobre un expediente. A mayor volumen, más concentración de trabajo.
          </p>
        </div>
        <div className={styles.card}>
          <div className={styles.rankList}>
            {topOrganos.map((o, i) => {
              const pct = Math.max(6, (o.total_tramites / maxTram) * 100)
              return (
                <div key={o.organo} className={styles.rankItem}>
                  <span className={styles.rankNum}>{String(i + 1).padStart(2, '0')}</span>
                  <div className={styles.rankBody}>
                    <div className={styles.rankName} title={o.organo}>{o.organo}</div>
                    <div className={styles.rankBar}>
                      <div className={styles.rankFill} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className={styles.rankMeta}>
                    <strong>{o.total_tramites.toLocaleString('es-CR')}</strong>
                    trámites
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
