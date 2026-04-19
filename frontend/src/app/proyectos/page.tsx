'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import type { ProyectoResumen, Categoria, Paginacion } from '@/lib/api'
import { formatTitle, formatDate, formatQuantity } from '@/lib/utils'
import { getPeriodos, getAllLegislativePeriods } from '@/lib/periodos'
import styles from './proyectos.module.css'
import FilterPill from '@/components/ui/FilterPill'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { EstadoChip } from '@/components/ui/EstadoChip'
import { ESTADO_FILTROS, clasificarEstado } from '@/lib/estados'

const POR_PAGINA = 10

// ── Icons ────────────────────────────────────────────────────────────────────

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  )
}

function IconFilter() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
  )
}

function IconChevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9 18 6-6-6-6"/>
    </svg>
  )
}

function IconX() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  )
}

function IconScale() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
      <path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
    </svg>
  )
}

// ── Tipo abbreviation ─────────────────────────────────────────────────────────

const TIPO_MAP: Record<string, string> = {
  'PROCEDIMIENTO PROYECTO DE LEY ORDINARIO': 'Ley ordinaria',
  'PROCEDIMIENTO PROYECTOS DE COMISION DE HONORES': 'Comisión de honores',
  'PROCEDIMIENTO REFORMAS AL REGLAMENTO DE LA ASAMBLEA LEGISLATIVA': 'Reforma al reglamento',
  'PROCEDIMIENTO COMISIONES ESPECIALES INVESTIGADORAS': 'Comisión investigadora',
  'PROCEDIMIENTO DE NOMBRAMIENTOS / RATIFICACIONES / REELECCIONES': 'Nombramiento / Ratificación',
  'PROCEDIMIENTO QUERELLAS DE LOS MIEMBROS DE LOS SUPREMOS PODERES': 'Querella',
}

function abbreviateTipo(tipo: string): string {
  const clean = tipo.trim().toUpperCase()
  if (TIPO_MAP[clean]) return TIPO_MAP[clean]
  const stripped = clean.replace(/^PROCEDIMIENTO\s+(DE\s+)?/, '')
  return stripped.charAt(0) + stripped.slice(1).toLowerCase()
}

// ── Project card ─────────────────────────────────────────────────────────────

