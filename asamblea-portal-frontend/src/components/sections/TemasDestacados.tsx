'use client'
// src/components/sections/TemasDestacados.tsx
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { getPeriodos, getAllLegislativePeriods } from '@/lib/periodos'
import { cleanText } from '@/lib/utils'
import styles from './TemasDestacados.module.css'


const COLORS = [
  '#D30001', // Ruby Red
  '#FFDA6B', // Ruby Gold
  '#E11D48', // Crimson
  '#B45309', // Amber Dark
  '#991B1B', // Red Dark
  '#F59E0B', // Amber
  '#7F1D1D', // Maroon
  '#D97706'  // Orange-Gold
]

function TemaCard({ label, total, leyes, pct, slug, color, loading }: { label: string, total: number, leyes: number, pct: number, slug: string, color: string, loading: boolean }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!loading && ref.current) {
      setTimeout(() => {
        if (ref.current) ref.current.style.width = `${pct}%`
      }, 50)
    } else if (loading && ref.current) {
      ref.current.style.width = '0%'
    }
  }, [pct, loading])

  const displayLeyes = leyes || 0
  const displayPct = pct || 0

  return (
    <Link href={`/proyectos?categoria=${slug}`} className={styles.cardWrapper}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle} title={cleanText(label)}>{cleanText(label)}</div>
        <div className={styles.cardBadge} style={{ backgroundColor: color }}>
          {displayPct.toFixed(1).replace(/\.0$/, '')}% éxito
        </div>
      </div>

      <div className={styles.cardMetrics}>
        <div className={styles.metricItem}>
          <span className={styles.metricValue}>{total}</span>
          <span className={styles.metricLabel}>Propuestos</span>
        </div>
        <div className={styles.metricItemRight}>
          <span className={styles.metricValue}>{displayLeyes}</span>
          <span className={styles.metricLabel}>Leyes</span>
        </div>
      </div>

      <div className={styles.gaugeContainer}>
        <div className={styles.gaugeLabel}>Eficiencia legislativa</div>
        <div className={styles.gaugeTrack}>
          <div 
            className={styles.gaugeFill} 
            ref={ref} 
            style={{ 
              backgroundColor: color,
              boxShadow: `0 0 12px ${color}44`
            }} 
          />
        </div>
      </div>
    </Link>
  )
}

export default function TemasDestacados({ desde, hasta, periodoLabel }: { desde?: string, hasta?: string, periodoLabel?: string }) {  
  const [selectedPreset, setSelectedPreset] = useState<'este_mes' | '6_meses' | 'este_anio' | 'periodo'>('periodo')
  const [selectedPeriodo, setSelectedPeriodo] = useState(() => getAllLegislativePeriods()[0].label)
  const [isOpen, setIsOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  const [datos, setDatos] = useState<{ categoria: string; slug: string; total: number; porcentaje: number; leyes_aprobadas: number; tasa_aprobacion: number }[]>([])
  const [loading, setLoading] = useState(true)

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const periodos = getPeriodos()
    const todosLosPeriodos = getAllLegislativePeriods()

    const useGlobalInfo = !!(desde || hasta)
    let filtroDesde = undefined
    let filtroHasta = undefined

    if (useGlobalInfo) {
      filtroDesde = desde
      filtroHasta = hasta
    } else {
      if (selectedPreset === 'este_mes') {
        filtroDesde = periodos[0].desde()
      } else if (selectedPreset === '6_meses') {
        filtroDesde = periodos[1].desde()
      } else if (selectedPreset === 'este_anio') {
        filtroDesde = periodos[2].desde()
      } else if (selectedPreset === 'periodo') {
        const p = todosLosPeriodos.find(x => x.label === selectedPeriodo) || todosLosPeriodos[0]
        filtroDesde = p.desde
        filtroHasta = p.hasta
      }
    }

    setLoading(true)
    api.metricas
      .general({ desde: filtroDesde, hasta: filtroHasta })
      .then(r => {
        // Ordenar por tasa de aprobación (Calidad antes que Cantidad)
        const sorted = [...r.por_categoria].sort((a, b) => b.tasa_aprobacion - a.tasa_aprobacion)
        setDatos(sorted.slice(0, 8))
      })
      .catch(() => setDatos([]))
      .finally(() => setLoading(false))
  }, [selectedPreset, selectedPeriodo, desde, hasta])

  const isGlobalFilterActive = !!(desde || hasta)

  return (
    <div className={styles.block}>
      {/* Cabecera */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.title}>Temas más discutidos</div>
          <div className={styles.sub}>
            ¿Qué porcentaje de los proyectos propuestos en cada tema logran convertirse en ley?{' '}
            {isGlobalFilterActive && periodoLabel && (
              <span style={{color: 'var(--accent)'}}>
                <br />Resultados para el <strong>{periodoLabel}</strong>.
              </span>
            )}
          </div>
        </div>
        
        {!isGlobalFilterActive && (
          <div className={styles.periodoSelector} role="group" aria-label="Filtrar por período" ref={filterRef}>
            <button 
              className={`${styles.periodoBtn} ${selectedPreset === 'este_mes' ? styles.periodoBtnActive : ''}`} 
              onClick={() => setSelectedPreset('este_mes')}
            >
              ESTE MES
            </button>
            <button 
              className={`${styles.periodoBtn} ${selectedPreset === '6_meses' ? styles.periodoBtnActive : ''}`} 
              onClick={() => setSelectedPreset('6_meses')}
            >
              6 MESES
            </button>
            <button 
              className={`${styles.periodoBtn} ${selectedPreset === 'este_anio' ? styles.periodoBtnActive : ''}`} 
              onClick={() => setSelectedPreset('este_anio')}
            >
              ESTE AÑO
            </button>
            <div className={styles.filterContainer}>
              <button 
                 className={`${styles.filterToggle} ${selectedPreset === 'periodo' ? styles.periodoBtnActive : ''}`} 
                 onClick={() => { setIsOpen(!isOpen); setSelectedPreset('periodo') }}
              >
                PERÍODO {selectedPeriodo}
                <span className={`${styles.toggleIcon} ${isOpen ? styles.toggleIconOpen : ''}`}>▼</span>
              </button>
              <div className={`${styles.filterRow} ${isOpen ? styles.filterRowOpen : ''}`}>
                {getAllLegislativePeriods().map(p => (
                  <button 
                    key={p.label}
                    className={`${styles.chip} ${selectedPeriodo === p.label ? styles.chipActive : ''}`}
                    onClick={() => { setSelectedPeriodo(p.label); setSelectedPreset('periodo'); setIsOpen(false); }}
                  >
                    Periodo {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grilla */}
      <div className={styles.grid}>
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
             <div key={i} className={styles.cardSkeleton} />
          ))
        ) : datos.length === 0 ? (
          <div className={styles.empty}>No hay proyectos registrados en este período.</div>
        ) : (
          datos.map((d, i) => (
             <TemaCard
               key={d.slug}
               slug={d.slug}
               label={d.categoria}
               total={d.total}
               leyes={d.leyes_aprobadas}
               pct={d.tasa_aprobacion}
               color={COLORS[i % COLORS.length]}
               loading={loading}
             />
          ))
        )}
      </div>
    </div>
  )
}
