'use client'

import { useEffect, useState, useRef, CSSProperties } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { MetricasResponse } from '@/lib/api'
import styles from './FeatureBlocks.module.css'

type DataItem = { value: string; label: string }

const fmt = (n: number | undefined | null): string =>
  n == null ? '—' : n.toLocaleString('es-CR')

// ── Card ───────────────────────────────────────────────────────────────

interface CardProps {
  index: number
  num: string
  accent: string
  title: string
  promise: string
  data: DataItem[]
  href: string
  cta: string
}

function Card({ index, num, accent, title, promise, data, href, cta }: CardProps) {
  return (
    <div
      className={styles.card}
      style={{ '--card-accent': accent, '--i': index } as CSSProperties}
    >
      <h3 className={styles.cardTitle}>{title}</h3>
      <p className={styles.promise}>{promise}</p>

      <div className={styles.dataList}>
        {data.map((d, i) => (
          <div key={i} className={styles.dataRow}>
            <span className={styles.dataValue}>{d.value}</span>
            <span className={styles.dataLabel}>{d.label}</span>
          </div>
        ))}
      </div>

      <Link href={href} className={styles.cta}>
        <span>{cta}</span>
        <span className={styles.arrow}>→</span>
      </Link>
    </div>
  )
}

// ── Data builders ──────────────────────────────────────────────────────

function buildProyectos(data: MetricasResponse | null): DataItem[] {
  if (!data) {
    return [
      { value: '—', label: 'proyectos registrados' },
      { value: '—', label: 'presentados este año' },
      { value: '—', label: 'llegan a ser ley' },
    ]
  }
  const g = data.general
  return [
    { value: fmt(g.total_proyectos), label: 'proyectos registrados' },
    { value: fmt(g.proyectos_este_anio), label: 'presentados este año' },
    { value: `${Math.round(g.tasa_aprobacion_pct)}%`, label: 'llegan a ser ley' },
  ]
}

function buildEstadisticas(data: MetricasResponse | null): DataItem[] {
  if (!data) {
    return [
      { value: '—', label: 'tasa de aprobación' },
      { value: '—', label: 'leyes vigentes' },
      { value: '—', label: 'tiempo promedio' },
    ]
  }
  const g = data.general
  const años = g.promedio_dias_aprobacion / 365
  const tiempo = años >= 2 ? `${Math.round(años)} años` : `${años.toFixed(1)} años`
  return [
    { value: `${Math.round(g.tasa_aprobacion_pct)}%`, label: 'tasa de aprobación' },
    { value: fmt(g.total_leyes_aprobadas), label: 'leyes vigentes' },
    { value: tiempo, label: 'tiempo promedio de aprobación' },
  ]
}

function buildDiputados(data: MetricasResponse | null): DataItem[] {
  if (!data) {
    return [
      { value: '—', label: 'diputados activos' },
      { value: '—', label: 'diputado más activo' },
      { value: '—', label: 'mejor eficacia' },
    ]
  }
  const g = data.general
  const top = data.top_diputados[0]
  const eficaz = data.top_diputados_eficacia?.[0]
  return [
    { value: String(g.total_diputados_activos), label: 'diputados activos' },
    { value: top ? `${top.total_proyectos}` : '—', label: top ? `proyectos del más activo (${top.apellidos})` : 'diputado más activo' },
    { value: eficaz ? `${Math.round(eficaz.tasa_aprobacion)}%` : '—', label: eficaz ? `mejor eficacia (${eficaz.apellidos})` : 'mejor eficacia' },
  ]
}

// ── Main export ────────────────────────────────────────────────────────

export default function FeatureBlocks() {
  const [data, setData] = useState<MetricasResponse | null>(null)
  const [inView, setInView] = useState(false)
  const gridRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    api.metricas.general().then(setData).catch(() => {})
  }, [])

  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true)
            obs.disconnect()
            break
          }
        }
      },
      { threshold: 0.15 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <section className={styles.section}>
      <div className={styles.container}>

        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionEyebrow}>Explorá la Asamblea</h2>
        </div>

        <div
          ref={gridRef}
          className={`${styles.grid} ${inView ? styles.inView : ''}`}
        >
          <Card
            index={0}
            num="01"
            accent="#0EA5E9"
            title="Proyectos"
            promise="Buscá, filtrá y leé cualquier iniciativa legislativa presentada en la Asamblea."
            data={buildProyectos(data)}
            href="/proyectos"
            cta="Explorar proyectos"
          />
          <Card
            index={1}
            num="02"
            accent="#F59E0B"
            title="Estadísticas"
            promise="Gráficos y tendencias que muestran cómo trabaja la Asamblea en el tiempo."
            data={buildEstadisticas(data)}
            href="/estadisticas"
            cta="Ver estadísticas"
          />
          <Card
            index={2}
            num="03"
            accent="#6366F1"
            title="Diputados"
            promise="Perfil completo, proyectos presentados y eficacia legislativa de cada diputado."
            data={buildDiputados(data)}
            href="/diputados"
            cta="Ver diputados"
          />
        </div>

      </div>
    </section>
  )
}
