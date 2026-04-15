// src/components/sections/Hero.tsx
import styles from './Hero.module.css'
import Link from 'next/link'

interface HeroAction {
  label: string;
  href: string;
  type?: 'primary' | 'secondary';
}

interface HeroProps {
  kicker: string;
  headline: React.ReactNode;
  deck: string;
  actions?: HeroAction[];
}

export default function Hero({ kicker, headline, deck, actions }: HeroProps) {
  const defaultActions: HeroAction[] = [
    { label: 'Explorar proyectos →', href: '/proyectos', type: 'primary' },
    { label: 'Ver estadísticas', href: '/estadisticas', type: 'secondary' }
  ];

  const renderActions = actions || defaultActions;
  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        <div className={styles.kicker}>{kicker}</div>
        <h1 className={styles.headline}>{headline}</h1>
        <p className={styles.deck}>{deck}</p>
        <div className={styles.actions}>
          {renderActions.map((action, i) => (
            <Link 
              key={i} 
              href={action.href} 
              className={action.type === 'secondary' ? styles.ctaSecondary : styles.ctaPrimary}
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
