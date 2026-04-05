'use client'
// src/components/sections/TemasDestacados.tsx
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { getPeriodos } from '@/lib/periodos'
import styles from './TemasDestacados.module.css'

const DEFAULT_PERIODO = 1 // "6 meses"

function Bar({ label, total, max, slug, loading }: { label: string, total: number, max: number, slug: string, loading: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const pct = max > 0 ? (total / max) * 100 : 0

  useEffect(() => {
    if (!loading && ref.current) {
      setTimeout(() => {
        if (ref.current) ref.current.style.width = `${pct}%`
      }, 50)
    } else if (loading && ref.current) {
      ref.current.style.width = '0%'
    }
  }, [pct, loading])

  return (
    <Link href={`/proyectos?categoria=${slug}`} className={styles.barRow}>
      <div className={styles.barLabel} title={label}>{label}</div>
      <div className={styles.barTrack}>
         <div className={styles.barFill} ref={ref} />
      </div>
      <div className={styles.barValue}>{total}</div>
    </Link>
  )
}

export default function TemasDestacados() {
  const periodos = getPeriodos()
  const [periodoIdx, setPeriodoIdx] = useState(DEFAULT_PERIODO)
  const [datos, setDatos] = useState<{ categoria: string; slug: string; total: number; porcentaje: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const desde = periodos[periodoIdx].desde()
    setLoading(true)
    api.metricas
      .general({ desde })
      .then(r => setDatos(r.por_categoria.slice(0, 7))) // Mostrar top 7 categorías
      .catch(() => setDatos([]))
      .finally(() => setLoading(false))
  }, [periodoIdx])

  const maxTotal = datos.length > 0 ? Math.max(...datos.map(d => d.total)) : 100

  return (
    <div className={styles.block}>
      {/* Cabecera */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.title}>Temas más discutidos</div>
          <div className={styles.sub}>
            Clasificación automática de proyectos de ley según temática.
            Descubrí en qué está trabajando la Asamblea.
          </div>
        </div>
        <div className={styles.periodoSelector} role="group" aria-label="Filtrar por período">
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

      {/* Gráfico */}
      <div className={styles.chart}>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
             <div key={i} className={styles.skeleton} />
          ))
        ) : datos.length === 0 ? (
          <div className={styles.empty}>No hay proyectos registrados en este período.</div>
        ) : (
          datos.map(d => (
             <Bar
               key={d.slug}
               slug={d.slug}
               label={d.categoria}
               total={d.total}
               max={maxTotal}
               loading={loading}
             />
          ))
        )}
      </div>
    </div>
  )
}
