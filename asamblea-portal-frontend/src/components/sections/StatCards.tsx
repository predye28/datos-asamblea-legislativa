'use client'
// src/components/sections/StatCards.tsx
import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { getPeriodos } from '@/lib/periodos'
import type { MetricaGeneral } from '@/lib/api'
import LoadingIndicator from '@/components/ui/LoadingIndicator'
import styles from './StatCards.module.css'

function useCountUp(target: number, duration = 1200) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!ref.current) return
    if (target === 0) {
      ref.current.textContent = '0'
      return
    }
    let start = 0
    const steps = duration / 16
    const inc = target / steps
    const timer = setInterval(() => {
      start = Math.min(start + inc, target)
      if (ref.current) ref.current.textContent = Math.round(start).toLocaleString('es-CR')
      if (start >= target) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return ref
}

export default function StatCards() {
  const [general, setGeneral] = useState<MetricaGeneral | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const periodos = getPeriodos()
    const fecha6Meses = periodos[1].desde() // index 1 es '6 meses'

    Promise.all([
      api.metricas.general(),
      api.metricas.general({ desde: fecha6Meses })
    ]).then(([todas, meses6]) => {
      setGeneral({
        ...todas.general,
        total_diputados_activos: meses6.general.total_diputados_activos
      })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const refTotal = useCountUp(general?.total_proyectos || 0)
  const refLeyes = useCountUp(general?.total_leyes_aprobadas || 0)
  const refMes   = useCountUp(general?.proyectos_este_mes || 0)
  const refDip   = useCountUp(general?.total_diputados_activos || 0)

  const cards = [
    {
      label: 'Expedientes totales',
      ref: refTotal,
      color: 'blue',
      sub: 'Presentados en la Asamblea',
      tooltip: 'Propuestas de proyectos de ley registradas oficialmente ante la secretaría del Plenario',
    },
    {
      label: 'Leyes aprobadas',
      ref: refLeyes,
      color: 'positive',
      sub: 'Del total de expedientes',
      tooltip: 'Proyectos que completaron satisfactoriamente el trámite legislativo en ambos debates',
    },
    {
      label: 'Este mes',
      ref: refMes,
      color: 'neutral',
      sub: 'Nuevos proyectos presentados',
      tooltip: 'Actividad legislativa del mes en curso',
    },
    {
      label: 'Diputados activos',
      ref: refDip,
      color: 'accent',
      sub: 'En los últimos 6 meses',
      tooltip: 'Muestra la cantidad de diputados con al menos una iniciativa presentada recientemente',
    },
  ]

  return (
    <div className={styles.grid}>
      {cards.map(c => (
        <div key={c.label} className={styles.card} title={c.tooltip}>
          <div className={styles.label}>{c.label}</div>
          <div className={`${styles.value} ${styles[c.color]}`}>
            {loading ? (
              <LoadingIndicator small />
            ) : (
              <span ref={c.ref}>0</span>
            )}
          </div>
          <div className={styles.sub}>{c.sub}</div>
        </div>
      ))}
    </div>
  )
}
