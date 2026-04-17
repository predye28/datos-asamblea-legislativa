'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import styles from './Navbar.module.css'

const NAV_LINKS = [
  { href: '/',             label: 'Inicio' },
  { href: '/proyectos',    label: 'Proyectos' },
  { href: '/diputados',    label: 'Diputados' },
  { href: '/estadisticas', label: 'Estadísticas' },
  { href: '/acerca',       label: 'Acerca de' },
]

export default function Navbar() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [currentDate, setCurrentDate] = useState('')

  useEffect(() => {
    const d = new Date()
    const day = d.getDate()
    const month = d.toLocaleString('es-CR', { month: 'long' })
    const year = d.getFullYear()
    setCurrentDate(`${day} ${month} ${year}`)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  return (
    <>
      <header className={styles.header}>
        <div className={styles.container}>
          <Link href="/" className={styles.logo}>
            La <span className={styles.accent}>Asamblea</span> al Día
          </Link>

          <nav className={styles.nav} aria-label="Navegación principal">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`${styles.link} ${pathname === l.href ? styles.active : ''}`}
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

      <div className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ''}`}>
        <nav aria-label="Menú móvil">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`${styles.mobileLink} ${pathname === l.href ? styles.mobileLinkActive : ''}`}
              onClick={() => setMenuOpen(false)}
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
