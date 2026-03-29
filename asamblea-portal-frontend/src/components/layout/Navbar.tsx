'use client'
// src/components/layout/Navbar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './Navbar.module.css'

const links = [
  { href: '/',             label: 'Inicio' },
  { href: '/proyectos',    label: 'Proyectos' },
  { href: '/diputados',    label: 'Diputados' },
  { href: '/estadisticas', label: 'Estadísticas' },
  { href: '/acerca',       label: 'Acerca de' },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <header className={styles.header}>
      <div className={styles.top}>
        <span className={styles.meta}>Costa Rica · Datos oficiales · Actualizado diariamente</span>
        <Link href="/" className={styles.title}>
          La <span>Asamblea</span><br />en números
        </Link>
        <span className={styles.meta} suppressHydrationWarning>
          {new Date().toLocaleDateString('es-CR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </div>
      <nav className={styles.nav}>
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
  )
}
