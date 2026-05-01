import styles from './perfil.module.css'

// Skeleton del perfil del diputado mientras se obtienen los datos.
// Replica la estructura real de PerfilClient para evitar saltos de
// layout cuando termina la carga.
export default function Loading() {
  return (
    <div className={styles.page} aria-busy="true" aria-live="polite">

      <div className={styles.backBar}>
        <span className={styles.backBtn}>← Volver a diputados</span>
      </div>

      <section className={styles.hero}>
        <div className={styles.heroDots} aria-hidden />
        <div className={styles.heroInner}>
          <div className={styles.skAvatar} aria-hidden />
          <div className={styles.heroText}>
            <span className={styles.skBadge} aria-hidden />
            <span className={`${styles.skLine} ${styles.skTitle}`} aria-hidden />
            <span className={`${styles.skLine} ${styles.skSubtitle}`} aria-hidden />
            <span className={styles.skLoadingHint}>
              <span className={styles.skLoadingDot} aria-hidden />
              Cargando perfil legislativo
            </span>
          </div>
        </div>
      </section>

      <div className={styles.container}>

        <div className={styles.statGrid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.statCard}>
              <span className={`${styles.skLine} ${styles.skStatLabel}`} aria-hidden />
              <span className={`${styles.skLine} ${styles.skStatNum}`} aria-hidden />
              <span className={`${styles.skLine} ${styles.skStatHelp}`} aria-hidden />
            </div>
          ))}
        </div>

        <section className={styles.section}>
          <span className={`${styles.skLine} ${styles.skSectionTitle}`} aria-hidden />
          <span className={`${styles.skLine} ${styles.skSectionDesc}`} aria-hidden />
          <div className={styles.skPeriodoBars}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={styles.skPeriodoRow}>
                <div className={styles.skPeriodoTop}>
                  <span className={styles.skLine} style={{ width: '120px' }} aria-hidden />
                  <span className={styles.skLine} style={{ width: '80px', height: 11 }} aria-hidden />
                </div>
                <span className={`${styles.skBlock} ${styles.skBar}`} aria-hidden />
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <span className={`${styles.skLine} ${styles.skSectionTitle}`} aria-hidden />
          <span className={`${styles.skLine} ${styles.skSectionDesc}`} aria-hidden />
          <div className={styles.temasGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.skTemaCard}>
                <span className={styles.skLine} style={{ width: '70%' }} aria-hidden />
                <span className={`${styles.skBlock}`} style={{ height: 4, width: '100%' }} aria-hidden />
                <span className={styles.skLine} style={{ width: '40%', height: 10 }} aria-hidden />
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <span className={`${styles.skLine} ${styles.skSectionTitle}`} aria-hidden />
          <span className={`${styles.skLine} ${styles.skSectionDesc}`} aria-hidden />
          <div className={styles.proyectosList}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={styles.skProyectoCard}>
                <span className={styles.skLine} style={{ width: '120px', height: 10 }} aria-hidden />
                <span className={styles.skLine} style={{ width: '90%', height: 16 }} aria-hidden />
                <span className={styles.skLine} style={{ width: '40%', height: 11 }} aria-hidden />
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}
