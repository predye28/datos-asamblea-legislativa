import type { CSSProperties } from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  variant?: 'line' | 'circle' | 'block';
  width?: string | number;
  height?: string | number;
  style?: CSSProperties;
  className?: string;
}

export function Skeleton({
  variant = 'line',
  width,
  height,
  style,
  className,
}: SkeletonProps) {
  const classes = [styles.base, styles[variant], className ?? '']
    .filter(Boolean)
    .join(' ');

  const inline: CSSProperties = {
    width: width ?? '100%',
    height: height ?? (variant === 'line' ? '1em' : '100%'),
    ...style,
  };

  return <span className={classes} style={inline} role="status" aria-label="Cargando" />;
}
