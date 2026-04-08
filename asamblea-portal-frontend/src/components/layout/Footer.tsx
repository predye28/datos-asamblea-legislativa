// src/components/layout/Footer.tsx
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <span className={styles.logo}>La Asamblea al Día</span>
          <span className={styles.separator}>·</span>
          <p className={styles.tagline}>
            Portal ciudadano independiente. Datos del SIL de la Asamblea Legislativa de Costa Rica.
          </p>
        </div>
        <div className={styles.right}>
          <a
            href="https://www.asamblea.go.cr"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.sourceLink}
          >
            Fuente oficial →
          </a>
          <span className={styles.divider}>|</span>
          <span className={styles.sourceLink}>Actualizado diariamente</span>
        </div>
      </div>
      <div className={styles.bottom}>
        <span>Código abierto · Sin fines políticos · Solo informar.</span>
        <span>Datos © Asamblea Legislativa de Costa Rica</span>
      </div>
    </footer>
  )
}

