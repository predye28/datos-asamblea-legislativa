'use client'
// src/app/estadisticas/page.tsx
import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts'
import { api, MetricasResponse } from '@/lib/api'
import SectionRule from '@/components/ui/SectionRule'
import styles from './estadisticas.module.css'

const COLORS = ['#1a1814','#c0392b','#1a4b8c','#1a6b3c','#e67e22','#5c5a54','#9c9a92']

export default function EstadisticasPage() {
  const [data, setData] = useState<MetricasResponse | null>(null)
  const [linea, setLinea] = useState<{ anio: number; leyes_aprobadas: number }[]>([])

  useEffect(() => {
    api.metricas.general().then(setData)
    api.metricas.lineaTiempo().then(d => setLinea(d.datos))
  }, [])

  if (!data) return (
    <div className={styles.loading}>
      <div className={styles.loadingText}>Cargando estadísticas...</div>
    </div>
  )

  const { general, por_tipo, por_mes, top_diputados, organos_activos } = data

  return (
    <div style={{ paddingBottom: 80 }}>
      <div className={styles.pageHero}>
        <div className="container">
          <div className={styles.heroKicker}>Análisis de datos</div>
          <h1 className={styles.heroTitle}>Estadísticas legislativas</h1>
          <p className={styles.heroDeck}>
            Una mirada profunda a los patrones y tendencias de la Asamblea Legislativa.
            Todos los datos son oficiales.
          </p>
        </div>
      </div>

      <div className="container">

        {/* KPIs */}
        <SectionRule label="Números clave" />
        <div className={styles.kpiGrid}>
          {[
            { label: 'Total proyectos', value: general.total_proyectos.toLocaleString('es-CR'), color: 'blue' },
            { label: 'Leyes aprobadas', value: general.total_leyes_aprobadas.toLocaleString('es-CR'), color: 'positive' },
            { label: 'Tasa de aprobación', value: `${general.tasa_aprobacion_pct.toFixed(1)}%`, color: 'accent' },
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

        {/* Por mes */}
        <SectionRule label="Proyectos presentados por mes — últimos 12 meses" />
        <div className={styles.chartCard}>
          <div className={styles.chartExplain}>
            ¿Hay meses en que la Asamblea es más activa? Este gráfico muestra cuántos proyectos
            se presentaron cada mes en el último año.
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={por_mes.map(m => ({ name: `${m.mes_nombre} ${String(m.anio).slice(2)}`, total: m.total }))}
              margin={{ top: 8, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontFamily: 'IBM Plex Mono', fontSize: 10, fill: '#9c9a92' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontFamily: 'IBM Plex Mono', fontSize: 10, fill: '#9c9a92' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 11, border: '1px solid #d4cfc4', borderRadius: 0 }} />
              <Bar dataKey="total" radius={[2,2,0,0]}>
                {por_mes.map((_, i) => <Cell key={i} fill={i === por_mes.length - 1 ? '#c0392b' : '#1a1814'} opacity={0.3 + (i / por_mes.length) * 0.7} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

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
