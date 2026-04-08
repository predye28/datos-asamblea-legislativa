'use client'
// src/components/sections/RankingDiputados.tsx
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { DiputadoRanking } from '@/lib/api'
import { getPeriodos } from '@/lib/periodos'
import styles from './RankingDiputados.module.css'

const DEFAULT_PERIODO = 1 // "6 meses"

export default function RankingDiputados() {
  const periodos = getPeriodos()
  const [periodoIdx, setPeriodoIdx] = useState(DEFAULT_PERIODO)
  const [datos, setDatos] = useState<DiputadoRanking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const desde = periodos[periodoIdx].desde()
    setLoading(true)
    api.metricas
      .general({ desde })
      .then(r => setDatos(r.top_diputados))
      .catch(() => setDatos([]))
      .finally(() => setLoading(false))
  }, [periodoIdx])

  return (
    <div className={styles.block}>
      {/* Cabecera con título + selector de período */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.title}>Iniciativas según diputación</div>
          <div className={styles.sub}>
            Registro administrativo de cantidad de proyectos presentados en el período seleccionado.
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

      {/* Lista */}
      <div className={styles.list}>
        {loading ? (
          // Skeleton
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={styles.skeleton} />
          ))
        ) : datos.length === 0 ? (
          <div className={styles.empty}>Sin actividad para este período</div>
        ) : (
          datos.map((d, i) => (
            <Link
              key={d.nombre_completo}
              href={`/diputados/${encodeURIComponent(d.nombre_completo)}`}
              className={styles.item}
            >
              <span className={`${styles.num} ${i < 3 ? styles.numAccent : ''}`}>
                {i + 1}
              </span>
              <div className={styles.name}>
                <strong>{d.nombre_completo}</strong>
              </div>
              <span className={styles.badge}>{d.total_proyectos} proyectos</span>
            </Link>
          ))
        )}
      </div>

      {/* CTA sutil */}
      {!loading && datos.length > 0 && (
        <Link href="/diputados" className={styles.verTodosCta}>
          Ver ranking completo de diputados →
        </Link>
      )}
    </div>
  )
}
