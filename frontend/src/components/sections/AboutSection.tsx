'use client'

import { useEffect, useRef, useState } from 'react'
import { useT } from '@/i18n/LanguageProvider'
import styles from './AboutSection.module.css'

const WaveTop = () => (
  <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className={styles.wave}>
    <path d="M 0 60 C 280 -10, 720 80, 1080 30 C 1260 5, 1380 50, 1440 30 L 1440 80 L 0 80 Z" />
  </svg>
)

const WaveBottom = () => (
  <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className={styles.wave}>
    <path d="M 0 20 C 280 90, 720 0, 1080 50 C 1260 75, 1380 30, 1440 50 L 1440 0 L 0 0 Z" />
  </svg>
)

export default function AboutSection() {
  const { dict } = useT()
  const ref = useRef<HTMLElement | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          obs.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <section
      ref={ref}
      className={`${styles.section} ${inView ? styles.sectionIn : ''}`}
    >
      <WaveTop />

      <div className={styles.pillarsSection}>
        <div className={styles.container}>
          <header className={styles.header}>
            <h2 className={styles.title}>{dict.about.title}</h2>
            <p className={styles.subtitle}>
              {dict.about.subtitlePrefix} <strong>{dict.about.subtitleStrong}</strong>{dict.about.subtitleSuffix}
            </p>
          </header>

          <div className={styles.pillarsGrid}>
            {dict.about.pillars.map((p) => (
              <div key={p.heading} className={styles.pillar}>
                <h3 className={styles.pillarHeading}>{p.heading}</h3>
                <p className={styles.pillarSubtitle}>{p.subtitle}</p>
                <p className={styles.pillarBody}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <WaveBottom />

      <div className={styles.principlesSection}>
        <div className={styles.container}>
          <header className={styles.principlesHeader}>
            <span className={styles.principlesEyebrow}>{dict.about.principlesEyebrow}</span>
            <h2 className={styles.principlesTitle}>{dict.about.principlesTitle}</h2>
          </header>
          <div className={styles.principlesGrid}>
            {dict.about.principles.map((pr, i) => (
              <div
                key={pr.label}
                className={styles.principle}
                style={{ animationDelay: `${i * 110}ms` }}
              >
                <div className={styles.principleTop}>
                  <span className={styles.quoteChar}>&ldquo;</span>
                  <span className={styles.principleTitle}>{pr.label}</span>
                </div>
                <p className={styles.quoteText}>{pr.quote}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
