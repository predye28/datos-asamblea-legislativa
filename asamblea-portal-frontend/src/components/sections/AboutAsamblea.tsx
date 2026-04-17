// src/components/sections/AboutAsamblea.tsx
import styles from './AboutAsamblea.module.css'

export default function AboutAsamblea() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.wrapper}>
          <h2 className={styles.title}>¿Qué es La Asamblea al día?</h2>
          
          <div className={styles.grid}>
            <div className={styles.col}>
              <h3 className={styles.subtitle}>Un puente de información</h3>
              <p className={styles.description}>
                La Asamblea Legislativa de Costa Rica genera miles de documentos y datos diariamente. 
                <strong> La Asamblea al día</strong> captura esta información del Sistema de Información Legislativa (SIL) 
                y la transforma en una experiencia visual, estructurada y fácil de navegar para cualquier ciudadano.
              </p>
            </div>
            
            <div className={styles.col}>
              <h3 className={styles.subtitle}>Independencia y Compromiso</h3>
              <p className={styles.description}>
                Somos una plataforma independiente que cree en el poder de los <strong>datos abiertos</strong>. 
                Nuestro objetivo no es solo mostrar qué se vota, sino facilitar la comprensión del impacto real 
                que tienen las leyes en el desarrollo del país.
              </p>
            </div>

            <div className={styles.col}>
              <h3 className={styles.subtitle}>Participación Activa</h3>
              <p className={styles.description}>
                Creemos que una ciudadanía informada es una ciudadanía participativa. Al simplificar el acceso 
                a los perfiles de los diputados y el estado de los proyectos, eliminamos las barreras que 
                separan a la gente de sus representantes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
