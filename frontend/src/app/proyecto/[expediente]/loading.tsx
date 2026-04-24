import styles from './detalle.module.css'

export default function Loading() {
  return (
    <div className={styles.page} aria-busy="true" aria-live="polite">
      <div className={styles.backBar}>
        <div className={styles.container}>
          <span className={styles.backLink}>← Volver a proyectos</span>
        </div>
      </div>
      <header className={styles.header}>
        <div className={styles.headerDots} aria-hidden />
        <div className={styles.container}>
          <div className={styles.headerMeta}>
            <span className={styles.expNum}>Cargando expediente…</span>
          </div>
          <h1 className={styles.headerTitle}>&nbsp;</h1>
        </div>
      </header>
      <div className={styles.body}>
        <div className={styles.container}>
          <div className={styles.layout}>
            <main>
              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Detalles del expediente</h2>
                <p style={{ color: 'var(--ink-faint)' }}>Cargando…</p>
              </section>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
