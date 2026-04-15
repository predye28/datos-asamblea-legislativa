'use client'
// src/app/estadisticas/page.tsx
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
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

// Paleta de colores para las barras
const CAT_COLORS = [
  '#3B82F6', '#22C55E', '#F59E0B', '#EF4444',
  '#8B5CF6', '#06B6D4', '#EC4899', '#10B981',
]

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

  if (!data) return (
    <div style={{ paddingBottom: 40 }}>
      <LoadingIndicator text="Calculando estadísticas en tiempo real..." fillSpace={true} />
    </div>
  )

  const { general, por_tipo, por_mes, organos_activos } = data

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

        {/* ── Selector de período ─────────────────────────────────── */}
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
              ? <>Mostrando datos del período <strong>{periodo}</strong> ({desde} al {hasta})</>
              : <>Mostrando la <strong>base de datos completa</strong> sin filtros de tiempo</>
            }
          </p>
        </div>

        {/* ── KPIs ────────────────────────────────────────────────── */}
        <SectionRule label="Números clave" />
        <div className={styles.kpiGrid}>
          {[
            { label: 'Proyectos presentados', value: general.total_proyectos.toLocaleString('es-CR'), accent: false },
            { label: 'Leyes aprobadas', value: general.total_leyes_aprobadas.toLocaleString('es-CR'), accent: true },
            { label: 'Tasa de aprobación', value: `${general.tasa_aprobacion_pct.toFixed(1)}%`, accent: true },
            { label: 'Días promedio para ser ley', value: `${general.promedio_dias_aprobacion.toLocaleString('es-CR')}`, accent: false },
            { label: 'Prom. trámites por proyecto', value: general.promedio_tramites.toFixed(1), accent: false },
            { label: 'Proyectos este año', value: general.proyectos_este_anio.toLocaleString('es-CR'), accent: false },
          ].map(k => (
            <div key={k.label} className={`${styles.kpi} ${k.accent ? styles.kpiAccent : ''}`}>
              <div className={styles.kpiValue}>{k.value}</div>
              <div className={styles.kpiLabel}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* ── Temas en debate ─────────────────────────────────────── */}
        <SectionRule label="Temas en debate" />
        <TemasDestacados desde={desde} hasta={hasta} periodoLabel={periodo ? `período ${periodo}` : undefined} />

        {/* ── Tasa de éxito por tema ──────────────────────────────── */}
        <SectionRule label="Eficacia por tema" />
        <div className={styles.card}>
          <p className={styles.cardDesc}>
            ¿Qué porcentaje de los proyectos propuestos en cada tema logran convertirse en ley?
          </p>
          <div className={styles.eficaciaList}>
            {[...data.por_categoria]
              .filter(c => c.total > 5)
              .sort((a, b) => b.tasa_aprobacion - a.tasa_aprobacion)
              .slice(0, 8)
              .map((c, i) => {
              const catColor = CAT_COLORS[i % CAT_COLORS.length]
              return (
                <div 
                  key={c.slug} 
                  className={styles.eficaciaItem}
                  style={{ '--cat-color': catColor } as React.CSSProperties}
                >
                  <div className={styles.eficaciaHeader}>
                    <span className={styles.eficaciaTema}>{c.categoria}</span>
                    <span className={styles.eficaciaPct} style={{ color: catColor }}>
                      {c.tasa_aprobacion}%
                    </span>
                  </div>
                  <div className={styles.eficaciaStats}>
                    <span>{c.total.toLocaleString('es-CR')} proyectos</span>
                    <span>{c.leyes_aprobadas} leyes</span>
                  </div>
                  <div className={styles.eficaciaBar}>
                    <div
                      className={styles.eficaciaFill}
                      style={{
                        width: `${c.tasa_aprobacion}%`,
                        background: catColor,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Top Diputados por Eficacia ──────────────────────────── */}
        {data.top_diputados_eficacia && data.top_diputados_eficacia.length > 0 && (
          <>
            <SectionRule label="Diputados Destacados (Proyectos convertidos en Ley)" />
            <div className={styles.card}>
              <p className={styles.cardDesc}>
                Diputados con mayor éxito aprobando sus propuestas. Se consideran únicamente proponentes con al menos 5 proyectos presentados.
              </p>
              <div className={styles.eficaciaList}>
                {data.top_diputados_eficacia.map((d, i) => {
                  const nombreFormateado = d.nombre_completo.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                  return (
                    <Link
                      href={`/diputados/${encodeURIComponent(d.nombre_completo)}`}
                      key={d.nombre_completo + i} 
                      className={styles.eficaciaItem}
                      style={{ '--cat-color': 'var(--accent)', textDecoration: 'none' } as React.CSSProperties}
                    >
                      <div className={styles.eficaciaHeader}>
                        <span className={styles.eficaciaTema}>{nombreFormateado}</span>
                        <span className={styles.eficaciaPct} style={{ color: 'var(--accent)' }}>
                          {d.tasa_aprobacion}%
                        </span>
                      </div>
                      <div className={styles.eficaciaStats}>
                        <span>{d.total_proyectos} propuestos</span>
                        <span>{d.leyes_aprobadas} aprobados</span>
                      </div>
                      <div className={styles.eficaciaBar}>
                        <div
                          className={styles.eficaciaFill}
                          style={{
                            width: `${d.tasa_aprobacion}%`,
                            background: 'var(--accent)',
                          }}
                        />
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* ── Próximos a vencer ───────────────────────────────────── */}
        <SectionRule label="Proyectos próximos a vencer" />
        <ProximosVencer clientMode={true} maxItems={5} />

        {/* ── Timeline mensual ────────────────────────────────────── */}
        <TimelineInteractiva datosIniciales={por_mes} />

        {/* ── Distribución por tipo ───────────────────────────────── */}
        <SectionRule label="Distribución por tipo de expediente" />
        <div className={styles.card}>
          <p className={styles.cardDesc}>
            No todos los proyectos son iguales. Hay distintos tipos según su naturaleza jurídica.
          </p>
          <div className={styles.tipoList}>
            {por_tipo.map((t, i) => (
              <div key={t.tipo} className={styles.tipoItem}>
                <div className={styles.tipoMeta}>
                  <span className={styles.tipoName}>{t.tipo}</span>
                  <span className={styles.tipoCount}>{t.total.toLocaleString('es-CR')} · {t.porcentaje.toFixed(1)}%</span>
                </div>
                <div className={styles.tipoBar}>
                  <div
                    className={styles.tipoFill}
                    style={{ width: `${t.porcentaje}%`, background: CAT_COLORS[i % CAT_COLORS.length] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Historial leyes por año ─────────────────────────────── */}
        {linea.length > 0 && (
          <>
            <SectionRule label="Leyes aprobadas por año — histórico" />
            <div className={styles.card}>
              <p className={styles.cardDesc}>
                Productividad legislativa histórica medida en conversiones a ley.
              </p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={linea} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
                  <XAxis
                    dataKey="anio"
                    tick={{ fontFamily: 'IBM Plex Mono', fontSize: 9, fill: '#94A3B8' }}
                    axisLine={false} tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontFamily: 'IBM Plex Mono', fontSize: 9, fill: '#94A3B8' }}
                    axisLine={false} tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#1E293B',
                      border: '1px solid #334155',
                      borderRadius: 8,
                      fontFamily: 'IBM Plex Mono',
                      fontSize: 11,
                    }}
                    cursor={{ fill: 'rgba(59,130,246,0.08)' }}
                  />
                  <Bar dataKey="leyes_aprobadas" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* ── Órganos más activos ─────────────────────────────────── */}
        <SectionRule label="Órganos más activos en tramitación" />
        <div className={styles.card}>
          <p className={styles.cardDesc}>
            Comisiones y órganos con mayor volumen de trámites procesados.
          </p>
          <div className={styles.organoList}>
            {organos_activos.map((o, i) => {
              const pct = Math.round((o.total_tramites / organos_activos[0].total_tramites) * 100)
              return (
                <div key={o.organo} className={styles.organoItem}>
                  <div className={styles.organoTop}>
                    <span className={styles.organoRank}>{i + 1}</span>
                    <span className={styles.organoName}>{o.organo}</span>
                    <span className={styles.organoCount}>{o.total_tramites.toLocaleString('es-CR')}</span>
                  </div>
                  <div className={styles.organoBar}>
                    <div className={styles.organoFill} style={{ width: `${pct}%` }} />
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
