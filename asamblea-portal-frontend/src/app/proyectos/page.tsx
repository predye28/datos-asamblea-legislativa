'use client'
// src/app/proyectos/page.tsx
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { api, ProyectoResumen, Paginacion } from '@/lib/api'
import SectionRule from '@/components/ui/SectionRule'
import styles from './proyectos.module.css'

function ProyectoCard({ p }: { p: ProyectoResumen }) {
  const router = useRouter()
  return (
    <article
      className={styles.card}
      onClick={() => router.push(`/proyecto/${p.numero_expediente}`)}
    >
      <div className={styles.cardTop}>
        <div className={styles.cardMeta}>
          <span className={styles.expNum}>Exp. {p.numero_expediente}</span>
          {p.es_ley && <span className={`${styles.badge} ${styles.badgeLey}`}>✓ Ley {p.numero_ley}</span>}
          {!p.es_ley && p.estado_actual && (
            <span className={styles.badge}>{p.estado_actual.slice(0, 40)}</span>
          )}
        </div>
        <span className={styles.arrow}>→</span>
      </div>
      <h2 className={styles.cardTitle}>{p.titulo || 'Sin título'}</h2>
      <div className={styles.cardBottom}>
        <span className={styles.cardStat}>{p.total_proponentes} proponente{p.total_proponentes !== 1 ? 's' : ''}</span>
        <span className={styles.cardStat}>{p.total_tramites} trámite{p.total_tramites !== 1 ? 's' : ''}</span>
        {p.fecha_inicio && (
          <span className={styles.cardStat}>
            {new Date(p.fecha_inicio).toLocaleDateString('es-CR', { year: 'numeric', month: 'short' })}
          </span>
        )}
        {p.tipo_expediente && <span className={styles.cardType}>{p.tipo_expediente}</span>}
      </div>
    </article>
  )
}

function Pager({ pag, onPage }: { pag: Paginacion; onPage: (p: number) => void }) {
  if (pag.total_paginas <= 1) return null
  const pages = Array.from({ length: Math.min(pag.total_paginas, 10) }, (_, i) => i + 1)
  return (
    <div className={styles.pager}>
      <button
        className={styles.pageBtn}
        onClick={() => onPage(pag.pagina - 1)}
        disabled={pag.pagina <= 1}
      >← Anterior</button>
      {pages.map(n => (
        <button
          key={n}
          className={`${styles.pageBtn} ${n === pag.pagina ? styles.pageBtnActive : ''}`}
          onClick={() => onPage(n)}
        >{n}</button>
      ))}
      {pag.total_paginas > 10 && <span className={styles.pageDots}>…{pag.total_paginas}</span>}
      <button
        className={styles.pageBtn}
        onClick={() => onPage(pag.pagina + 1)}
        disabled={pag.pagina >= pag.total_paginas}
      >Siguiente →</button>
    </div>
  )
}

export default function ProyectosPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [query,     setQuery]     = useState(searchParams.get('q') || '')
  const [tipo,      setTipo]      = useState(searchParams.get('tipo') || '')
  const [anio,      setAnio]      = useState(searchParams.get('anio') || '')
  const [soloLeyes, setSoloLeyes] = useState(searchParams.get('solo_leyes') === 'true')
  const [orden,     setOrden]     = useState(searchParams.get('orden') || 'reciente')
  const [pagina,    setPagina]    = useState(1)

  const [data,    setData]    = useState<{ datos: ProyectoResumen[]; paginacion: Paginacion } | null>(null)
  const [tipos,   setTipos]   = useState<{ tipo_expediente: string; total: number }[]>([])
  const [loading, setLoading] = useState(true)

  // años disponibles (últimos 10)
  const anios = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i)

  useEffect(() => {
    api.proyectos.tipos().then(setTipos).catch(() => {})
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      let result
      if (query.trim()) {
        result = await api.proyectos.buscar(query.trim(), pagina)
      } else {
        result = await api.proyectos.list({
          pagina,
          por_pagina: 20,
          tipo: tipo || undefined,
          anio: anio ? Number(anio) : undefined,
          solo_leyes: soloLeyes || undefined,
          orden,
        })
      }
      setData(result)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [query, tipo, anio, soloLeyes, orden, pagina])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPagina(1)
    fetchData()
  }

  const clearFilters = () => {
    setQuery(''); setTipo(''); setAnio(''); setSoloLeyes(false); setOrden('reciente'); setPagina(1)
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Hero */}
      <div className={styles.pageHero}>
        <div className="container">
          <div className={styles.heroKicker}>Proyectos de ley</div>
          <h1 className={styles.heroTitle}>Todos los proyectos de la Asamblea</h1>
          <p className={styles.heroDeck}>
            Explorá, filtrá y buscá entre todos los proyectos registrados.
            Cada uno es una propuesta que alguien presentó para convertirse en ley.
          </p>
        </div>
      </div>

      <div className="container">
        {/* Filtros */}
        <SectionRule label="Filtros" />
        <div className={styles.filters}>
          <form className={styles.searchRow} onSubmit={handleSearch}>
            <input
              className={`${styles.searchInput}`}
              type="text"
              placeholder="Buscar por título, diputado u órgano..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <button type="submit" className={styles.searchBtn}>Buscar →</button>
          </form>
          <div className={styles.filterRow}>
            <select className={styles.select} value={tipo} onChange={e => { setTipo(e.target.value); setPagina(1) }}>
              <option value="">Todos los tipos</option>
              {tipos.map(t => (
                <option key={t.tipo_expediente} value={t.tipo_expediente}>
                  {t.tipo_expediente} ({t.total})
                </option>
              ))}
            </select>
            <select className={styles.select} value={anio} onChange={e => { setAnio(e.target.value); setPagina(1) }}>
              <option value="">Todos los años</option>
              {anios.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select className={styles.select} value={orden} onChange={e => { setOrden(e.target.value); setPagina(1) }}>
              <option value="reciente">Más recientes</option>
              <option value="antiguo">Más antiguos</option>
              <option value="expediente">Por expediente</option>
            </select>
            <label className={styles.checkLabel}>
              <input
                type="checkbox"
                checked={soloLeyes}
                onChange={e => { setSoloLeyes(e.target.checked); setPagina(1) }}
              />
              Solo leyes aprobadas
            </label>
            <button className={styles.clearBtn} onClick={clearFilters}>Limpiar</button>
          </div>
        </div>

        {/* Resultados */}
        <SectionRule label={data ? `${data.paginacion.total.toLocaleString('es-CR')} proyectos encontrados` : 'Cargando...'} />

        {loading ? (
          <div className={styles.loading}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        ) : (
          <>
            <div className={styles.grid}>
              {data?.datos.map(p => <ProyectoCard key={p.id} p={p} />)}
              {data?.datos.length === 0 && (
                <div className={styles.empty}>
                  No se encontraron proyectos con esos criterios.
                </div>
              )}
            </div>
            {data && <Pager pag={data.paginacion} onPage={setPagina} />}
          </>
        )}
      </div>
    </div>
  )
}
