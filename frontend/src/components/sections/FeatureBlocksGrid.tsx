'use client'

import { useEffect, useMemo, useRef, useState, CSSProperties, ReactNode } from 'react'
import Link from 'next/link'
import { useT } from '@/i18n/LanguageProvider'
import styles from './FeatureBlocks.module.css'

type ProyectosData = {
  registrados: number | null
  esteAnio: number | null
  aprobacion: number | null
}

type DiputadosData = {
  historicos: number | null
  topActivoCount: number | null
  topActivoNombre: string | null
  topEficaciaPct: number | null
  topEficaciaNombre: string | null
}

type EstadisticasData = {
  nuncaLey: number | null
  tramites: number | null
  ultimoMesTotal: number | null
  ultimoMesNombre: string | null
  ultimoMesAnio: number | null
}

export type CardPayload =
  | { id: 'proyectos'; accent: string; href: string; data: ProyectosData }
  | { id: 'diputados'; accent: string; href: string; data: DiputadosData }
  | { id: 'estadisticas'; accent: string; href: string; data: EstadisticasData }

type DataItem = { value: string; label: ReactNode }

function fmt(n: number | null, locale: string): string {
  return n == null ? '—' : n.toLocaleString(locale)
}

function Card({
  index,
  accent,
  title,
  promise,
  data,
  href,
  cta,
}: {
  index: number
  accent: string
  title: string
  promise: string
  data: DataItem[]
  href: string
  cta: string
}) {
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

interface Props {
  cards: CardPayload[]
}

export default function FeatureBlocksGrid({ cards }: Props) {
  const { dict } = useT()
  const locale = dict.common.locale

  const [inView, setInView] = useState(false)
  const gridRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = gridRef.current
    if (!el) return

    if (typeof IntersectionObserver === 'undefined') {
      queueMicrotask(() => setInView(true))
      return
    }

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

  const resolved = useMemo(() => {
    return cards.map((card) => {
      if (card.id === 'proyectos') {
        const t = dict.featureBlocks.proyectos
        const items: DataItem[] = [
          { value: fmt(card.data.registrados, locale), label: t.labelRegistrados },
          { value: fmt(card.data.esteAnio, locale), label: t.labelEsteAnio },
          {
            value: card.data.aprobacion == null ? '—' : `${card.data.aprobacion}%`,
            label: t.labelAprobacion,
          },
        ]
        return { ...card, title: t.title, promise: t.promise, cta: t.cta, items }
      }

      if (card.id === 'diputados') {
        const t = dict.featureBlocks.diputados
        const { topActivoCount, topActivoNombre, topEficaciaPct, topEficaciaNombre } = card.data
        const items: DataItem[] = [
          { value: fmt(card.data.historicos, locale), label: t.labelHistoricos },
          {
            value: topActivoCount == null ? '—' : String(topActivoCount),
            label: topActivoNombre
              ? <span>{t.labelMasActivoPrefix} (<strong>{topActivoNombre}</strong>)</span>
              : t.labelMasActivoFallback,
          },
          {
            value: topEficaciaPct == null ? '—' : `${topEficaciaPct}%`,
            label: topEficaciaNombre
              ? <span>{t.labelEficaciaPrefix} (<strong>{topEficaciaNombre}</strong>)</span>
              : t.labelEficaciaFallback,
          },
        ]
        return { ...card, title: t.title, promise: t.promise, cta: t.cta, items }
      }

      // estadisticas
      const t = dict.featureBlocks.estadisticas
      const { nuncaLey, tramites, ultimoMesTotal, ultimoMesNombre, ultimoMesAnio } = card.data
      const items: DataItem[] = [
        {
          value: nuncaLey == null ? '—' : `${nuncaLey}%`,
          label: t.labelNuncaLey,
        },
        {
          value: tramites == null ? '—' : String(tramites),
          label: t.labelTramites,
        },
        {
          value: ultimoMesTotal == null ? '—' : String(ultimoMesTotal),
          label: ultimoMesNombre && ultimoMesAnio
            ? <span>{t.labelEsteMesPrefix} <strong>{ultimoMesNombre} {ultimoMesAnio}</strong></span>
            : t.labelEsteMesFallback,
        },
      ]
      return { ...card, title: t.title, promise: t.promise, cta: t.cta, items }
    })
  }, [cards, dict, locale])

  return (
    <>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionEyebrow}>{dict.featureBlocks.sectionEyebrow}</h2>
      </div>
      <div
        ref={gridRef}
        className={`${styles.grid} ${inView ? styles.inView : ''}`}
      >
        {resolved.map((card, i) => (
          <Card
            key={card.href}
            index={i}
            accent={card.accent}
            title={card.title}
            promise={card.promise}
            data={card.items}
            href={card.href}
            cta={card.cta}
          />
        ))}
      </div>
    </>
  )
}
