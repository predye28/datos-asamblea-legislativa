'use client'
// src/app/estadisticas/page.tsx
import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts'
import { api, MetricasResponse } from '@/lib/api'
import { getAllLegislativePeriods } from '@/lib/periodos'
import SectionRule from '@/components/ui/SectionRule'
import Hero from '@/components/sections/Hero'
import ProximosVencer from '@/components/sections/ProximosVencer'
import TimelineInteractiva from '@/components/sections/TimelineInteractiva'
import TemasDestacados from '@/components/sections/TemasDestacados'
import LoadingIndicator from '@/components/ui/LoadingIndicator'
import styles from './estadisticas.module.css'

const COLORS = ['#1a1814','#c0392b','#1a4b8c','#1a6b3c','#e67e22','#5c5a54','#9c9a92']

export default function EstadisticasPage() {
  const [data, setData] = useState<MetricasResponse | null>(null)
  const [linea, setLinea] = useState<{ anio: number; leyes_aprobadas: number }[]>([])
  
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [periodo, setPeriodo] = useState('')

  const periodos = getAllLegislativePeriods()

  const handlePeriodChange = (val: string) => {
    setPeriodo(val)
    if (!val) {
      setDesde('')
      setHasta('')
      return
    }
    const p = periodos.find(x => x.label === val)
    if (p) {
      setDesde(p.desde)
      setHasta(p.hasta)
    }
  }



  useEffect(() => {
    api.metricas.general({ desde, hasta }).then(setData)
  }, [desde, hasta])

  useEffect(() => {
    api.metricas.lineaTiempo().then(d => setLinea(d.datos))
  }, [])

  if (!data) return (
    <div style={{ paddingBottom: 80 }}>
      <LoadingIndicator text="Calculando estadísticas en tiempo real..." fillSpace={true} />
    </div>
  )

  const { general, por_tipo, por_mes, top_diputados, organos_activos } = data

  return (
    <div style={{ paddingBottom: 80 }}>
      <Hero
        kicker="Análisis de datos"
        headline="Estadísticas legislativas"
        deck="Una mirada profunda a los patrones y tendencias de la Asamblea Legislativa. Todos los datos son oficiales."
      />

      <div className="container">
        
        {/* Filtros de Período */}
        <SectionRule label="Seleccionar Periodo Legislativo" />
        <div className={styles.dateFilters}>
          <div className={styles.dateInputGroup} style={{ flex: '1 1 100%' }}>
            <select 
              value={periodo} 
              onChange={e => handlePeriodChange(e.target.value)}
              className={styles.dateInput}
            >
              <option value="">Todos los registros históricos</option>
              {periodos.map(p => (
                <option key={p.label} value={p.label}>Periodo Legislativo {p.label}</option>
              ))}
            </select>
          </div>
          
          <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <span className={styles.dateRangeMeta}>
              {periodo ? (
                <>Mostrando datos del <strong>{periodo}</strong> ({desde} al {hasta})</>
              ) : (
                <>Mostrando la <strong>base de datos completa</strong> (sin filtros de tiempo)</>
              )}
            </span>

            {periodo && (
              <button className={styles.clearBtn} onClick={() => { setDesde(''); setHasta(''); setPeriodo(''); }}>
                Ver todo el histórico
              </button>
            )}
          </div>
        </div>

        {/* KPIs */}
        <SectionRule label="Números clave" />
        <div className={styles.kpiGrid}>
          {[
            { label: 'Total proyectos', value: general.total_proyectos.toLocaleString('es-CR'), color: 'blue' },
            { label: 'Leyes aprobadas', value: general.total_leyes_aprobadas.toLocaleString('es-CR'), color: 'positive' },
            { label: 'Tasa de aprobación', value: `${general.tasa_aprobacion_pct.toFixed(1)}%`, color: 'accent' },
            { label: 'Tiempo para ser ley', value: `~${general.promedio_dias_aprobacion.toLocaleString('es-CR')} días`, color: 'accent' },
            { label: 'Prom. trámites por proyecto', value: general.promedio_tramites.toFixed(1), color: 'neutral' },
            { label: 'Proyectos este año', value: general.proyectos_este_anio.toLocaleString('es-CR'), color: 'neutral' },
            { label: 'Diputados activos', value: general.total_diputados_activos.toString(), color: 'neutral' },
          ].map(k => (
            <div key={k.label} className={styles.kpi}>
              <div className={styles.kpiLabel}>{k.label}</div>
              <div className={`${styles.kpiValue} ${styles[k.color]}`}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Por Temas / Categorías */}
        <SectionRule label="Temas en debate" />
        <TemasDestacados />

        {/* Próximos a Vencer */}
        <SectionRule label="Proyectos próximos a vencer" />
        <ProximosVencer clientMode={true} />

        <TimelineInteractiva datosIniciales={por_mes} />

        {/* Por tipo */}
        <SectionRule label="Distribución por tipo de expediente" />
        <div className={styles.chartCard}>
          <div className={styles.chartExplain}>
            No todos los proyectos son iguales. Hay distintos tipos según su naturaleza
            jurídica y el procedimiento que siguen.
          </div>
          <div className={styles.tipoGrid}>
            {por_tipo.map((t, i) => (
              <div key={t.tipo} className={styles.tipoItem}>
                <div className={styles.tipoBar}>
                  <div
                    className={styles.tipoBarFill}
                    style={{ width: `${t.porcentaje}%`, background: COLORS[i % COLORS.length] }}
                  />
                </div>
                <div className={styles.tipoMeta}>
                  <span className={styles.tipoName}>{t.tipo}</span>
                  <span className={styles.tipoCount}>{t.total.toLocaleString('es-CR')} ({t.porcentaje.toFixed(1)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tasa de éxito por tema */}
        <SectionRule label="Tasa de éxito por tema (Eficacia real)" />
        <div className={styles.chartCard} style={{ marginBottom: 32 }}>
          <div className={styles.chartExplain}>
            Un tema puede tener muchos proyectos propuestos, pero ¿qué porcentaje realmente logra completar su camino y convertirse en ley?
            Este gráfico revela qué temas logran consenso legislativo (leyes publicadas) versus cuáles se archivan o descartan.
          </div>
          <div className={styles.tipoGrid}>
            {data.por_categoria.filter(c => c.total > 5).slice(0, 8).map((c, i) => (
              <div key={c.slug} className={styles.tipoItem} style={{ borderLeft: `6px solid ${COLORS[i % COLORS.length]}`, paddingLeft: 12, background: 'var(--paper-warm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 14 }}>{c.categoria}</span>
                  <span style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 16 }}>{c.tasa_aprobacion}% <span style={{fontSize: 11, fontWeight: 'normal', color: 'var(--ink-muted)'}}>de éxito</span></span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{c.total.toLocaleString('es-CR')} proyectos propuestos</span>
                  <span>{c.leyes_aprobadas.toLocaleString('es-CR')} convertidos en ley</span>
                </div>
                <div className={styles.tipoBar} style={{ marginTop: 8, height: 8 }}>
                  <div
                    className={styles.tipoBarFill}
                    style={{ width: `${c.tasa_aprobacion}%`, background: COLORS[i % COLORS.length], borderRadius: '0' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Línea de tiempo histórica */}
        {linea.length > 0 && (
          <>
            <SectionRule label="Leyes aprobadas por año — histórico" />
            <div className={styles.chartCard}>
              <div className={styles.chartExplain}>
                ¿En qué años se aprobaron más leyes? Esta es la productividad legislativa
                histórica medida en conversiones a ley.
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={linea} margin={{ top: 8, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="anio" tick={{ fontFamily: 'IBM Plex Mono', fontSize: 10, fill: '#9c9a92' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontFamily: 'IBM Plex Mono', fontSize: 10, fill: '#9c9a92' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 11, border: '1px solid #d4cfc4', borderRadius: 0 }} />
                  <Bar dataKey="leyes_aprobadas" fill="#1a6b3c" radius={[2,2,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* Órganos */}
        <SectionRule label="Órganos más activos en tramitación" />
        <div className={styles.chartCard}>
          <div className={styles.chartExplain}>
            Las comisiones y órganos que más proyectos han tramitado.
            Un órgano con muchos trámites es un cuello de botella o un motor legislativo.
          </div>
          <div className={styles.organoList}>
            {organos_activos.map((o, i) => {
              const pct = Math.round((o.total_tramites / organos_activos[0].total_tramites) * 100)
              return (
                <div key={o.organo} className={styles.organoItem}>
                  <div className={styles.organoName}>{o.organo}</div>
                  <div className={styles.organoBarWrap}>
                    <div className={styles.organoBarFill} style={{ width: `${pct}%` }} />
                  </div>
                  <div className={styles.organoCount}>{o.total_tramites.toLocaleString('es-CR')}</div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
