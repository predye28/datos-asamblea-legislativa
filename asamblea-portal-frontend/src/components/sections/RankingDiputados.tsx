// src/components/sections/RankingDiputados.tsx
import Link from 'next/link'
import type { DiputadoRanking } from '@/lib/api'
import styles from './RankingDiputados.module.css'

interface Props { diputados: DiputadoRanking[] }

export default function RankingDiputados({ diputados }: Props) {
  return (
    <div className={styles.block}>
      <div className={styles.header}>
        <div className={styles.title}>¿Quién propone más leyes?</div>
        <div className={styles.sub}>
          Actividad legislativa por cantidad de proyectos — no mide calidad ni aprobación
        </div>
      </div>
      <div className={styles.list}>
        {diputados.map((d, i) => (
          <Link
            key={`${d.apellidos}-${d.nombre}`}
            href={`/diputados?q=${encodeURIComponent(d.apellidos)}`}
            className={styles.item}
          >
            <span className={`${styles.num} ${i < 3 ? styles.numAccent : ''}`}>
              {i + 1}
            </span>
            <div className={styles.name}>
              <strong>{d.nombre_completo}</strong>
            </div>
            <span className={styles.badge}>{d.total_proyectos} proyectos</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
