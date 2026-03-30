import Hero from '@/components/sections/Hero'
import styles from './acerca.module.css'

export default function AcercaPage() {
  return (
    <div style={{ paddingBottom: 80 }}>
      <Hero
        kicker="Acerca de este proyecto"
        headline={<>Un portal ciudadano hecho<br />por preocupación, no por política</>}
        deck="La Asamblea Legislativa tiene toda su información en línea, pero en un formato que pocos pueden leer. Este portal toma esos datos oficiales y los explica en lenguaje sencillo, para que cualquier costarricense pueda entender qué hace su gobierno."
      />

      <div className="container">
        <div className={styles.layout}>

          {/* Columna principal */}
          <div className={styles.main}>

            {/* Por qué existe */}
            <section className={styles.section}>
              <div className={styles.pullQuote}>
                "La información pública existe. El problema es que está escrita para abogados."
              </div>
              <p>
                La Asamblea Legislativa publica todo lo que hace: cada proyecto de ley,
                cada diputado que lo firma, cada comisión por donde pasa. Eso es parte de su
                obligación como institución pública.
              </p>
              <p>
                El problema es cómo lo publica. El sistema oficial está pensado para
                especialistas en derecho, no para el ciudadano común. Buscar un proyecto,
                entender su estado, o saber qué hizo tu diputado requiere conocimiento técnico
                que la mayoría de personas no tiene — ni tiene por qué tener.
              </p>
              <p>
                Este portal existe para cerrar esa brecha. Tomamos los mismos datos oficiales
                y los presentamos de forma que cualquier persona, sin importar su nivel educativo,
                pueda entender qué está pasando en su Asamblea.
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

            {/* Cómo funciona — arquitectura */}
            <section className={styles.section}>
              <h2 className={styles.h2}>Cómo funciona técnicamente</h2>
              <p>
                El portal es completamente automatizado. Cada noche, un sistema extrae los datos
                directamente del sitio web de la Asamblea, los procesa y los guarda en una base de datos.
                Lo que ves en pantalla son esos mismos datos, presentados de otra forma.
              </p>

              <div className={styles.archFlow}>
                <div className={styles.archStep}>
                  <div className={styles.archIcon}>①</div>
                  <div className={styles.archInfo}>
                    <div className={styles.archTitle}>Extractor (scraper)</div>
                    <div className={styles.archDesc}>
                      Un script Python corre cada noche usando Playwright para navegar el portal SIL
                      y extraer proyectos, proponentes y tramitaciones. Se ejecuta automáticamente en
                      GitHub Actions a las 2am hora CR.
                    </div>
                  </div>
                </div>
                <div className={styles.archArrow}>↓</div>
                <div className={styles.archStep}>
                  <div className={styles.archIcon}>②</div>
                  <div className={styles.archInfo}>
                    <div className={styles.archTitle}>Base de datos (PostgreSQL / Neon)</div>
                    <div className={styles.archDesc}>
                      Los datos se guardan en una base de datos PostgreSQL alojada en Neon.
                      La inserción es idempotente: si un proyecto ya existe, no se duplica.
                    </div>
                  </div>
                </div>
                <div className={styles.archArrow}>↓</div>
                <div className={styles.archStep}>
                  <div className={styles.archIcon}>③</div>
                  <div className={styles.archInfo}>
                    <div className={styles.archTitle}>API (FastAPI)</div>
                    <div className={styles.archDesc}>
                      Una API REST construida con FastAPI expone los datos con endpoints para listar,
                      buscar y obtener métricas. Está desplegada en Railway.
                    </div>
                  </div>
                </div>
                <div className={styles.archArrow}>↓</div>
                <div className={styles.archStep}>
                  <div className={styles.archIcon}>④</div>
                  <div className={styles.archInfo}>
                    <div className={styles.archTitle}>Portal (Next.js)</div>
                    <div className={styles.archDesc}>
                      Este portal consume la API y presenta los datos con un diseño pensado
                      para el ciudadano común. Desplegado en Vercel.
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Video */}
            <section className={styles.section}>
              <h2 className={styles.h2}>Video explicativo</h2>
              <p>
                Próximamente: un video en YouTube donde el creador del portal explica paso a paso
                cómo se construyó, qué tecnologías se usaron y por qué tomó las decisiones que tomó.
                Si te interesa entender cómo funciona por dentro, va a ser para vos.
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
            <div className={styles.sideCard}>
              <div className={styles.sideTitle}>Tecnologías usadas</div>
              <ul className={styles.stackList}>
                {[
                  ['Python', 'Extrae los datos del SIL cada noche'],
                  ['PostgreSQL', 'Base de datos donde se guarda todo'],
                  ['FastAPI', 'API que conecta los datos con el portal'],
                  ['Next.js', 'El portal web que estás viendo'],
                  ['GitHub Actions', 'Se actualiza solo, sin intervención manual'],
                ].map(([tech, role]) => (
                  <li key={tech} className={styles.stackItem}>
                    <span className={styles.stackTech}>{tech}</span>
                    <span className={styles.stackRole}>{role}</span>
                  </li>
                ))}
              </ul>
            </div>

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
                Si ves datos incorrectos o un error técnico, probablemente el problema esté
                en el SIL original. Pero si el error es nuestro, nos importa saberlo.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
