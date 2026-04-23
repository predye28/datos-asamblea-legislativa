import CreatorSection from '@/components/sections/CreatorSection'
import styles from './acerca.module.css'

export default function AcercaPage() {
  return (
    <div className={styles.page}>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroDots} aria-hidden />
        <div className={styles.heroInner}>
          <span className={styles.heroEyebrow}>Sobre el proyecto</span>
          <h1 className={styles.heroTitle}>
            Acercando la información legislativa<br />
            <span className={styles.heroAccent}>a la ciudadanía</span>
          </h1>
          <p className={styles.heroDesc}>
            Un proyecto ciudadano sin fines de lucro que trabaja de la mano con la transparencia
            de la Asamblea Legislativa. Organizamos los datos del Sistema de Información
            Legislativa (SIL) en un formato visual y accesible para toda la ciudadanía.
          </p>
        </div>
      </section>

      {/* ── Main content ── */}
      <div className={styles.main}>
        <div className={styles.layout}>

          {/* Columna principal */}
          <div className={styles.content}>

            {/* Propósito */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Nuestro Propósito</h2>
                <p className={styles.sectionSubtitle}>Democratizar el acceso a la información</p>
              </div>
              <div className={styles.sectionContent}>
                <div className={styles.pullQuote}>
                  &ldquo;Facilitamos el acceso a la información pública que la Asamblea
                  ya comparte, para que llegue a más personas.&rdquo;
                </div>
                <p className={styles.bodyText}>
                  La Asamblea Legislativa de Costa Rica mantiene un compromiso ejemplar con la transparencia
                  al publicar toda su actividad a través del Sistema de Información Legislativa (SIL):
                  expedientes, firmas de diputaciones, avance por comisiones y mucho más.
                </p>
                <p className={styles.bodyText}>
                  Nuestro proyecto existe para amplificar ese esfuerzo. Tomamos esos mismos datos públicos
                  y los presentamos de forma visual e intuitiva, para que cualquier persona —sin importar
                  su formación— pueda explorar y comprender el trabajo legislativo del país.
                </p>
              </div>
            </section>

            {/* Compromiso */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Nuestro Compromiso</h2>
                <p className={styles.sectionSubtitle}>Informar con claridad y neutralidad</p>
              </div>
              <div className={styles.sectionContent}>
                <p className={styles.bodyText}>
                  Esta plataforma está al servicio de la ciudadanía. Reconocemos y valoramos el trabajo
                  que realiza la Asamblea Legislativa y su compromiso con la transparencia.
                  Nuestro rol es presentar esos datos de forma clara y organizada.
                </p>
                <p className={styles.bodyText}>
                  Nuestro objetivo es que más personas puedan consultar y comprender la información legislativa.
                  Una ciudadanía informada fortalece la democracia. Los datos son públicos:
                  acá los organizamos para que cada persona forme sus <em>propias conclusiones</em>.
                </p>
                <div className={styles.principios}>
                  {[
                    ['Datos oficiales del SIL', 'Toda la información proviene directamente del sistema público de la Asamblea Legislativa de Costa Rica.'],
                    ['Datos presentados tal cual', 'Mostramos la información como la Asamblea la publica. Las conclusiones son tuyas.'],
                    ['Código abierto', 'El scraper, la API y el portal están disponibles públicamente para quien quiera revisarlos o mejorarlos.'],
                    ['Aporte ciudadano', 'Este proyecto es un esfuerzo voluntario y colaborativo, abierto a toda la comunidad.'],
                  ].map(([titulo, desc]) => (
                    <div key={titulo} className={styles.principio}>
                      <div className={styles.principioDot} aria-hidden />
                      <div>
                        <div className={styles.principioTitle}>{titulo}</div>
                        <div className={styles.principioDesc}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Cómo funciona */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Cómo Funciona</h2>
                <p className={styles.sectionSubtitle}>Un proceso automatizado</p>
              </div>
              <div className={styles.sectionContent}>
                <p className={styles.bodyText}>
                  El portal funciona de forma automatizada. Nuestro sistema consulta periódicamente los datos
                  que la Asamblea publica en el SIL, los procesa y los presenta en este portal.
                </p>
                <div className={styles.steps}>
                  {[
                    ['01', 'Consultamos la información pública', 'Nuestro sistema lee periódicamente los datos que la Asamblea Legislativa publica en el SIL.'],
                    ['02', 'La mantenemos actualizada', 'Si un proyecto cambia de estado o aparece uno nuevo, se refleja automáticamente en nuestro portal.'],
                    ['03', 'La organizamos de forma estructurada', 'Los datos se almacenan ordenadamente para facilitar búsquedas, filtros y consultas rápidas.'],
                    ['04', 'La hacemos fácil de explorar', 'Podés buscar proyectos, filtrarlos por diputado o tema, y navegar lo que está pasando.'],
                    ['05', 'La presentamos de forma visual', 'Transformamos los datos en gráficos e indicadores para que cualquier persona pueda entenderlos.'],
                  ].map(([num, title, desc]) => (
                    <div key={num} className={styles.step}>
                      <div className={styles.stepNum}>{num}</div>
                      <div className={styles.stepContent}>
                        <div className={styles.stepTitle}>{title}</div>
                        <div className={styles.stepDesc}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Video placeholder */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Por Dentro</h2>
                <p className={styles.sectionSubtitle}>¿Querés ver cómo se construyó?</p>
              </div>
              <div className={styles.sectionContent}>
                <p className={styles.bodyText}>
                  Si te interesa la parte técnica, podés ver el video donde se explica todo el proceso
                  y las decisiones detrás del proyecto.
                </p>
                <div className={styles.videoPlaceholder}>
                  <div className={styles.videoIcon}>▶</div>
                  <div className={styles.videoLabel}>Video próximamente en YouTube</div>
                </div>
              </div>
            </section>



            {/* Buenas prácticas */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Buenas Prácticas</h2>
                <p className={styles.sectionSubtitle}>Recomendaciones al usar el portal</p>
              </div>
              <div className={styles.sectionContent}>
                <div className={styles.limitaciones}>
                  <div className={styles.limitacion}>
                    <div className={styles.limitacionTitle}>Fuente oficial: el SIL</div>
                    <div className={styles.limitacionText}>
                      Nuestro portal refleja fielmente lo que la Asamblea publica. Si un dato aún no aparece en el sistema oficial, estará disponible acá en cuanto se registre.
                    </div>
                  </div>
                  <div className={styles.limitacion}>
                    <div className={styles.limitacionTitle}>Actualización periódica</div>
                    <div className={styles.limitacionText}>
                      Sincronizamos los datos regularmente. Puede haber un breve desfase con el sitio oficial, que se resuelve en la siguiente actualización.
                    </div>
                  </div>
                  <div className={styles.limitacion}>
                    <div className={styles.limitacionTitle}>Portal informativo</div>
                    <div className={styles.limitacionText}>
                      Esta herramienta facilita la consulta de información legislativa. Para asesoría legal o jurídica, recomendamos acudir a una fuente calificada.
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Sección de apoyo y enlaces (Horizontal) */}
        <section className={styles.infoSection}>
          <div className={styles.infoContainer}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Soporte y Enlaces</h2>
              <p className={styles.sectionSubtitle}>Información adicional del proyecto</p>
            </div>
            <div className={styles.infoGrid}>
              <div className={styles.infoCard}>
                <div className={styles.infoCardAccent} />
                <div className={styles.infoTitle}>Fuente de los datos</div>
                <p className={styles.infoText}>
                  Todos los datos provienen del Sistema de Información Legislativa (SIL) de la
                  Asamblea Legislativa de Costa Rica, de acceso público.
                </p>
                <a
                  href="https://www.asamblea.go.cr/Centro_de_informacion/Consultas_SIL/SitePages/SIL.aspx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.infoLink}
                >
                  Ir al SIL oficial →
                </a>
              </div>

              <div className={styles.infoCard}>
                <div className={styles.infoCardAccent} />
                <div className={styles.infoTitle}>¿Encontraste un error?</div>
                <p className={styles.infoText}>
                  Si notás alguna inconsistencia o detalle por mejorar, nos encantaría saberlo
                  para mantener la calidad de la información.
                </p>
                <a
                  href="mailto:omarmr14.02@gmail.com"
                  className={styles.infoMailLink}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="m22 7-10 7L2 7"/>
                  </svg> omarmr14.02@gmail.com
                </a>
              </div>

              <div className={styles.infoCard}>
                <div className={styles.infoCardAccent} />
                <div className={styles.infoTitle}>Código fuente</div>
                <p className={styles.infoText}>
                  Todo el proyecto es de código abierto. Podés revisar cómo funciona, reportar errores
                  o contribuir directamente.
                </p>
                <a
                  href="https://github.com/omarmr14/datos-asamblea-legislativa"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.infoLink}
                >
                  Ver en GitHub →
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* El Creador */}
        <CreatorSection />
      </div>
    </div>
  )
}
