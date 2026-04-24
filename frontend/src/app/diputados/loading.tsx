import styles from './diputados.module.css'

export default function Loading() {
  return (
    <div className={styles.page} aria-busy="true" aria-live="polite">
      <section className={styles.hero}>
        <div className={styles.heroDots} aria-hidden />
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <span className={styles.heroEyebrow}>Representantes del pueblo</span>
            <h1 className={styles.heroTitle}>Diputados</h1>
            <p className={styles.heroDesc}>Cargando…</p>
          </div>
        </div>
      </section>
      <div className={styles.main}>
        <div className={styles.container}>
          <div className={styles.list}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className={styles.skeleton}>
                <div className={styles.skBox} />
                <div className={styles.skBody}>
                  <div className={`${styles.skLine} ${styles.skName}`} />
                  <div className={`${styles.skLine} ${styles.skBar}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
