// src/components/sections/ProximosVencer.tsx
import Link from 'next/link'
import type { ProximoVencer } from '@/lib/api'
import styles from './ProximosVencer.module.css'

interface Props { datos: ProximoVencer[] }

function urgencyColor(dias: number) {
  if (dias <= 30) return '#c0392b'
  if (dias <= 60) return '#e67e22'
  return 'var(--ink-muted)'
}

export default function ProximosVencer({ datos }: Props) {
  return (
    <div className={styles.block}>
      <div className={styles.kicker}>⚠ Proyectos en riesgo</div>
      <div className={styles.title}>Propuestas que vencen en los próximos 90 días</div>
      <p className={styles.explanation}>
        Cada proyecto de ley tiene 4 años de vida. Si no es votado en ese plazo, muere
        automáticamente y debe presentarse de nuevo desde cero.
      </p>
      <div className={styles.list}>
        {datos.map(p => (
          <Link
            key={p.numero_expediente}
            href={`/proyecto/${p.numero_expediente}`}
            className={styles.item}
          >
            <span
              className={styles.dias}
              style={{ background: urgencyColor(p.dias_restantes) }}
            >
              {p.dias_restantes}d
            </span>
            <div className={styles.info}>
              <span className={styles.expNum}>Exp. {p.numero_expediente}</span>
              <span className={styles.expTitle}>{p.titulo}</span>
            </div>
            <span className={styles.arrow}>→</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
