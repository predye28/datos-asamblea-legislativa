'use client'
// src/components/sections/StatCards.tsx
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { getPeriodos } from '@/lib/periodos'
import { useCountUp } from '@/lib/hooks'
import type { MetricaGeneral } from '@/lib/api'
import LoadingIndicator from '@/components/ui/LoadingIndicator'
import styles from './StatCards.module.css'


export default function StatCards() {
  const [general, setGeneral] = useState<MetricaGeneral | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const periodos = getPeriodos()
    const currentPeriod = periodos[3]
    const fechaPeriodo = currentPeriod.desde()

    Promise.all([
      api.metricas.general(),
      api.metricas.general({ desde: fechaPeriodo })
    ]).then(([todas, periodoData]) => {
      setGeneral({
        ...todas.general,
        total_diputados_activos: periodoData.general.total_diputados_activos
      })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const refTotal = useCountUp<HTMLSpanElement>(general?.total_proyectos || 0)
  const refLeyes = useCountUp<HTMLSpanElement>(general?.total_leyes_aprobadas || 0)
  const refMes   = useCountUp<HTMLSpanElement>(general?.proyectos_este_mes || 0)
  const refDip   = useCountUp<HTMLSpanElement>(general?.total_diputados_activos || 0)

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
      sub: 'En el período 2022-2026',
      tooltip: 'Muestra la cantidad de diputados con al menos una iniciativa presentada en el período actual',
    },
  ]

  return (
    <div className={styles.grid}>
      {cards.map(c => (
        <div key={c.label} className={`${styles.card} ${styles[c.color]}`} title={c.tooltip}>
          <div className={styles.label}>{c.label}</div>
          <div className={styles.value}>
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
