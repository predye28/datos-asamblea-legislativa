import styles from './LoadingIndicator.module.css'

interface Props {
  text?: string
  fillSpace?: boolean
}

export default function LoadingIndicator({ text = 'Consultando base de datos...', fillSpace = false }: Props) {
  return (
    <div className={`${styles.wrapper} ${fillSpace ? styles.fillSpace : ''}`}>
      <div className={styles.spinner}>
        <div className={styles.dot}></div>
        <div className={styles.dot}></div>
        <div className={styles.dot}></div>
      </div>
      {text && <div className={styles.text}>{text}</div>}
    </div>
  )
}
