'use client'

import { useEffect, useState, useCallback, useRef, CSSProperties } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { MetricasResponse } from '@/lib/api'
import styles from './FeatureBlocks.module.css'

// ── Types ───────────────────────────────────────────────────────────────

type Slide = {
  kicker: string
  big: string
  label: string
  sub?: string
}

// ── Current legislative period helper ───────────────────────────────────

function currentPeriod(): string {
  const d = new Date()
  let start = d.getFullYear()
  while ((start % 4) !== 2) start--
  if (d.getFullYear() === start && d.getMonth() < 4) start -= 4
  return `${start}–${start + 4}`
}

// ── Slide data builders ─────────────────────────────────────────────────

function proyectosSlides(data: MetricasResponse): Slide[] {
  const g = data.general
  const periodo = currentPeriod()
  return [
    {
      kicker: 'EN TOTAL',
      big: g.total_proyectos.toLocaleString('es-CR'),
      label: 'proyectos registrados',
      sub: 'Desde 1949 hasta hoy',
    },
    {
      kicker: 'ESTE MES',
      big: String(g.proyectos_este_mes),
      label: 'nuevos proyectos presentados',
      sub: 'El congreso sesiona todo el año',
    },
    {
      kicker: 'ESTE AÑO',
      big: String(g.proyectos_este_anio),
      label: `proyectos en ${new Date().getFullYear()}`,
      sub: 'Ingresados desde enero',
    },
    {
      kicker: `PERÍODO ${periodo}`,
      big: `${Math.round(g.tasa_aprobacion_pct)}%`,
      label: 'de los proyectos se convierten en ley',
      sub: 'Solo 1 de cada 7 lo logra',
    },
  ]
}

function estadisticasSlides(data: MetricasResponse): Slide[] {
  const g = data.general
  const top = data.por_categoria[0]
  const años = g.promedio_dias_aprobacion / 365
  const añosStr = años >= 2 ? `${Math.round(años)} años` : `${años.toFixed(1)} años`
  return [
    {
      kicker: 'TASA HISTÓRICA',
      big: `${Math.round(g.tasa_aprobacion_pct)}%`,
      label: 'de aprobación en la Asamblea',
      sub: '1 de cada 7 proyectos lo logra',
    },
    {
      kicker: 'TIEMPO PROMEDIO',
      big: añosStr,
      label: 'tarda una ley en aprobarse',
      sub: 'Más que un ciclo legislativo completo',
    },
    {
      kicker: 'LEYES VIGENTES',
      big: g.total_leyes_aprobadas.toLocaleString('es-CR'),
      label: 'aprobadas hasta hoy',
      sub: 'Cada una rige la vida del país',
    },
    ...(top ? [{
      kicker: 'TEMA #1',
      big: top.total.toLocaleString('es-CR'),
      label: `proyectos sobre ${top.categoria}`,
      sub: 'El área más legislada de la historia',
    }] : []),
  ]
}

function diputadosSlides(data: MetricasResponse): Slide[] {
  const g = data.general
  const periodo = currentPeriod()
  const top = data.top_diputados[0]
  const eficaz = data.top_diputados_eficacia?.[0]
  const slides: Slide[] = [
    {
      kicker: 'EN EJERCICIO',
      big: String(g.total_diputados_activos),
      label: 'diputados activos',
      sub: 'Elegidos por 4 años para representarte',
    },
  ]
  if (top) {
    slides.push({
      kicker: 'MÁS ACTIVO',
      big: String(top.total_proyectos),
      label: `proyectos de ${top.apellidos}`,
      sub: `Período ${periodo}`,
    })
  }
  if (eficaz) {
    slides.push({
      kicker: 'MEJOR EFICACIA',
      big: `${Math.round(eficaz.tasa_aprobacion)}%`,
      label: `tasa de aprobación de ${eficaz.apellidos}`,
      sub: `Período ${periodo}`,
    })
    slides.push({
      kicker: 'LEYES APROBADAS',
      big: String(eficaz.leyes_aprobadas),
      label: `leyes de ${eficaz.apellidos}`,
      sub: `Período ${periodo}`,
    })
  }
  return slides
}

// ── Placeholder slides while loading ────────────────────────────────────

