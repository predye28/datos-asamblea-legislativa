'use client'
// src/components/sections/StatCards.tsx
import { useEffect, useRef } from 'react'
import type { MetricaGeneral } from '@/lib/api'
import styles from './StatCards.module.css'

function useCountUp(target: number, duration = 1200) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!ref.current) return
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

interface Props { general: MetricaGeneral }

export default function StatCards({ general }: Props) {
  const refTotal = useCountUp(general.total_proyectos)
  const refLeyes = useCountUp(general.total_leyes_aprobadas)
  const refMes   = useCountUp(general.proyectos_este_mes)
  const refDip   = useCountUp(general.total_diputados_activos)

  const cards = [
    {
      label: 'Proyectos en total',
      ref: refTotal,
      color: 'blue',
      sub: 'Presentados en la Asamblea',
      tooltip: 'Cada proyecto es una propuesta de ley que algún diputado presentó para votación',
    },
    {
      label: 'Se convirtieron en ley',
      ref: refLeyes,
      color: 'positive',
      sub: 'Del total de propuestas',
      tooltip: 'Solo una pequeña fracción de los proyectos llega a convertirse en ley vigente',
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
      sub: 'Han presentado al menos un proyecto',
      tooltip: 'Diputados con actividad legislativa registrada',
    },
  ]

  return (
    <div className={styles.grid}>
      {cards.map(c => (
        <div key={c.label} className={styles.card} title={c.tooltip}>
          <div className={styles.label}>{c.label}</div>
          <div className={`${styles.value} ${styles[c.color]}`}>
            <span ref={c.ref}>0</span>
          </div>
          <div className={styles.sub}>{c.sub}</div>
        </div>
      ))}
    </div>
  )
}
