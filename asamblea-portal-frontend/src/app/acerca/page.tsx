import Hero from '@/components/sections/Hero'
import styles from './acerca.module.css'

export default function AcercaPage() {
  return (
    <div style={{ paddingBottom: 80 }}>
      <Hero
        kicker="Sobre el proyecto"
        headline={<>Información legislativa,<br />al alcance de todos</>}
        deck="Este portal procesa la información oficial de la Asamblea Legislativa para presentarla en un formato accesible. Nuestro objetivo es que cualquier ciudadano pueda seguir el proceso de creación de leyes en Costa Rica de forma sencilla y directa."
      />

      <div className="container">
        <div className={styles.layout}>

          {/* Columna principal */}
          <div className={styles.main}>

            {/* Por qué existe */}
            <section className={styles.section}>
              <div className={styles.pullQuote}>
                "Accesibilidad de datos para una ciudadanía informada."
              </div>
              <p>
                La Asamblea Legislativa publica de forma transparente toda su actividad: expedientes, 
                firmas de diputaciones y el avance por comisiones. Esta información es pública y esencial 
                para la vida democrática del país.
              </p>
              <p>
                Debido a la complejidad técnica del proceso legal, el sistema oficial está diseñado 
                principalmente para el uso jurídico y legislativo. Reconociendo esto, nuestro portal 
                busca ofrecer una alternativa de visualización simplificada para el público general.
              </p>
              <p>
                Este proyecto existe para facilitar esa consulta diaria. Tomamos los datos oficiales del 
                Sistema de Información Legislativa (SIL) y los organizamos para que cualquier persona 
                pueda comprender el estado actual de las leyes que se discuten en el Plenario.
              </p>
            </section>

            {/* Propósito */}
            <section className={styles.section}>
              <h2 className={styles.h2}>El propósito es solo informar</h2>
              <p>
                Este portal no tiene agenda política. No apoya ni critica a ningún partido,
                diputado ni proyecto en particular. No editorializamos sobre si una ley es buena o mala.
              </p>
              <p>
                Creemos que los ciudadanos merecen tener acceso fácil a datos oficiales para
                sacar sus <em>propias conclusiones</em>. Lo que hagás con esa información es tuyo.
              </p>
              <div className={styles.principios}>
                {[
                  ['Solo datos oficiales', 'Toda la información viene directamente del SIL de la Asamblea Legislativa. No inventamos ni interpretamos nada.'],
                  ['Sin editoriales', 'Mostramos qué pasó, no qué debería pasar. El juicio es tuyo.'],
                  ['Código abierto', 'El scraper, la API y el portal están disponibles públicamente. Cualquiera puede verificar cómo funciona.'],
                  ['Sin publicidad', 'Este proyecto no tiene fines comerciales. No hay anunciantes, no hay intereses económicos.'],
                ].map(([titulo, desc]) => (
                  <div key={titulo} className={styles.principio}>
                    <div className={styles.principioTitle}>{titulo}</div>
                    <div className={styles.principioDesc}>{desc}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Cómo funciona*/}
            <section className={styles.section}>
              <h2 className={styles.h2}>Cómo funciona</h2>
              <p>
                El portal es completamente automatizado. Cada noche, un sistema extrae los datos
                directamente del sitio web de la Asamblea, los procesa y los guarda en una base de datos.
                Lo que ves en pantalla son esos mismos datos, presentados de otra forma.
              </p>

              <div className={styles.archFlow}>
                <div className={styles.archStep}>
                  <div className={styles.archIcon}>①</div>
                  <div className={styles.archInfo}>
                    <div className={styles.archTitle}>Recolectamos la información</div>
                    <div className={styles.archDesc}>
                      Un sistema automático revisa todos los días la página de la Asamblea Legislativa
                      y obtiene los proyectos de ley, sus autores y su estado.
                    </div>
                  </div>
                </div>
                <div className={styles.archArrow}>↓</div>
                <div className={styles.archStep}>
                  <div className={styles.archIcon}>②</div>
                  <div className={styles.archInfo}>
                    <div className={styles.archTitle}>La información se mantiene actualizada</div>
                    <div className={styles.archDesc}>
                      Si un proyecto cambia, se actualiza automáticamente. Si aparece uno nuevo, se agrega.
                      Así siempre ves la versión más reciente.
                    </div>
                  </div>
                </div>
                <div className={styles.archArrow}>↓</div>
                <div className={styles.archStep}>
                  <div className={styles.archIcon}>③</div>
                  <div className={styles.archInfo}>
                    <div className={styles.archTitle}>Guardamos todo de forma organizada</div>
                    <div className={styles.archDesc}>
                      La información se almacena de forma estructurada
                      para poder consultarla fácilmente en cualquier momento.
                    </div>
                  </div>
                </div>
                <div className={styles.archArrow}>↓</div>
                <div className={styles.archStep}>
                  <div className={styles.archIcon}>④</div>
                  <div className={styles.archInfo}>
                    <div className={styles.archTitle}>La hacemos fácil de consultar</div>
                    <div className={styles.archDesc}>
                      Podés buscar proyectos, filtrarlos por diputado o tema, y explorar lo que está pasando en el país.
                    </div>
                  </div>
                </div>
                <div className={styles.archArrow}>↓</div>
                <div className={styles.archStep}>
                  <div className={styles.archIcon}>⑤</div>
                  <div className={styles.archInfo}>
                    <div className={styles.archTitle}>La mostramos de forma clara</div>
                    <div className={styles.archDesc}>
                      Transformamos datos complejos en información simple, para que cualquier persona pueda entender qué hace el gobierno.
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Video */}
            <section className={styles.section}>
              <h2 className={styles.h2}>¿Querés ver cómo funciona por dentro?</h2>
              <p>
                Si te interesa la parte técnica y cómo se construyó este portal paso a paso, podés ver el siguiente
                video donde se explica todo el proceso y las decisiones detrás del proyecto.
              </p>
              <div className={styles.videoPlaceholder}>
                <div className={styles.videoIcon}>▶</div>
                <div className={styles.videoLabel}>Video próximamente en YouTube</div>
              </div>
            </section>

            {/* Limitaciones */}
            <section className={styles.section}>
              <h2 className={styles.h2}>Limitaciones importantes</h2>
              <div className={styles.limitaciones}>
                <p>
                  <strong>Los datos dependen del SIL.</strong> Si la Asamblea no registra algo,
                  nosotros tampoco lo tenemos. La calidad de los datos es la de la fuente original.
                </p>
                <p>
                  <strong>No es en tiempo real.</strong> La actualización es diaria. Si algo cambió
                  hoy en la Asamblea, lo verás mañana.
                </p>
                <p>
                  <strong>No interpretamos la ley.</strong> No somos abogados ni politólogos.
                  Si necesitás asesoría legal o análisis político especializado, consultá una fuente calificada.
                </p>
              </div>
            </section>

          </div>

          {/* Sidebar */}
          <aside className={styles.sidebar}>
            {/* 
            <div className={styles.sideCard}>
              <div className={styles.sideTitle}>Tecnologías usadas</div>
              <ul className={styles.stackList}>
                {[
                  ['Playwright', 'Navega el SIL y extrae los datos automáticamente'],
                  ['Python', 'Lenguaje del extractor y del motor de sincronización'],
                  ['PostgreSQL', 'Base de datos donde se guarda todo'],
                  ['FastAPI', 'API que conecta los datos con el portal'],
                  ['Next.js', 'El portal web que estás viendo'],
                  ['Vercel / Render', 'Plataformas donde vive el portal y la API'],
                  ['GitHub Actions', 'Se actualiza solo, sin intervención manual'],
                ].map(([tech, role]) => (
                  <li key={tech} className={styles.stackItem}>
                    <span className={styles.stackTech}>{tech}</span>
                    <span className={styles.stackRole}>{role}</span>
                  </li>
                ))}
              </ul>
            </div>
            */}

            <div className={styles.sideCard}>
              <div className={styles.sideTitle}>Fuente de los datos</div>
              <p className={styles.sideText}>
                Todos los datos provienen del Sistema de Información Legislativa (SIL) de la
                Asamblea Legislativa de Costa Rica, que es de acceso público.
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
                Si notas alguna inconsistencia en la información o un error técnico, 
                agradecemos tu reporte para verificar nuestra sincronización con el sistema original.
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
