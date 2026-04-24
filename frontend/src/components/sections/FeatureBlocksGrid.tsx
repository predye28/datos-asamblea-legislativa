'use client'

import { useEffect, useRef, useState, CSSProperties, ReactNode } from 'react'
import Link from 'next/link'
import styles from './FeatureBlocks.module.css'

export type DataItem = { value: string; label: ReactNode }

interface CardProps {
  index: number
  accent: string
  title: string
  promise: string
  data: DataItem[]
  href: string
  cta: string
}

function Card({ index, accent, title, promise, data, href, cta }: CardProps) {
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
  cards: Array<Omit<CardProps, 'index'>>
}

export default function FeatureBlocksGrid({ cards }: Props) {
  // Must start as `false` on both server and client to avoid hydration mismatch.
  const [inView, setInView] = useState(false)
  const gridRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = gridRef.current
    if (!el) return

    // Fallback for environments without IntersectionObserver.
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

  return (
    <div
      ref={gridRef}
      className={`${styles.grid} ${inView ? styles.inView : ''}`}
    >
      {cards.map((card, i) => (
        <Card key={card.href} index={i} {...card} />
      ))}
    </div>
  )
}
