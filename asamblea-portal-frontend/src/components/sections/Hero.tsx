// src/components/sections/Hero.tsx
import styles from './Hero.module.css'

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.animationWrapper}>
        <div className={styles.hub}>
          <div className={styles.particles}>
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className={styles.particle} />
            ))}
          </div>
          
          <div className={styles.badge}>
            <div className={styles.badgeLabel}>Plataforma Ciudadana</div>
            <h1 className={styles.title}>LA ASAMBLEA<br /><span>AL DÍA</span></h1>
            <div className={styles.version}>Costa Rica · Datos en tiempo real</div>
          </div>
        </div>
      </div>
    </section>
  )
}