function ProyectoCard({ p }: { p: ProyectoResumen }) {
  const isLey = p.es_ley
  return (
    <Link href={`/proyecto/${p.numero_expediente}`} className={`${styles.card} ${isLey ? styles.cardLey : ''}`}>
      <div className={styles.cardAccent} />

      <div className={styles.cardBody}>
        {/* Top row: exp number + estado chip */}
        <div className={styles.cardTop}>
          <span className={styles.expediente}>Exp. {p.numero_expediente}</span>
          <EstadoChip
            estadoActual={p.estado_actual}
            esLey={isLey}
            numeroLey={p.numero_ley}
            size="sm"
          />
        </div>

        {/* Title */}
        <h2 className={styles.cardTitle}>{formatTitle(p.titulo)}</h2>

        {/* Meta row: tipo · fecha · proponentes · trámites */}
        <div className={styles.cardMeta}>
          {p.tipo_expediente && (
            <span className={styles.metaTipo}>{abbreviateTipo(p.tipo_expediente)}</span>
          )}
          {p.fecha_inicio && (
            <>
              <span className={styles.metaSep} aria-hidden>·</span>
              <span className={styles.metaStat}>{formatDate(p.fecha_inicio)}</span>
            </>
          )}
          <span className={styles.metaSep} aria-hidden>·</span>
          <span className={styles.metaStat}>{formatQuantity(p.total_proponentes, 'proponente', 'proponentes')}</span>
          <span className={styles.metaSep} aria-hidden>·</span>
          <span className={styles.metaStat}>{formatQuantity(p.total_tramites, 'trámite', 'trámites')}</span>
        </div>

        {/* Category tags */}
        {p.categorias.length > 0 && (
          <div className={styles.cardTags}>
            {p.categorias.slice(0, 4).map(c => (
              <span key={c.slug} className={styles.tag}>{c.nombre}</span>
            ))}
            {p.categorias.length > 4 && (
              <span className={styles.tagMore}>+{p.categorias.length - 4}</span>
            )}
          </div>
        )}
      </div>

      <div className={styles.cardArrow}><IconChevron /></div>
    </Link>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className={styles.skeleton}>
      <div className={`${styles.skLine} ${styles.skShort}`} />
      <div className={`${styles.skLine} ${styles.skLong}`} />
      <div className={`${styles.skLine} ${styles.skMid}`} />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

function ProyectosContent() {
  const searchParams = useSearchParams()

  // Filter state — pre-populated from URL params (?q=...&categoria=...)
  const [query, setQuery]         = useState(() => searchParams.get('q') || '')
  const [categoria, setCategoria] = useState(() => searchParams.get('categoria') || '')
  const [periodo, setPeriodo]     = useState('')
  const [tipo, setTipo]           = useState('')
  const [estado, setEstado]       = useState(() => searchParams.get('estado') || '')
  const [orden, setOrden]         = useState('reciente')
  const [soloLeyes, setSoloLeyes] = useState(() => searchParams.get('estado') === 'ley')
  const [pagina, setPagina]       = useState(1)

  // Data state
  const [proyectos, setProyectos]   = useState<ProyectoResumen[]>([])
  const [paginacion, setPaginacion] = useState<Paginacion | null>(null)
  const [loading, setLoading]       = useState(true)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [tipos, setTipos]           = useState<{ tipo_expediente: string; total: number }[]>([])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load filters metadata
  useEffect(() => {
    api.categorias.listar().then(r => setCategorias(r.datos)).catch(() => {})
    api.proyectos.tipos().then(setTipos).catch(() => {})
  }, [])

  const fetchProyectos = useCallback(async (q: string, pg: number) => {
    setLoading(true)
    try {
      const periodObj = getPeriodos().find(p => p.label === periodo)
      const desde = periodObj?.desde()
      const allPeriods = getAllLegislativePeriods()
      const legPeriod = allPeriods.find(p => p.label === periodo)

      let result
      if (q.trim()) {
        result = await api.proyectos.buscar(q.trim(), pg, legPeriod?.desde || desde, legPeriod?.hasta)
      } else {
        result = await api.proyectos.list({
          pagina: pg,
          por_pagina: POR_PAGINA,
          tipo: tipo || undefined,
          desde: legPeriod?.desde || desde,
          hasta: legPeriod?.hasta,
          solo_leyes: soloLeyes || undefined,
          orden,
          categoria: categoria || undefined,
        })
      }
      setProyectos(result.datos)
      setPaginacion(result.paginacion)
    } catch {
      setProyectos([])
      setPaginacion(null)
    } finally {
      setLoading(false)
    }
  }, [categoria, periodo, tipo, orden, soloLeyes])

  // Debounce query changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPagina(1)
      fetchProyectos(query, 1)
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, fetchProyectos])

  // Immediate on filter changes
  useEffect(() => {
    setPagina(1)
    fetchProyectos(query, 1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoria, periodo, tipo, orden, soloLeyes])

  useEffect(() => {
    fetchProyectos(query, pagina)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina])

  const clearFilters = () => {
    setQuery(''); setCategoria(''); setPeriodo(''); setTipo(''); setEstado('')
    setOrden('reciente'); setSoloLeyes(false); setPagina(1)
  }

  const hasFilters = query || categoria || periodo || tipo || estado || soloLeyes || orden !== 'reciente'

  // Filtro client-side por estado (el backend solo expone texto libre)
  const proyectosFiltrados = estado
    ? proyectos.filter(p => clasificarEstado(p.estado_actual, p.es_ley) === estado)
    : proyectos

  const totalStr = paginacion
    ? `${paginacion.total.toLocaleString('es-CR')} proyecto${paginacion.total !== 1 ? 's' : ''}`
    : ''

  return (
    <div className={styles.page}>

      {/* ── Page header ── */}
      <section className={styles.hero}>
        <div className={styles.heroDots} aria-hidden />
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <span className={styles.heroEyebrow}>Base de datos legislativa</span>
            <h1 className={styles.heroTitle}>Proyectos de Ley</h1>
            <p className={styles.heroDesc}>
              Explorá los {paginacion ? paginacion.total.toLocaleString('es-CR') : '…'} proyectos registrados en la Asamblea Legislativa de Costa Rica.
            </p>
          </div>

          {/* Search bar */}
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}><IconSearch /></span>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Buscá por título, número de expediente o tema…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button className={styles.searchClear} onClick={() => setQuery('')} aria-label="Limpiar búsqueda">
                <IconX />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Filters bar ── */}
      <div className={styles.filtersBar}>
        <div className={styles.filtersInner}>
          <span className={styles.filtersLabel}><IconFilter /> Filtros</span>

          <div className={styles.selects}>
            <FilterPill
              value={categoria}
              onChange={setCategoria}
              placeholder="Todos los temas"
              options={[
                { value: '', label: 'Todos los temas' },
                ...categorias.map(c => ({ value: c.slug, label: c.nombre })),
              ]}
            />
            <FilterPill
              value={periodo}
              onChange={setPeriodo}
              placeholder="Cualquier período"
              options={[
                { value: '', label: 'Cualquier período' },
                ...getPeriodos().map(p => ({ value: p.label, label: p.label })),
                ...getAllLegislativePeriods().map(p => ({ value: p.label, label: p.label })),
              ]}
            />

            <FilterPill
              value={estado}
              onChange={setEstado}
              placeholder="Todos los estados"
              active={estado !== ''}
              options={ESTADO_FILTROS}
            />
            <FilterPill
              value={orden}
              onChange={setOrden}
              placeholder="Más recientes"
              active={orden !== 'reciente'}
              options={[
                { value: 'reciente', label: 'Más recientes' },
                { value: 'antiguo',  label: 'Más antiguos' },
                { value: 'expediente', label: 'N° expediente' },
              ]}
            />
          </div>

          <div className={styles.filtersSep} aria-hidden />

          <button
            className={`${styles.toggleLey} ${soloLeyes ? styles.toggleActive : ''}`}
            onClick={() => setSoloLeyes(!soloLeyes)}
            aria-pressed={soloLeyes}
          >
            <IconScale /> Solo leyes
          </button>

          {hasFilters && (
            <button className={styles.clearBtn} onClick={clearFilters}>
              <IconX /> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* ── Results ── */}
      <div className={styles.main}>
        <div className={styles.container}>

          {/* Results count */}
          <div className={styles.resultsRow}>
            <p className={styles.resultsCount}>
              {loading ? 'Buscando…' : totalStr}
              {!loading && categoria && categorias.find(c => c.slug === categoria) && (
                <span className={styles.activeFilter}> — {categorias.find(c => c.slug === categoria)?.nombre}</span>
              )}
              {!loading && soloLeyes && <span className={styles.activeFilter}> — solo leyes</span>}
            </p>
          </div>

          {/* Cards */}
          {loading ? (
            <div className={styles.list}>
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} />)}
            </div>
          ) : proyectosFiltrados.length === 0 ? (
            <EmptyState
              title="Sin resultados"
              description={estado ? `Ningún proyecto coincide con el estado seleccionado en esta página. Probá quitar el filtro de estado o cambiar de página.` : "Intentá con otros filtros o una búsqueda diferente."}
              actions={
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              }
            />
          ) : (
            <div className={styles.list}>
              {proyectosFiltrados.map(p => <ProyectoCard key={p.id} p={p} />)}
            </div>
          )}

          {/* Pagination */}
          {paginacion && paginacion.total_paginas > 1 && !loading && (
            <div className={styles.pagination}>
              <Button
                variant="secondary"
                size="sm"
                disabled={pagina <= 1}
                onClick={() => { setPagina(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              >← Anterior</Button>

              <div className={styles.pageNums}>
                {Array.from({ length: Math.min(paginacion.total_paginas, 5) }, (_, i) => {
                  const totalPages = paginacion.total_paginas
                  let pg: number
                  if (totalPages <= 5) {
                    pg = i + 1
                  } else if (pagina <= 3) {
                    pg = i + 1
                  } else if (pagina >= totalPages - 2) {
                    pg = totalPages - 4 + i
                  } else {
                    pg = pagina - 2 + i
                  }
                  return (
                    <button
                      key={pg}
                      className={`${styles.pageNum} ${pg === pagina ? styles.pageNumActive : ''}`}
                      onClick={() => { setPagina(pg); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    >{pg}</button>
                  )
                })}
              </div>

              <Button
                variant="secondary"
                size="sm"
                disabled={pagina >= paginacion.total_paginas}
                onClick={() => { setPagina(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              >Siguiente →</Button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default function ProyectosPage() {
  return (
    <Suspense fallback={null}>
      <ProyectosContent />
    </Suspense>
  )
}
