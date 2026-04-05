// src/components/sections/ResumenMetricas.tsx
'use client'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import type { MetricaGeneral } from '@/lib/api'
import { getPeriodos } from '@/lib/periodos'
import { useCountUp } from '@/lib/hooks'
import LoadingIndicator from '@/components/ui/LoadingIndicator'
import styles from './ResumenMetricas.module.css'


function StatItem({ label, value, colorClass, loading }: { label: string, value: number, colorClass: string, loading: boolean }) {
  const ref = useCountUp<HTMLDivElement>(value)
  return (
    <div className={styles.statCard}>
      <div className={styles.statLabel}>{label}</div>
      <div className={`${styles.statValue} ${styles[colorClass]}`}>
        {loading ? (
          <LoadingIndicator small />
        ) : (
          <div ref={ref}>{value}</div>
        )}
      </div>
    </div>
  )
}

export default function ResumenMetricas() {
  const periodos = getPeriodos()
  const [periodoIdx, setPeriodoIdx] = useState(1) // 6 meses
  const [data, setData] = useState<MetricaGeneral | null>(null)
  const [loading, setLoading] = useState(true)

  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    const desde = periodos[periodoIdx].desde()
    api.metricas.general({ desde })
      .then(r => setData(r.general))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [periodoIdx])

  const total = data?.total_proyectos || 0
  const leyes = data?.total_leyes_aprobadas || 0
  const pct = data?.tasa_aprobacion_pct || 0

  // Animar la barra de porcentaje
  useEffect(() => {
    if (!loading && barRef.current) {
      setTimeout(() => {
        if (barRef.current) barRef.current.style.width = `${Math.min(pct, 100)}%`
      }, 100)
    } else if (loading && barRef.current) {
       barRef.current.style.width = '0%'
    }
  }, [pct, loading])

  return (
    <div className={styles.block}>
      <div className={styles.header}>
        <div className={styles.title}>Avance de proyectos hacia ley</div>
        {/* Selector de período */}
        <div className={styles.periodoSelector}>
          {periodos.map((p, i) => (
            <button
              key={p.label}
              className={`${styles.periodoBtn} ${i === periodoIdx ? styles.periodoBtnActive : ''}`}
              onClick={() => setPeriodoIdx(i)}
              aria-pressed={i === periodoIdx}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.content}>
        {/* Tarjetas de números */}
        <div className={styles.statsGrid}>
           <StatItem label="Proyectos presentados" value={total} colorClass="blue" loading={loading} />
           <StatItem label="Convertidos en ley" value={leyes} colorClass="positive" loading={loading} />
        </div>

        {/* Barra de progreso */}
        <div className={styles.barWrap}>
          <div className={styles.barTop}>
            <span className={styles.barLabel}>Tasa de aprobación</span>
            <span className={styles.barPct}>
              {loading ? '...' : `${pct.toFixed(1)}%`}
            </span>
          </div>
          <div className={styles.barBg}>
             <div className={styles.barFill} ref={barRef} />
          </div>
          <p className={styles.barHelp}>
              Un {pct.toFixed(1)}% de los expedientes ya ha completado su trámite y es ley de la República. El resto se encuentra en diversas etapas del proceso legislativo, en consulta pública o ha sido archivado conforme a la ley.
          </p>
        </div>
      </div>
    </div>
  )
}
