'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useSyncExternalStore } from 'react'
import { useT } from '@/i18n/LanguageProvider'
import styles from './Navbar.module.css'

const noopSubscribe = () => () => {}

function useClientDate(locale: string): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => {
      const d = new Date()
      const day = d.getDate()
      const month = d.toLocaleString(locale, { month: 'long' })
      const year = d.getFullYear()
      return locale.startsWith('en')
        ? `${month} ${day}, ${year}`
        : `${day} ${month} ${year}`
    },
    () => '',
  )
}

export default function Navbar() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const { dict, lang, toggleLang } = useT()
  const currentDate = useClientDate(dict.common.locale)

  const navLinks = [
    { href: '/',             label: dict.navbar.inicio },
    { href: '/proyectos',    label: dict.navbar.proyectos },
    { href: '/diputados',    label: dict.navbar.diputados },
    { href: '/partidos',     label: dict.navbar.partidos },
    { href: '/estadisticas', label: dict.navbar.estadisticas },
    { href: '/acerca',       label: dict.navbar.acerca },
  ]

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

  // El botón muestra el idioma al que cambiará (UX más clara que mostrar el actual).
  const otherLangLabel = lang === 'es' ? 'EN' : 'ES'

  return (
    <>
      <header className={`${styles.header} ${menuOpen ? styles.headerFixed : ''}`}>
        <div className={styles.container}>
          <Link
            href="/"
            className={styles.logo}
            onClick={(e) => {
              if (pathname === '/') {
                e.preventDefault()
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }
            }}
          >
            La <span className={styles.accent}>Asamblea</span> al Día
          </Link>

          <nav className={styles.nav} aria-label={dict.navbar.mainNav}>
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`${styles.link} ${pathname === l.href ? styles.active : ''}`}
                aria-current={pathname === l.href ? 'page' : undefined}
                onClick={(e) => {
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
            <button
              className={styles.langPill}
              onClick={toggleLang}
              aria-label={dict.navbar.langAria}
              title={dict.navbar.langAria}
            >
              {otherLangLabel}
            </button>
            {currentDate && (
              <span className={styles.dateDisplay}>{currentDate}</span>
            )}
            <button
              className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ''}`}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? dict.navbar.menuClose : dict.navbar.menuOpen}
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
        <nav aria-label={dict.navbar.mobileNav}>
          {navLinks.map((l) => (
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
