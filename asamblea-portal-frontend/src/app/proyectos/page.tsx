'use client'
// src/app/proyectos/page.tsx
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { api, ProyectoResumen, Paginacion, Categoria } from '@/lib/api'
import LoadingIndicator from '@/components/ui/LoadingIndicator'
import SectionRule from '@/components/ui/SectionRule'
import Hero from '@/components/sections/Hero'
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
  const [pagina,    setPagina]    = useState(1)

  const [data,       setData]       = useState<{ datos: ProyectoResumen[]; paginacion: Paginacion } | null>(null)
  const [tipos,      setTipos]      = useState<{ tipo_expediente: string; total: number }[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading,    setLoading]    = useState(true)

  // años disponibles (últimos 10)
  const anios = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i)

  useEffect(() => {
    api.proyectos.tipos().then(setTipos).catch(() => {})
    api.categorias.listar().then(res => setCategorias(res.datos)).catch(() => {})
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
          categoria: categoria || undefined,
        })
      }
      setData(result)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [query, tipo, anio, soloLeyes, orden, categoria, pagina])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPagina(1)
    fetchData()
  }

  const clearFilters = () => {
    setQuery(''); setTipo(''); setAnio(''); setSoloLeyes(false)
    setOrden('reciente'); setCategoria(''); setPagina(1)
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
    if (anio) parts.push(String(anio))
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
            <input
              className={`${styles.searchInput}`}
              type="text"
              placeholder="Buscar por título, diputado u órgano..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <button type="submit" className={styles.searchBtn}>Buscar →</button>
          </form>

          {/* Filtro de categorías */}
          {categorias.length > 0 && (
            <div className={styles.catFilterRow}>
              <button
                className={`${styles.catChip} ${categoria === '' ? styles.catChipActive : ''}`}
                onClick={() => { setCategoria(''); setPagina(1) }}
              >Todos</button>
              {categorias.map(cat => (
                <button
                  key={cat.slug}
                  className={`${styles.catChip} ${categoria === cat.slug ? styles.catChipActive : ''}`}
                  onClick={() => { setCategoria(cat.slug); setPagina(1) }}
                >
                  {cat.nombre}
                </button>
              ))}
            </div>
          )}

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
            {data && <Pager pag={data.paginacion} onPage={setPagina} />}
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