const PLACEHOLDER: Slide[] = [
  { kicker: 'CARGANDO', big: '—', label: 'obteniendo datos en tiempo real…' },
]

// ── SlideShow component ──────────────────────────────────────────────────

interface SlideShowProps {
  slides: Slide[]
  accentColor: string
}

function SlideShow({ slides, accentColor }: SlideShowProps) {
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<'enter' | 'exit'>('enter')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setPhase('exit'), 3600)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [idx, slides])

  const onAnimEnd = useCallback(() => {
    if (phase === 'exit') {
      setIdx(i => (i + 1) % slides.length)
      setPhase('enter')
    }
  }, [phase, slides.length])

  const goTo = useCallback((i: number) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setIdx(i)
    setPhase('enter')
  }, [])

  const slide = slides[idx] ?? slides[0]

  return (
    <div className={styles.slideArea}>
      <div
        key={`${idx}-${phase}`}
        className={`${styles.slide} ${phase === 'exit' ? styles.slideExit : styles.slideEnter}`}
        onAnimationEnd={onAnimEnd}
      >
        <div
          className={styles.slideKicker}
          style={{ color: accentColor } as CSSProperties}
        >
          {slide.kicker}
        </div>
        <div
          className={styles.slideBig}
          style={{
            color: accentColor,
            textShadow: `0 0 48px ${accentColor}40`,
          } as CSSProperties}
        >
          {slide.big}
        </div>
        <div className={styles.slideSeparator} />
        <div className={styles.slideLabel}>{slide.label}</div>
        {slide.sub && <div className={styles.slideSub}>{slide.sub}</div>}
      </div>

      <div className={styles.dots}>
        {slides.map((_, i) => (
          <button
            key={i}
            className={`${styles.dot} ${i === idx ? styles.dotActive : ''}`}
            style={i === idx ? { background: accentColor } as CSSProperties : undefined}
            onClick={() => goTo(i)}
            aria-label={`Ir a slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

// ── Card ─────────────────────────────────────────────────────────────────

interface CardProps {
  title: string
  accent: string
  slides: Slide[]
  href: string
  cta: string
  num: string
}

function Card({ title, accent, slides, href, cta, num }: CardProps) {
  return (
    <div
      className={styles.card}
      style={{ '--card-accent': accent } as CSSProperties}
    >
      <div className={styles.accentStrip} />
      <div
        className={styles.cardGlow}
        style={{ background: `linear-gradient(180deg, ${accent}18 0%, transparent 100%)` }}
      />
      <div className={styles.inner}>

        <div className={styles.cardTop}>
          <h2 className={styles.cardTitle} style={{ color: accent }}>{title}</h2>
          <span className={styles.cardNum}>{num}</span>
        </div>
        <div className={styles.cardDivider} />

        <SlideShow slides={slides} accentColor={accent} />

        <div className={styles.cardFooter}>
          <Link href={href} className={styles.cta}>
            {cta}
            <span className={styles.arrow}>→</span>
          </Link>
        </div>

      </div>
    </div>
  )
}

// ── Main export ──────────────────────────────────────────────────────────

export default function FeatureBlocks() {
  const [data, setData] = useState<MetricasResponse | null>(null)

  useEffect(() => {
    api.metricas.general().then(setData).catch(() => {})
  }, [])

  return (
    <section className={styles.section}>
      <div className={styles.decLeft} aria-hidden />
      <div className={styles.container}>

        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionEyebrow}>Explorá la Asamblea</h2>
        </div>

        <div className={styles.grid}>
          <Card
            title="Proyectos"
            accent="#0EA5E9"
            slides={data ? proyectosSlides(data) : PLACEHOLDER}
            href="/proyectos"
            cta="Explorar proyectos"
            num="01"
          />
          <Card
            title="Estadísticas"
            accent="#F59E0B"
            slides={data ? estadisticasSlides(data) : PLACEHOLDER}
            href="/estadisticas"
            cta="Ver estadísticas"
            num="02"
          />
          <Card
            title="Diputados"
            accent="#6366F1"
            slides={data ? diputadosSlides(data) : PLACEHOLDER}
            href="/diputados"
            cta="Ver diputados"
            num="03"
          />
        </div>

      </div>
    </section>
  )
}
