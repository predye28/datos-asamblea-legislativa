// src/components/layout/Footer.tsx
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <span className={styles.logo}>La Asamblea en Números</span>
          <p className={styles.tagline}>
            Portal ciudadano independiente. Los datos son oficiales y provienen
            del Sistema de Información Legislativa (SIL) de la Asamblea
            Legislativa de Costa Rica.
          </p>
        </div>
        <div className={styles.right}>
          <div className={styles.label}>Fuente de datos</div>
          <a
            href="https://www.asamblea.go.cr"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.sourceLink}
          >
            Asamblea Legislativa CR →
          </a>
          <div className={styles.label} style={{ marginTop: 16 }}>Actualización</div>
          <span className={styles.sourceLink}>Diariamente, 2am hora CR</span>
        </div>
      </div>
      <div className={styles.bottom}>
        <span>Este portal es de código abierto, independiente y sin fines políticos. Solo informar.</span>
        <span>Datos © Asamblea Legislativa de Costa Rica</span>
      </div>
    </footer>
  )
}
