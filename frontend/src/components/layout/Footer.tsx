import Link from 'next/link'
import styles from './Footer.module.css'

function IconGitHub() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  )
}

function IconMail() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="m22 7-10 7L2 7"/>
    </svg>
  )
}

const EXPLORE_LINKS = [
  { href: '/proyectos',    label: 'Proyectos' },
  { href: '/diputados',    label: 'Diputados' },
  { href: '/estadisticas', label: 'Estadísticas' },
]

const PROJECT_LINKS = [
  { href: '/acerca', label: 'Acerca de' },
  { href: 'https://www.asamblea.go.cr/Centro_de_informacion/Consultas_SIL/SitePages/SIL.aspx', label: 'SIL oficial', external: true },
]

export default function Footer() {
  return (
    <footer className={styles.footer}>

      {/* Top gold gradient divider */}
      <div className={styles.topRule} />

      <div className={styles.container}>
        <div className={styles.main}>

          {/* Brand */}
          <div className={styles.brand}>
            <div className={styles.logo}>
              La <span className={styles.accent}>Asamblea</span> al Día
            </div>
            <p className={styles.tagline}>
              Plataforma independiente que facilita el acceso a la información
              legislativa de Costa Rica. Datos del SIL, presentados con claridad.
            </p>
          </div>

          {/* Nav columns */}
          <div className={styles.cols}>

            <div className={styles.col}>
              <div className={styles.colHeading}>Explorar</div>
              {EXPLORE_LINKS.map(l => (
                <Link key={l.href} href={l.href} className={styles.link}>{l.label}</Link>
              ))}
            </div>

            <div className={styles.col}>
              <div className={styles.colHeading}>Proyecto</div>
              {PROJECT_LINKS.map(l =>
                l.external ? (
                  <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className={styles.link}>
                    {l.label} <span className={styles.ext}>↗</span>
                  </a>
                ) : (
                  <Link key={l.href} href={l.href} className={styles.link}>{l.label}</Link>
                )
              )}
            </div>

            {/* Contact */}
            <div className={styles.col}>
              <div className={styles.colHeading}>Contacto</div>
              <a
                href="https://github.com/omarmr14/datos-asamblea-legislativa"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.contactLink}
              >
                <IconGitHub />
                Repositorio
              </a>
              <a
                href="mailto:omarmr14.02@gmail.com"
                className={styles.contactLink}
              >
                <IconMail />
                omarmr14.02@gmail.com
              </a>
              <p className={styles.madeBy}>
                Hecho por <span className={styles.author}>Omar Madrigal</span>
              </p>
            </div>

          </div>
        </div>

        {/* Bottom bar */}
        <div className={styles.bottom}>
          <span className={styles.copy}>
            © {new Date().getFullYear()} La Asamblea al Día · Costa Rica
          </span>
          <span className={styles.source}>
            Datos del{' '}
            <a
              href="https://www.asamblea.go.cr/Centro_de_informacion/Consultas_SIL/SitePages/SIL.aspx"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.sourceLink}
            >
              Sistema de Información Legislativa (SIL)
            </a>
          </span>
        </div>
      </div>
    </footer>
  )
}
