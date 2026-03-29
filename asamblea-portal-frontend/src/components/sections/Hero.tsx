// src/components/sections/Hero.tsx
import styles from './Hero.module.css'

interface HeroProps {
  kicker: string;
  headline: React.ReactNode;
  deck: string;
}

export default function Hero({ kicker, headline, deck }: HeroProps) {
  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        <div className={styles.kicker}>{kicker}</div>
        <h1 className={styles.headline}>{headline}</h1>
        <p className={styles.deck}>{deck}</p>
      </div>
    </section>
  )
}
