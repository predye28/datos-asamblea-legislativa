import styles from './LoadingIndicator.module.css'

interface Props {
  text?: string
  fillSpace?: boolean
  small?: boolean
}

export default function LoadingIndicator({ text, fillSpace = false, small = false }: Props) {
  return (
    <div className={`${small ? styles.wrapperSmall : styles.wrapper} ${fillSpace ? styles.fillSpace : ''}`}>
      <div className={styles.spinner}>
        <div className={`${styles.dot} ${small ? styles.dotSmall : ''}`}></div>
        <div className={`${styles.dot} ${small ? styles.dotSmall : ''}`}></div>
        <div className={`${styles.dot} ${small ? styles.dotSmall : ''}`}></div>
      </div>
      {text && <div className={styles.text}>{text}</div>}
    </div>
  )
}
