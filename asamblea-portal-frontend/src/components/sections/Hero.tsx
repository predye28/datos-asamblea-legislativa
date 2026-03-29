// src/components/sections/Hero.tsx
import styles from './Hero.module.css'

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        <div className={styles.kicker}>¿Para qué sirve esto?</div>
        <h1 className={styles.headline}>
          Los datos de la Asamblea Legislativa,<br />
          traducidos para todos los costarricenses
        </h1>
        <p className={styles.deck}>
          La Asamblea publica su información, pero de una forma que pocos entienden.
          Este portal toma esos mismos datos oficiales y los convierte en algo que
          cualquier ciudadano puede leer, comparar y cuestionar.
          Porque la transparencia solo funciona si se entiende.
        </p>
      </div>
    </section>
  )
}
