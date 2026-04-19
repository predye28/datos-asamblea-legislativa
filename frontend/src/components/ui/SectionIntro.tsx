import type { ReactNode } from 'react';
import styles from './SectionIntro.module.css';

interface SectionIntroProps {
  kicker?: string;
  title: string;
  deck?: ReactNode;
  center?: boolean;
  as?: 'h1' | 'h2' | 'h3';
}

export function SectionIntro({
  kicker,
  title,
  deck,
  center = false,
  as: Tag = 'h2',
}: SectionIntroProps) {
  return (
    <header className={`${styles.intro} ${center ? styles.center : ''}`}>
      {kicker && <span className={styles.kicker}>{kicker}</span>}
      <Tag className={styles.title}>{title}</Tag>
      {deck && <p className={styles.deck}>{deck}</p>}
    </header>
  );
}
