import { etiquetaEstado } from '@/lib/estados'
import styles from './EstadoChip.module.css'

interface Props {
  estadoActual: string | null
  esLey: boolean
  numeroLey?: string | null
  size?: 'sm' | 'md'
}

export function EstadoChip({ estadoActual, esLey, numeroLey, size = 'md' }: Props) {
  const info = etiquetaEstado(estadoActual, esLey, numeroLey)
  return (
    <span
      className={`${styles.chip} ${styles[`chip_${info.grupo}`]} ${size === 'sm' ? styles.sm : ''}`}
      title={info.textoCompleto}
    >
      <span className={styles.dot} aria-hidden />
      {info.etiqueta}
    </span>
  )
}
