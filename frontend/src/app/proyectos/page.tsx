'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import type { ProyectoResumen, Categoria, Paginacion } from '@/lib/api'
import { formatTitle, formatDate, formatQuantity } from '@/lib/utils'
import { getPeriodos, getAllLegislativePeriods } from '@/lib/periodos'
import { ESTADO_FILTROS } from '@/lib/estados'
import styles from './proyectos.module.css'
import FilterPill from '@/components/ui/FilterPill'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { EstadoChip } from '@/components/ui/EstadoChip'

const POR_PAGINA = 10

const ORDEN_LABELS: Record<string, string> = {
  reciente:   'Más recientes',
  antiguo:    'Más antiguos',
  expediente: 'N° expediente',
  titulo_az:  'Título A → Z',
  titulo_za:  'Título Z → A',
}

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

  const [query, setQuery]         = useState(() => searchParams.get('q') || '')
  const [categoria, setCategoria] = useState(() => searchParams.get('categoria') || '')
  const [periodo, setPeriodo]     = useState('')
  const [orden, setOrden]         = useState('reciente')
  const [estado, setEstado]       = useState(() => searchParams.get('estado') || '')
  const [pagina, setPagina]       = useState(1)

  const [proyectos, setProyectos]   = useState<ProyectoResumen[]>([])
  const [paginacion, setPaginacion] = useState<Paginacion | null>(null)
  const [loading, setLoading]       = useState(true)
  const [categorias, setCategorias] = useState<Categoria[]>([])

  // Load categories once.
  useEffect(() => {
    let cancelled = false
    queueMicrotask(async () => {
      try {
        const r = await api.categorias.listar()
        if (!cancelled) setCategorias(r.datos)
      } catch { /* noop */ }
    })
    return () => { cancelled = true }
  }, [])

  // Combined fetch — debounce only for query changes, immediate for filters/pagination.
  const prevFiltersRef = useRef({ query, categoria, periodo, orden, estado, pagina })
  useEffect(() => {
    const prev = prevFiltersRef.current
    const onlyQueryChanged =
      prev.query !== query &&
      prev.categoria === categoria &&
      prev.periodo === periodo &&
      prev.orden === orden &&
      prev.estado === estado &&
      prev.pagina === pagina
    prevFiltersRef.current = { query, categoria, periodo, orden, estado, pagina }

    const delay = onlyQueryChanged ? 350 : 0
    let cancelled = false
    const timer = setTimeout(async () => {
      if (cancelled) return
      setLoading(true)
      try {
        const periodObj = getPeriodos().find(p => p.label === periodo)
        const desde = periodObj?.desde()
        const allPeriods = getAllLegislativePeriods()
        const legPeriod = allPeriods.find(p => p.label === periodo)

        let result
        if (query.trim()) {
          result = await api.proyectos.buscar(
            query.trim(), pagina,
            legPeriod?.desde || desde, legPeriod?.hasta,
          )
        } else {
          result = await api.proyectos.list({
            pagina,
            por_pagina: POR_PAGINA,
            desde: legPeriod?.desde || desde,
            hasta: legPeriod?.hasta,
            estado: estado || undefined,
            orden,
            categoria: categoria || undefined,
          })
        }
        if (cancelled) return
        setProyectos(result.datos)
        setPaginacion(result.paginacion)
      } catch {
        if (!cancelled) {
          setProyectos([])
          setPaginacion(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, delay)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [query, categoria, periodo, orden, estado, pagina])

  // Filter change handlers reset pagination to page 1 up-front.
  const onQueryChange = (v: string) => { setPagina(1); setQuery(v) }
  const onCategoriaChange = (v: string) => { setPagina(1); setCategoria(v) }
  const onPeriodoChange = (v: string) => { setPagina(1); setPeriodo(v) }
  const onOrdenChange = (v: string) => { setPagina(1); setOrden(v) }
  const onEstadoChange = (v: string) => { setPagina(1); setEstado(v) }

  const clearFilters = () => {
    setQuery(''); setCategoria(''); setPeriodo('')
    setOrden('reciente'); setEstado(''); setPagina(1)
  }

  const hasFilters = !!(query || categoria || periodo || estado || orden !== 'reciente')

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
              type="search"
              inputMode="search"
              enterKeyHint="search"
              aria-label="Buscar proyectos de ley"
              placeholder="Buscá por título, número de expediente o tema…"
              value={query}
              onChange={e => onQueryChange(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button className={styles.searchClear} onClick={() => onQueryChange('')} aria-label="Limpiar búsqueda">
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
              onChange={onCategoriaChange}
              placeholder="Todos los temas"
              options={[
                { value: '', label: 'Todos los temas' },
                ...categorias.map(c => ({ value: c.slug, label: c.nombre })),
              ]}
            />
            <FilterPill
              value={periodo}
              onChange={onPeriodoChange}
              placeholder="Cualquier período"
              options={[
                { value: '', label: 'Cualquier período' },
                ...getPeriodos().map(p => ({ value: p.label, label: p.label })),
                ...getAllLegislativePeriods().map(p => ({ value: p.label, label: p.label })),
              ]}
            />
            <FilterPill
              value={estado}
              onChange={onEstadoChange}
              placeholder="Todos los estados"
              active={!!estado}
              options={ESTADO_FILTROS}
            />
            <FilterPill
              value={orden}
              onChange={onOrdenChange}
              placeholder="Más recientes"
              active={orden !== 'reciente'}
              options={[
                { value: 'reciente',   label: 'Más recientes' },
                { value: 'antiguo',    label: 'Más antiguos' },
                { value: 'expediente', label: 'N° expediente' },
                { value: 'titulo_az',  label: 'Título A → Z' },
                { value: 'titulo_za',  label: 'Título Z → A' },
              ]}
            />
          </div>

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
            </p>

            {/* Active filter chips — one per active filter */}
            {hasFilters && (
              <div className={styles.activeChips}>
                {query && (
                  <span className={styles.chip}>
                    &ldquo;{query}&rdquo;
                    <button onClick={() => onQueryChange('')} aria-label="Quitar búsqueda"><IconX /></button>
                  </span>
                )}
                {categoria && (
                  <span className={styles.chip}>
                    {categorias.find(c => c.slug === categoria)?.nombre ?? categoria}
                    <button onClick={() => onCategoriaChange('')} aria-label="Quitar tema"><IconX /></button>
                  </span>
                )}
                {periodo && (
                  <span className={styles.chip}>
                    {periodo}
                    <button onClick={() => onPeriodoChange('')} aria-label="Quitar período"><IconX /></button>
                  </span>
                )}
                {estado && (
                  <span className={styles.chip}>
                    {ESTADO_FILTROS.find(e => e.value === estado)?.label ?? estado}
                    <button onClick={() => onEstadoChange('')} aria-label="Quitar filtro de estado"><IconX /></button>
                  </span>
                )}
                {orden !== 'reciente' && (
                  <span className={styles.chip}>
                    {ORDEN_LABELS[orden] ?? orden}
                    <button onClick={() => onOrdenChange('reciente')} aria-label="Quitar orden"><IconX /></button>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Cards */}
          {loading ? (
            <div className={styles.list}>
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} />)}
            </div>
          ) : proyectos.length === 0 ? (
            <EmptyState
              title="Sin resultados"
              description="Intentá con otros filtros o una búsqueda diferente."
              actions={
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              }
            />
          ) : (
            <div className={styles.list}>
              {proyectos.map(p => <ProyectoCard key={p.id} p={p} />)}
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
