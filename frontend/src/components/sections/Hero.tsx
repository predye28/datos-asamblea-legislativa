import styles from './Hero.module.css'

function IconBuilding() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="21" y="1" width="2" height="5" rx="1" fill="rgba(255,255,255,0.85)" />
      <path d="M23 1.5 L30 4 L23 6Z" fill="rgba(255,255,255,0.6)" />
      <path d="M10 19 C10 11.5 15 6 22 6 C29 6 34 11.5 34 19Z" fill="rgba(255,255,255,0.95)" />
      <rect x="7" y="19" width="30" height="3" rx="0.5" fill="rgba(255,255,255,0.9)" />
      <rect x="10" y="22" width="3.5" height="12" rx="0.5" fill="rgba(255,255,255,0.82)" />
      <rect x="17" y="22" width="3.5" height="12" rx="0.5" fill="rgba(255,255,255,0.82)" />
      <rect x="23.5" y="22" width="3.5" height="12" rx="0.5" fill="rgba(255,255,255,0.82)" />
      <rect x="30.5" y="22" width="3.5" height="12" rx="0.5" fill="rgba(255,255,255,0.82)" />
      <rect x="5" y="34" width="34" height="3" rx="0.5" fill="rgba(255,255,255,0.88)" />
      <rect x="2" y="37" width="40" height="3.5" rx="1" fill="rgba(255,255,255,0.92)" />
    </svg>
  )
}

export default function Hero() {
  return (
    <section className={styles.hero}>
      {/* Decorative corner circles — like Ruby */}
      <div className={styles.decTopLeft}  aria-hidden />
      <div className={styles.decTopRight} aria-hidden />
      <div className={styles.decBotLeft}  aria-hidden />

      {/* Warm radial glow behind center */}
      <div className={styles.centerGlow} aria-hidden />

      <div className={styles.container}>

        <div className={styles.badgeWrapper}>
          <div className={styles.ambientGlow} aria-hidden />
          <div className={styles.badge}>
            <IconBuilding />
          </div>
        </div>

        <h1 className={styles.title}>
          La <span className={styles.accent}>Asamblea</span> al Día
        </h1>

        <p className={styles.description}>
          Plataforma independiente para dar seguimiento a la actividad legislativa
          de Costa Rica. Proyectos de ley, diputados y estadísticas del SIL, en un solo lugar.
        </p>

        <div className={styles.divider} />

      </div>
    </section>
  )
}
