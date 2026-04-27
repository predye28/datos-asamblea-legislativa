'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useSyncExternalStore } from 'react'
import styles from './Navbar.module.css'

const NAV_LINKS = [
  { href: '/',             label: 'Inicio' },
  { href: '/proyectos',    label: 'Proyectos' },
  { href: '/diputados',    label: 'Diputados' },
  { href: '/estadisticas', label: 'Estadísticas' },
  { href: '/acerca',       label: 'Acerca de' },
]

// Empty subscribe — date only needs to render once on the client after hydration.
const noopSubscribe = () => () => {}

function useClientDate(): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => {
      const d = new Date()
      const day = d.getDate()
      const month = d.toLocaleString('es-CR', { month: 'long' })
      const year = d.getFullYear()
      return `${day} ${month} ${year}`
    },
    () => '',
  )
}

export default function Navbar() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const currentDate = useClientDate()

  // Close menu when the URL changes — subscribing to external state (history).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMenuOpen(false) }, [pathname])

  useEffect(() => {
    if (!menuOpen) return
    const { documentElement: html, body } = document
    const prevHtml = html.style.overflow
    const prevBody = body.style.overflow

    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    
    return () => {
      html.style.overflow = prevHtml
      body.style.overflow = prevBody
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  return (
    <>
      <header className={`${styles.header} ${menuOpen ? styles.headerFixed : ''}`}>
        <div className={styles.container}>
          <Link
            href="/"
            className={styles.logo}
            onClick={(e) => {
              // Si ya estamos en el inicio, no recargamos: solo subimos al tope.
              if (pathname === '/') {
                e.preventDefault()
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }
            }}
          >
            La <span className={styles.accent}>Asamblea</span> al Día
          </Link>

          <nav className={styles.nav} aria-label="Navegación principal">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`${styles.link} ${pathname === l.href ? styles.active : ''}`}
                aria-current={pathname === l.href ? 'page' : undefined}
                onClick={(e) => {
                  // Si ya estamos en esa ruta, en vez de no hacer nada
                  // subimos al tope para que se sienta como un "ir al inicio".
                  if (pathname === l.href) {
                    e.preventDefault()
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }
                }}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className={styles.rightZone}>
            <button className={styles.langPill} aria-label="Idioma">ES</button>
            {currentDate && (
              <span className={styles.dateDisplay}>{currentDate}</span>
            )}
            <button
              className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ''}`}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={menuOpen}
            >
              <span className={styles.line1} />
              <span className={styles.line2} />
              <span className={styles.line3} />
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div
          className={styles.overlay}
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ''}`}
        aria-hidden={!menuOpen}
      >
        <nav aria-label="Menú móvil">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`${styles.mobileLink} ${pathname === l.href ? styles.mobileLinkActive : ''}`}
              onClick={(e) => {
                if (pathname === l.href) {
                  e.preventDefault()
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }
                setMenuOpen(false)
              }}
              aria-current={pathname === l.href ? 'page' : undefined}
              tabIndex={menuOpen ? 0 : -1}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        {currentDate && (
          <span className={styles.mobileDateDisplay}>{currentDate}</span>
        )}
      </div>
    </>
  )
}
