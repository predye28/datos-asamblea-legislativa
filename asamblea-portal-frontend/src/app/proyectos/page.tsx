'use client'
// src/app/proyectos/page.tsx
import { useState, useEffect, useCallback, Suspense, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { api, ProyectoResumen, Paginacion, Categoria } from '@/lib/api'
import { getAllLegislativePeriods } from '@/lib/periodos'
import LoadingIndicator from '@/components/ui/LoadingIndicator'
import SectionRule from '@/components/ui/SectionRule'
import Hero from '@/components/sections/Hero'
import styles from './proyectos.module.css'

function formatTitle(title: string) {
  if (!title) return 'Sin título';
  const text = title.toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

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
      <h2 className={styles.cardTitle}>{formatTitle(p.titulo || '')}</h2>
      <div className={styles.cardBottom}>
        <span className={styles.cardStat}>{p.total_proponentes} proponente{p.total_proponentes !== 1 ? 's' : ''}</span>
        <span className={styles.bullet}>•</span>
        <span className={styles.cardStat}>{p.total_tramites} trámite{p.total_tramites !== 1 ? 's' : ''}</span>
        {p.fecha_inicio && (
          <>
            <span className={styles.bullet}>•</span>
            <span className={styles.cardStat}>
              {new Date(p.fecha_inicio).toLocaleDateString('es-CR', { year: 'numeric', month: 'short' })}
            </span>
          </>
        )}
        {p.tipo_expediente && <span className={styles.cardType}>{p.tipo_expediente}</span>}
      </div>
      {p.categorias && p.categorias.length > 0 && (
        <div className={styles.cardCats}>
          {p.categorias.map(cat => (
            <span key={cat.slug} className={styles.catTag}>{cat.nombre}</span>
          ))}
        </div>
      )}
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

function ProyectosContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [query,     setQuery]     = useState(searchParams.get('q') || '')
  const [tipo,      setTipo]      = useState(searchParams.get('tipo') || '')
  const [anio,      setAnio]      = useState(searchParams.get('anio') || '')
  const [soloLeyes, setSoloLeyes] = useState(searchParams.get('solo_leyes') === 'true')
  const [orden,     setOrden]     = useState(searchParams.get('orden') || 'reciente')
  const [categoria, setCategoria] = useState(searchParams.get('categoria') || '')
  const [periodo,   setPeriodo]   = useState(searchParams.get('periodo') || '')
  const [pagina,    setPagina]    = useState(1)
  const [showCats,  setShowCats]  = useState(false)
  const catRef = useRef<HTMLDivElement>(null)

  const [data,       setData]       = useState<{ datos: ProyectoResumen[]; paginacion: Paginacion } | null>(null)
  const [tipos,      setTipos]      = useState<{ tipo_expediente: string; total: number }[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading,    setLoading]    = useState(true)

  // periodos disponibles
  const periodos = getAllLegislativePeriods()
  
  // años disponibles (últimos 15)
  // años disponibles (últimos 15)
  const anios = Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i)

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (catRef.current && !catRef.current.contains(event.target as Node)) {
        setShowCats(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    api.proyectos.tipos().then(setTipos).catch(() => {})
    api.categorias.listar().then(res => setCategorias(res.datos)).catch(() => {})
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const periodObj = periodos.find(p => p.label === periodo)
      let result
      if (query.trim()) {
        result = await api.proyectos.buscar(query.trim(), pagina, periodObj?.desde, periodObj?.hasta)
      } else {
        result = await api.proyectos.list({
          pagina,
          por_pagina: 20,
          tipo: tipo || undefined,
          anio: anio ? Number(anio) : undefined,
          desde: periodObj?.desde,
          hasta: periodObj?.hasta,
          solo_leyes: soloLeyes || undefined,
          orden,
          categoria: categoria || undefined,
        })
      }
      setData(result)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [query, tipo, anio, soloLeyes, orden, categoria, periodo, pagina])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPagina(1)
    fetchData()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handlePageChange = (p: number) => {
    setPagina(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const clearFilters = () => {
    setQuery(''); setTipo(''); setAnio(''); setSoloLeyes(false)
    setOrden('reciente'); setCategoria(''); setPeriodo(''); setPagina(1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Label contextual
  const labelContextual = (() => {
    if (!data) return 'Cargando...'
    const total = data.paginacion.total.toLocaleString('es-CR')
    const parts: string[] = []
    if (categoria) {
      const cat = categorias.find(c => c.slug === categoria)
      if (cat) parts.push(cat.nombre)
    }
    if (query.trim()) parts.push(`"${query.trim()}"`)
    if (periodo) parts.push(`período ${periodo}`)
    else if (anio) parts.push(String(anio))
    if (soloLeyes) parts.push('solo leyes')
    return parts.length > 0
      ? `${total} proyectos — ${parts.join(', ')}`
      : `${total} proyectos encontrados`
  })()

  return (
    <div style={{ paddingBottom: 80 }}>
      <Hero
        kicker="Proyectos de ley"
        headline="Todos los proyectos de la Asamblea"
        deck="Explorá, filtrá y buscá entre todos los proyectos registrados. Cada uno es una propuesta que alguien presentó para convertirse en ley."
      />

      <div className="container">
        {/* Filtros */}
        <SectionRule label="Filtros" />
        <div className={styles.filters}>
          <form className={styles.searchRow} onSubmit={handleSearch}>
            <svg className={styles.searchIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              className={`${styles.searchInput}`}
              type="text"
              placeholder="Buscar por título, expediente o palabras clave..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <button type="submit" className={styles.searchBtn}>Buscar</button>
          </form>

          {/* Filtro de categorías */}
          {categorias.length > 0 && (
            <div className={styles.catFilterContainer} ref={catRef}>
              <button 
                type="button" 
                className={styles.mobileCatToggle}
                onClick={() => setShowCats(!showCats)}
              >
                {categoria ? `Tema: ${categorias.find(c => c.slug === categoria)?.nombre}` : 'Filtrar por Tema'}
                <span className={`${styles.toggleIcon} ${showCats ? styles.toggleIconOpen : ''}`}>▼</span>
              </button>
              
              <div className={`${styles.catFilterRow} ${showCats ? styles.catFilterRowOpen : ''}`}>
                <button
                  className={`${styles.catChip} ${categoria === '' ? styles.catChipActive : ''}`}
                  onClick={() => { setCategoria(''); handlePageChange(1); setShowCats(false); }}
                >Todos los temas</button>
                {categorias.map(cat => (
                  <button
                    key={cat.slug}
                    className={`${styles.catChip} ${categoria === cat.slug ? styles.catChipActive : ''}`}
                    onClick={() => { setCategoria(cat.slug); handlePageChange(1); setShowCats(false); }}
                  >
                    {cat.nombre}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={styles.filterControlsContainer}>
            <div className={styles.selectsRow}>
              <div className={styles.selectWrapper}>
                <select className={styles.select} value={periodo} onChange={e => { setPeriodo(e.target.value); setAnio(''); handlePageChange(1) }}>
                  <option value="">Cualquier período</option>
                  {periodos.map(p => <option key={p.label} value={p.label}>Periodo {p.label}</option>)}
                </select>
              </div>
              <div className={styles.selectWrapper}>
                <select className={styles.select} value={anio} onChange={e => { setAnio(e.target.value); setPeriodo(''); handlePageChange(1) }}>
                  <option value="">Año específico (Cualquiera)</option>
                  {anios.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className={styles.selectWrapper}>
                <select className={styles.select} value={tipo} onChange={e => { setTipo(e.target.value); handlePageChange(1) }}>
                  <option value="">Tipo de expediente (Todos)</option>
                  {tipos.map(t => (
                    <option key={t.tipo_expediente} value={t.tipo_expediente}>
                      {t.tipo_expediente} ({t.total})
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.selectWrapper}>
                <select className={styles.select} value={orden} onChange={e => { setOrden(e.target.value); handlePageChange(1) }}>
                  <option value="reciente">Más recientes primero</option>
                  <option value="antiguo">Más antiguos primero</option>
                  <option value="expediente">Por número de expediente</option>
                </select>
              </div>
            </div>
            
            <div className={styles.actionsRow}>
              <label className={styles.checkLabel}>
                <div className={styles.checkboxWrapper}>
                  <input
                    type="checkbox"
                    checked={soloLeyes}
                    onChange={e => { setSoloLeyes(e.target.checked); handlePageChange(1) }}
                  />
                  {soloLeyes && <svg className={styles.checkIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <span>Solo leyes aprobadas</span>
              </label>

              {(query || tipo || anio || soloLeyes || categoria || orden !== 'reciente') && (
                <button className={styles.clearBtn} onClick={clearFilters} aria-label="Limpiar filtros">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path>
                    <line x1="18" y1="9" x2="12" y2="15"></line>
                    <line x1="12" y1="9" x2="18" y2="15"></line>
                  </svg>
                  <span>Limpiar filtros</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Resultados */}
        <SectionRule label={labelContextual} />

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
            {data && <Pager pag={data.paginacion} onPage={handlePageChange} />}
          </>
        )}
      </div>
    </div>
  )
}

export default function ProyectosPage() {
  return (
    <Suspense fallback={<LoadingIndicator text="Buscando proyectos..." fillSpace={true} />}>
      <ProyectosContent />
    </Suspense>
  )
}
