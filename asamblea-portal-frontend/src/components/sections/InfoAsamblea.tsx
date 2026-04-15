import styles from './InfoAsamblea.module.css'

export default function InfoAsamblea() {
  return (
    <div className={styles.wrapper}>
      <h2 className="section-title" style={{ marginTop: 80 }}>Lo que necesitas saber</h2>
      <div className={styles.box}>
        <div className={styles.header}>
          <div className={styles.title}>¿Cómo funciona la Asamblea Legislativa?</div>
        </div>

        <div className={styles.grid}>
          <div className={styles.col}>
            <div className={styles.number}>57</div>
            <div className={styles.text}>
              <strong>Diputados</strong> elegidos cada 4 años. Ellos son los únicos encargados de proponer, modificar, aprobar o archivar las leyes del país.
            </div>
          </div>

          <div className={styles.col}>
            <div className={styles.number}>2</div>
            <div className={styles.text}>
              <strong>Debates</strong>. Antes de convertirse en ley, todo proyecto de ley debe ser discutido en comisión y analizado y votado dos veces por el Plenario (los 57 diputados).
            </div>
          </div>

          <div className={styles.col}>
            <div className={styles.number}>4</div>
            <div className={styles.text}>
              <strong>Años</strong> es la vida máxima que tiene un proyecto de ley para ser aprobado. Si no se aprueba en ese tiempo, se archiva automáticamente ("vence").
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          Los datos mostrados en este portal son extraídos de manera automatizada del oficial <a href="http://www.sil.go.cr/" target="_blank" rel="noopener noreferrer">Sistema de Información Legislativa (SIL)</a> de la República de Costa Rica.
        </div>
      </div>
    </div>
  )
}
