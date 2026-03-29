'use client'
// src/components/sections/BuscadorHome.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './BuscadorHome.module.css'

const TAGS = ['Agua', 'Salud', 'Educación', 'Seguridad', 'Ambiente', 'Pensiones', 'Impuestos', 'Vivienda']

export default function BuscadorHome() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const handleSearch = () => {
    const q = query.trim()
    if (q) router.push(`/proyectos?q=${encodeURIComponent(q)}`)
  }

  return (
    <div className={styles.block}>
      <div className={styles.label}>Buscador de proyectos</div>
      <div className={styles.inputWrap}>
        <input
          className={styles.input}
          type="text"
          placeholder="Buscar por tema, diputado u órgano..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <button className={styles.btn} onClick={handleSearch}>
          Buscar →
        </button>
      </div>
      <div className={styles.tags}>
        {TAGS.map(t => (
          <button
            key={t}
            className={styles.tag}
            onClick={() => router.push(`/proyectos?q=${t.toLowerCase()}`)}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  )
}
