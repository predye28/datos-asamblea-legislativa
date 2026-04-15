'use client'
// src/components/layout/Navbar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import styles from './Navbar.module.css'

const links = [
  { href: '/', label: 'Inicio' },
  { href: '/proyectos', label: 'Proyectos' },
  { href: '/diputados', label: 'Diputados' },
  { href: '/estadisticas', label: 'Estadísticas' },
  { href: '/acerca', label: 'Acerca de' },
]

export default function Navbar() {
  const pathname = usePathname()
  const [menuAbierto, setMenuAbierto] = useState(false)

  // Cierra el menú cuando se navega a otra página
  useEffect(() => {
    setMenuAbierto(false)
  }, [pathname])

  // Bloquea el scroll del body cuando el menú está abierto
  useEffect(() => {
    if (menuAbierto) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [menuAbierto])

  return (
    <>
    <header className={styles.header}>
      <div className={styles.top}>
        <span className={styles.meta}>Costa Rica · Datos oficiales · Actualizado diariamente</span>
        <Link href="/" className={styles.title}>
          La <span>Asamblea</span><br />al día
        </Link>

        {/* Botón hamburguesa — solo visible en móvil */}
        <button
          className={styles.hamburger}
          onClick={() => setMenuAbierto(!menuAbierto)}
          aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuAbierto}
        >
          <span className={`${styles.hamburgerLine} ${menuAbierto ? styles.open1 : ''}`} />
          <span className={`${styles.hamburgerLine} ${menuAbierto ? styles.open2 : ''}`} />
          <span className={`${styles.hamburgerLine} ${menuAbierto ? styles.open3 : ''}`} />
        </button>

        {/* Meta derecha — solo desktop */}
        <span className={styles.meta} suppressHydrationWarning>
          {new Date().toLocaleDateString('es-CR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </div>

      {/* Nav desktop — barra horizontal */}
      <nav className={styles.nav} aria-label="Navegación principal">
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={`${styles.link} ${pathname === l.href ? styles.active : ''}`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>

    {/* Overlay oscuro y Menú móvil desplegable (FUERA del header para que position: fixed funcione bien sin importar los filtros CSS del header) */}
    {menuAbierto && (
      <div
        className={styles.overlay}
        onClick={() => setMenuAbierto(false)}
        aria-hidden="true"
      />
    )}

    <nav
      className={`${styles.mobileMenu} ${menuAbierto ? styles.mobileMenuOpen : ''}`}
      aria-label="Menú móvil"
    >
      {/* Header del menú móvil */}
      <div className={styles.mobileMenuHeader}>
        <span className={styles.mobileMenuTitle}>La <span style={{ color: 'var(--accent)' }}>Asamblea</span> al día</span>
        <button
          className={styles.mobileMenuClose}
          onClick={() => setMenuAbierto(false)}
          aria-label="Cerrar menú"
        >
          ✕
        </button>
      </div>

      {/* Links del menú */}
      <div className={styles.mobileMenuLinks}>
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={`${styles.mobileLink} ${pathname === l.href ? styles.mobileLinkActive : ''}`}
          >
            {l.label}
            {pathname === l.href && <span className={styles.activeDot} />}
          </Link>
        ))}
      </div>
    </nav>
    </>
  )
}
