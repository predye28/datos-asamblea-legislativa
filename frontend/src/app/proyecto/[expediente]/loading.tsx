import styles from './detalle.module.css'

// Skeleton del detalle de proyecto mientras se obtienen los datos.
// Replica la estructura real de DetalleClient para que la transición
// se sienta fluida al terminar la carga.
export default function Loading() {
  return (
    <div className={styles.page} aria-busy="true" aria-live="polite">

      <div className={styles.backBar}>
        <div className={styles.container}>
          <span className={styles.backLink}>← Volver a proyectos</span>
        </div>
      </div>

      <header className={styles.header}>
        <div className={styles.headerDots} aria-hidden />
        <div className={styles.container}>
          <div className={styles.headerMeta}>
            <span className={styles.expNum}>Cargando expediente…</span>
            <span className={`${styles.skLine} ${styles.skBadge}`} aria-hidden />
            <span className={`${styles.skLine} ${styles.skBadge2}`} aria-hidden />
            <span className={`${styles.skLine} ${styles.skBadge3}`} aria-hidden />
          </div>
          <div className={styles.skTitleRow}>
            <span className={`${styles.skLine} ${styles.skTitleLine1}`} aria-hidden />
            <span className={`${styles.skLine} ${styles.skTitleLine2}`} aria-hidden />
          </div>
          <span className={styles.skLoadingHint}>
            <span className={styles.skLoadingDot} aria-hidden />
            Cargando información del proyecto
          </span>
        </div>
      </header>

      <div className={styles.body}>
        <div className={styles.container}>
          <div className={styles.layout}>

            <main className={styles.main}>

              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Detalles del expediente</h2>
                <div className={styles.metaGrid}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={styles.skMetaItem}>
                      <span className={styles.skLine} style={{ width: '50%', height: 10 }} aria-hidden />
                      <span className={styles.skLine} style={{ width: '75%', height: 16 }} aria-hidden />
                    </div>
                  ))}
                </div>
              </section>

              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Historial de tramitación</h2>
                <div className={styles.timeline}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className={`${styles.tramite} ${i === 0 ? styles.tramiteFirst : ''}`}>
                      <div className={styles.tramiteDot} />
                      <div className={styles.skTimelineItem}>
                        <span className={styles.skLine} style={{ width: '60%', height: 14 }} aria-hidden />
                        <span className={styles.skLine} style={{ width: '40%', height: 12 }} aria-hidden />
                        <span className={styles.skLine} style={{ width: '30%', height: 11 }} aria-hidden />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

            </main>

            <aside className={styles.sidebar}>
              <div className={styles.sideCard}>
                <h3 className={styles.sideTitle}>Proponentes</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className={styles.skSideRow}>
                      <span className={styles.skLine} style={{ width: '85%', height: 13 }} aria-hidden />
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.sideCard}>
                <h3 className={styles.sideTitle}>Temas</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className={styles.skLine}
                      style={{ width: `${60 + ((i * 17) % 50)}px`, height: 22, borderRadius: 11 }}
                      aria-hidden
                    />
                  ))}
                </div>
              </div>
            </aside>

          </div>
        </div>
      </div>
    </div>
  )
}
