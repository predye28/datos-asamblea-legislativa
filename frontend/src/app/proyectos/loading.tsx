import styles from './proyectos.module.css'

export default function Loading() {
  return (
    <div className={styles.page} aria-busy="true" aria-live="polite">
      <section className={styles.hero}>
        <div className={styles.heroDots} aria-hidden />
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <span className={styles.heroEyebrow}>Base de datos legislativa</span>
            <h1 className={styles.heroTitle}>Proyectos de Ley</h1>
            <p className={styles.heroDesc}>Cargando…</p>
          </div>
        </div>
      </section>
      <div className={styles.main}>
        <div className={styles.container}>
          <div className={styles.list}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={styles.skeleton}>
                <div className={`${styles.skLine} ${styles.skShort}`} />
                <div className={`${styles.skLine} ${styles.skLong}`} />
                <div className={`${styles.skLine} ${styles.skMid}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
