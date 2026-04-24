import styles from './perfil.module.css'

export default function Loading() {
  return (
    <div className={styles.page} aria-busy="true" aria-live="polite">
      <div className={styles.backBar}>
        <span className={styles.backBtn}>← Volver a diputados</span>
      </div>
      <section className={styles.hero}>
        <div className={styles.heroDots} aria-hidden />
        <div className={styles.heroInner}>
          <div className={styles.avatar} aria-hidden>·</div>
          <div className={styles.heroText}>
            <span className={styles.heroEyebrow}>Perfil legislativo</span>
            <h1 className={styles.heroName}>Cargando…</h1>
          </div>
        </div>
      </section>
    </div>
  )
}
