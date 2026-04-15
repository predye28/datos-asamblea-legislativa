import Hero from '@/components/sections/Hero'
import styles from './acerca.module.css'

export default function AcercaPage() {
  return (
    <div>
      <Hero
        kicker="Sobre el proyecto"
        headline={<>Acercando la información legislativa<br />a la ciudadanía</>}
        deck="Somos un proyecto sin fines de lucro que complementa el esfuerzo de transparencia de la Asamblea Legislativa. Tomamos los datos que ellos publican en el Sistema de Información Legislativa (SIL) y los presentamos en un formato más visual y accesible para facilitar la consulta ciudadana."
      />

      <div className="container">
        <div className={styles.layout}>

          {/* Columna principal */}
          <div className={styles.main}>

            {/* Por qué existe */}
            <section className={styles.section}>
              <div className={styles.pullQuote}>
                "Queremos que la información pública que la Asamblea ya comparte sea aún más fácil de consultar para todos."
              </div>
              <p>
                La Asamblea Legislativa de Costa Rica publica de forma transparente toda su actividad
                a través del Sistema de Información Legislativa (SIL): expedientes, firmas de diputaciones,
                avance por comisiones y más. Es un esfuerzo valioso de transparencia institucional.
              </p>
              <p>
                Nuestro proyecto nació para complementar ese esfuerzo. Tomamos esos mismos datos públicos
                y los organizamos de manera visual e intuitiva, para que cualquier persona —sin importar
                su formación— pueda consultar y entender el trabajo legislativo del país con facilidad.
              </p>
            </section>

            {/* Propósito */}
            <section className={styles.section}>
              <h2 className={styles.h2}>Nuestro compromiso: informar con respeto</h2>
              <p>
                Esta plataforma no tiene agenda política. No apoya ni critica a ningún partido,
                diputado ni proyecto en particular. Reconocemos y valoramos el trabajo que realiza
                la Asamblea Legislativa y su compromiso con la transparencia.
              </p>
              <p>
                Nuestro único objetivo es que más personas puedan consultar y comprender esa información.
                Creemos que una ciudadanía informada fortalece la democracia. Los datos son públicos:
                acá los presentamos de forma organizada para que vos saqés tus <em>propias conclusiones</em>.
              </p>
              <div className={styles.principios}>
                {[
                  ['Datos oficiales del SIL', 'Toda la información proviene directamente del sistema público de la Asamblea Legislativa.'],
                  ['Sin editoriales', 'Presentamos los datos tal como la Asamblea los publica. El análisis es tuyo.'],
                  ['Código abierto', 'El scraper, la API y el portal están disponibles públicamente.'],
                  ['Sin fines de lucro', 'Este proyecto no tiene intereses comerciales ni económicos. Es un aporte ciudadano.'],
                ].map(([titulo, desc]) => (
                  <div key={titulo} className={styles.principio}>
                    <div className={styles.principioTitle}>{titulo}</div>
                    <div className={styles.principioDesc}>{desc}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Cómo funciona */}
            <section className={styles.section}>
              <h2 className={styles.h2}>Cómo funciona</h2>
              <p>
                El portal funciona de forma automatizada. Nuestro sistema consulta periódicamente los datos
                que la Asamblea publica en el SIL, los procesa y los presenta en este portal.
              </p>

              <div className={styles.archFlow}>
                {[
                  ['①', 'Consultamos la información pública', 'Nuestro sistema lee periódicamente los datos que la Asamblea Legislativa publica en el SIL.'],
                  ['②', 'La mantenemos actualizada', 'Si un proyecto cambia de estado o aparece uno nuevo, se refleja automáticamente en nuestro portal.'],
                  ['③', 'La organizamos de forma estructurada', 'Los datos se almacenan ordenadamente para facilitar búsquedas, filtros y consultas rápidas.'],
                  ['④', 'La hacemos fácil de explorar', 'Podés buscar proyectos, filtrarlos por diputado o tema, y navegar lo que está pasando.'],
                  ['⑤', 'La presentamos de forma visual', 'Transformamos los datos en gráficos e indicadores para que cualquier persona pueda entenderlos.'],
                ].map(([icon, title, desc]) => (
                  <div key={title} className={styles.archStep}>
                    <div className={styles.archIcon}>{icon}</div>
                    <div className={styles.archInfo}>
                      <div className={styles.archTitle}>{title}</div>
                      <div className={styles.archDesc}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Video */}
            <section className={styles.section}>
              <h2 className={styles.h2}>¿Querés ver cómo funciona por dentro?</h2>
              <p>
                Si te interesa la parte técnica, podés ver el video donde se explica todo el proceso
                y las decisiones detrás del proyecto.
              </p>
              <div className={styles.videoPlaceholder}>
                <div className={styles.videoIcon}>▶</div>
                <div className={styles.videoLabel}>Video próximamente en YouTube</div>
              </div>
            </section>

            {/* Limitaciones */}
            <section className={styles.section}>
              <h2 className={styles.h2}>Consideraciones importantes</h2>
              <div className={styles.limitaciones}>
                <p>
                  <strong>Los datos provienen del SIL.</strong> Nuestro portal refleja fielmente lo que
                  la Asamblea publica. Si algún dato aún no se ha registrado en el sistema oficial,
                  tampoco aparecerá acá.
                </p>
                <p>
                  <strong>No es en tiempo real.</strong> La actualización es periódica.
                  Puede haber un desfase de horas o un día con respecto al sitio oficial.
                </p>
                <p>
                  <strong>No interpretamos la ley.</strong> Este portal es informativo, no jurídico.
                  Si necesitás asesoría legal, consultá una fuente calificada.
                </p>
              </div>
            </section>

          </div>

          {/* Sidebar */}
          <aside className={styles.sidebar}>
            <div className={styles.sideCard}>
              <div className={styles.sideTitle}>Fuente de los datos</div>
              <p className={styles.sideText}>
                Todos los datos provienen del Sistema de Información Legislativa (SIL) de la
                Asamblea Legislativa de Costa Rica, de acceso público.
              </p>
              <a
                href="https://www.asamblea.go.cr/Centro_de_informacion/Consultas_SIL/SitePages/SIL.aspx"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.sideLink}
              >
                Ir al SIL oficial →
              </a>
            </div>

            <div className={styles.sideCard}>
              <div className={styles.sideTitle}>¿Encontraste un error?</div>
              <p className={styles.sideText}>
                Si notás alguna inconsistencia o error técnico, agradecemos tu reporte para
                verificar nuestra sincronización con el sistema original.
              </p>
              <a
                href="mailto:hola@asamblealdia.cr"
                className={styles.sideLink}
              >
                Escribinos →
              </a>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
