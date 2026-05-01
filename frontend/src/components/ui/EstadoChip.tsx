'use client'

import { etiquetaEstado, renderEtiquetaEstado } from '@/lib/estados'
import { useT } from '@/i18n/LanguageProvider'
import styles from './EstadoChip.module.css'

interface Props {
  estadoActual: string | null
  esLey: boolean
  numeroLey?: string | null
  estadoGrupo?: string | null
  size?: 'sm' | 'md'
}

export function EstadoChip({ estadoActual, esLey, numeroLey, estadoGrupo, size = 'md' }: Props) {
  const { dict } = useT()
  const info = etiquetaEstado(estadoActual, esLey, numeroLey, estadoGrupo)
  return (
    <span
      className={`${styles.chip} ${styles[`chip_${info.grupo}`]} ${size === 'sm' ? styles.sm : ''}`}
      title={info.textoCompleto}
    >
      <span className={styles.dot} aria-hidden />
      {renderEtiquetaEstado(info.etiquetaKey, dict)}
    </span>
  )
}
