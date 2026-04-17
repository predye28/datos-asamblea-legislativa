// src/components/sections/TryAsambleaBlocks.tsx
import Link from 'next/link'
import styles from './TryAsambleaBlocks.module.css'

const features = [
  {
    title: 'EXPEDIENTES',
    label: 'El pulso de la ley',
    description: 'Seguimiento en tiempo real de cada proyecto. Buscador avanzado por tema, diputado y estado de trámite.',
    highlight: '5,000+ Proyectos',
    href: '/proyectos',
    cta: 'EXPLORAR LEYES',
    accent: '#D30001'
  },
  {
    title: 'DIPUTADOS',
    label: 'Representación directa',
    description: 'Analiza el desempeño de los 57 diputados. Consulta sus iniciativas, asistencias y perfiles oficiales.',
    highlight: '57 Representantes',
    href: '/diputados',
    cta: 'VER PERFILES',
    accent: '#3B82F6'
  },
  {
    title: 'DATOS',
    label: 'Inteligencia legislativa',
    description: 'La eficiencia del congreso en gráficos claros. Estadísticas de aprobación y éxito por categoría temática.',
    highlight: '100% Datos Abiertos',
    href: '/estadisticas',
    cta: 'ANALIZAR MÉTRICAS',
    accent: '#FFDA6B'
  }
]

export default function TryAsambleaBlocks() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.grid}>
          {features.map((f, i) => (
            <div key={i} className={styles.card} style={{ '--badge-color': f.accent } as any}>
              <div className={styles.cardInner}>
                <div className={styles.header}>
                  <div className={styles.titleGroup}>
                    <span className={styles.kicker}>{f.title}</span>
                    <h3 className={styles.cardTitle}>{f.label}</h3>
                  </div>
                </div>
                
                <div className={styles.content}>
                  <div className={styles.highlightBadge}>{f.highlight}</div>
                  <p className={styles.description}>{f.description}</p>
                </div>

                <div className={styles.footer}>
                  <Link href={f.href} className={styles.btn}>
                    {f.cta} <span className={styles.arrow}>→</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
