'use client'

import { useRef, useEffect, useState } from 'react'
import styles from './AboutSection.module.css'

const PILLARS = [
  {
    heading: 'Transparencia',
    subtitle: 'Los datos públicos, en un formato que cualquiera entiende.',
    body: 'La Asamblea Legislativa publica toda su actividad en el Sistema de Información Legislativa (SIL). Nosotros tomamos esos datos y los convertimos en una experiencia visual, clara y navegable para cualquier ciudadano.',
  },
  {
    heading: 'Independencia',
    subtitle: 'Sin agenda política. Sin intereses comerciales. Solo datos.',
    body: 'No apoyamos ni criticamos a ningún partido ni diputado. Presentamos la información tal como la Asamblea la publica. No somos voceros de nadie. El análisis y las conclusiones son únicamente tuyas.',
  },
  {
    heading: 'Participación',
    subtitle: 'Una ciudadanía informada es una ciudadanía activa.',
    body: 'Al simplificar el acceso a los proyectos de ley y los perfiles de los diputados, damos herramientas para que cada costarricense pueda conocer a sus representantes, dar seguimiento a lo que se vota y exigir cuentas.',
  },
  {
    heading: 'Accesible',
    subtitle: 'Diseñado para cualquier persona, no solo para expertos.',
    body: 'Transformamos datos técnicos y lenguaje jurídico en información comprensible. No hace falta ser abogado ni politólogo para entender qué está pasando en la Asamblea. Está hecho para vos.',
  },
]

const PRINCIPLES = [
  {
    label: 'Datos oficiales del SIL',
    quote: 'Toda la información proviene directamente del Sistema de Información Legislativa de la Asamblea Legislativa de Costa Rica — el sistema oficial de acceso público.',
  },
  {
    label: 'Sin editoriales',
    quote: 'Mostramos los datos tal como la Asamblea los publica. No editamos, no interpretamos, no opinamos. Vos sacás tus propias conclusiones.',
  },
  {
    label: 'Código abierto',
    quote: 'El scraper, la API y este portal están disponibles públicamente. Cualquiera puede revisar cómo funciona, mejorarlo o construir sobre él.',
  },
  {
    label: 'Sin fines de lucro',
    quote: 'Este proyecto no tiene intereses económicos ni comerciales. Es un aporte ciudadano al acceso a la información pública de Costa Rica.',
  },
]

export default function AboutSection() {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.06 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <section
      ref={ref}
      className={`${styles.section} ${visible ? styles.visible : ''}`}
    >
      <div className={styles.container}>

        <header className={styles.header}>
          <h2 className={styles.title}>¿Qué es La Asamblea al Día?</h2>
          <p className={styles.subtitle}>
            ¿Por qué existe esta plataforma? ¿Qué la hace <strong>diferente</strong>?
          </p>
        </header>

        <div className={styles.pillarsGrid}>
          {PILLARS.map((p) => (
            <div key={p.heading} className={styles.pillar}>
              <h3 className={styles.pillarHeading}>{p.heading}</h3>
              <p className={styles.pillarSubtitle}>{p.subtitle}</p>
              <p className={styles.pillarBody}>{p.body}</p>
            </div>
          ))}
        </div>

        <div className={styles.principlesGrid}>
          {PRINCIPLES.map((pr) => (
            <div key={pr.label} className={styles.principle}>
              <div className={styles.principleTop}>
                <span className={styles.quoteChar}>&ldquo;</span>
                <span className={styles.principleTitle}>{pr.label}</span>
              </div>
              <p className={styles.quoteText}>{pr.quote}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
