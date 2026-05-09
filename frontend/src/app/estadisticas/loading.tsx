import styles from './estadisticas.module.css'

export default function Loading() {
  return (
    <div className={styles.page} aria-busy="true" aria-live="polite">
      <section className={styles.hero}>
        <div className={styles.heroDots} aria-hidden />
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <span className={styles.heroEyebrow}>Datos de la Asamblea</span>
            <h1 className={styles.heroTitle}>Estadísticas</h1>
            <p className={styles.heroDesc}>Cargando estadísticas…</p>
          </div>
        </div>
      </section>

      <div className={styles.filtersBar}>
        <div className={styles.filtersInner}>
          <div className={styles.skLine} style={{ width: '120px', height: '24px' }} />
        </div>
      </div>
      <div className={styles.main}>
        <div className={styles.container}>
          <div className={styles.skKpiGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.skKpi}>
                <div className={`${styles.skLine} ${styles.skShort}`} />
                <div className={`${styles.skLine} ${styles.skBig}`} />
                <div className={`${styles.skLine} ${styles.skMid}`} />
              </div>
            ))}
          </div>
          <div className={styles.skPanel}>
            {Array.from({ length: 8 }).map((_, j) => (
              <div key={j} className={styles.skLine} style={{ width: `${90 - j * 6}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
