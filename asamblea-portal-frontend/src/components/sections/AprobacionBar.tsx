'use client'
// src/components/sections/AprobacionBar.tsx
import { useEffect, useRef } from 'react'
import styles from './AprobacionBar.module.css'

interface Props { pct: number; total: number; leyes: number }

export default function AprobacionBar({ pct, total, leyes }: Props) {
  const barRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const t = setTimeout(() => {
      if (barRef.current) barRef.current.style.width = `${Math.min(pct, 100)}%`
    }, 400)
    return () => clearTimeout(t)
  }, [pct])

  return (
    <div className={styles.block}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>¿Cuántos proyectos se aprueban?</div>
          <div className={styles.counts}>
            {leyes.toLocaleString('es-CR')} leyes de {total.toLocaleString('es-CR')} proyectos
          </div>
        </div>
        <div className={styles.pct}>{pct.toFixed(1)}%</div>
      </div>
      <div className={styles.barBg}>
        <div className={styles.barFill} ref={barRef} />
      </div>
      <p className={styles.explanation}>
        De cada 100 proyectos que un diputado presenta, solo {pct.toFixed(1)} llegan a
        convertirse en ley. El resto queda archivado, en comisión, o vence antes de ser
        votado. Esto no necesariamente es malo: un filtro legislativo existe para garantizar
        que las leyes sean discutidas con cuidado.
      </p>
    </div>
  )
}
