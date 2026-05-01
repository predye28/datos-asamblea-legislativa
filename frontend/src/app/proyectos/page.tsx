'use client'

import { useState, useEffect, useRef, Suspense, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { api } from '@/lib/api'
import type { ProyectoResumen, Categoria, Paginacion } from '@/lib/api'
import { formatTitle, formatDate, formatQuantity } from '@/lib/utils'
import { getPeriodos, useLegislativePeriods } from '@/lib/periodos'
import { getEstadoFiltros } from '@/lib/estados'
import { useT } from '@/i18n/LanguageProvider'
import styles from './proyectos.module.css'
import FilterPill from '@/components/ui/FilterPill'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { EstadoChip } from '@/components/ui/EstadoChip'

const POR_PAGINA = 10

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

// Tipos de expediente — son nombres oficiales del SIL. Mantenemos las versiones
// abreviadas (que son nuestras) traducibles, y caemos al texto crudo si no
// reconocemos el tipo.
const TIPO_MAP_ES: Record<string, string> = {
  'PROCEDIMIENTO PROYECTO DE LEY ORDINARIO': 'Ley ordinaria',
  'PROCEDIMIENTO PROYECTOS DE COMISION DE HONORES': 'Comisión de honores',
  'PROCEDIMIENTO REFORMAS AL REGLAMENTO DE LA ASAMBLEA LEGISLATIVA': 'Reforma al reglamento',
  'PROCEDIMIENTO COMISIONES ESPECIALES INVESTIGADORAS': 'Comisión investigadora',
  'PROCEDIMIENTO DE NOMBRAMIENTOS / RATIFICACIONES / REELECCIONES': 'Nombramiento / Ratificación',
  'PROCEDIMIENTO QUERELLAS DE LOS MIEMBROS DE LOS SUPREMOS PODERES': 'Querella',
}

const TIPO_MAP_EN: Record<string, string> = {
  'PROCEDIMIENTO PROYECTO DE LEY ORDINARIO': 'Ordinary law',
  'PROCEDIMIENTO PROYECTOS DE COMISION DE HONORES': 'Honors commission',
  'PROCEDIMIENTO REFORMAS AL REGLAMENTO DE LA ASAMBLEA LEGISLATIVA': 'Rules of procedure reform',
  'PROCEDIMIENTO COMISIONES ESPECIALES INVESTIGADORAS': 'Investigative commission',
  'PROCEDIMIENTO DE NOMBRAMIENTOS / RATIFICACIONES / REELECCIONES': 'Appointment / Ratification',
  'PROCEDIMIENTO QUERELLAS DE LOS MIEMBROS DE LOS SUPREMOS PODERES': 'Complaint',
}

function abbreviateTipo(tipo: string, lang: 'es' | 'en'): string {
  const clean = tipo.trim().toUpperCase()
  const map = lang === 'en' ? TIPO_MAP_EN : TIPO_MAP_ES
  if (map[clean]) return map[clean]
  const stripped = clean.replace(/^PROCEDIMIENTO\s+(DE\s+)?/, '')
  return stripped.charAt(0) + stripped.slice(1).toLowerCase()
}

function ProyectoCard({ p }: { p: ProyectoResumen }) {
  const { dict, lang } = useT()
  const isLey = p.es_ley
  return (
    <Link href={`/proyecto/${p.numero_expediente}`} className={`${styles.card} ${isLey ? styles.cardLey : ''}`}>
      <div className={styles.cardAccent} />

      <div className={styles.cardBody}>
        <div className={styles.cardTop}>
          <span className={styles.expediente}>{dict.proyectosPage.expedientePrefix} {p.numero_expediente}</span>
          <EstadoChip
            estadoActual={p.estado_actual}
            estadoGrupo={p.estado_grupo}
            esLey={isLey}
            numeroLey={p.numero_ley}
            size="sm"
          />
        </div>

        {/* Nombre del expediente — NO se traduce (es nombre legal oficial) */}
        <h2 className={styles.cardTitle}>{formatTitle(p.titulo, dict.estado.sinTitulo)}</h2>

        <div className={styles.cardMeta}>
          {p.tipo_expediente && (
            <span className={styles.metaTipo}>{abbreviateTipo(p.tipo_expediente, lang)}</span>
          )}
          {p.fecha_inicio && (
            <>
              <span className={styles.metaSep} aria-hidden>·</span>
              <span className={styles.metaStat}>{formatDate(p.fecha_inicio, dict.common.locale)}</span>
            </>
          )}
          <span className={styles.metaSep} aria-hidden>·</span>
          <span className={styles.metaStat}>
            {formatQuantity(p.total_proponentes, dict.proyectosPage.proponenteSingular, dict.proyectosPage.proponentePlural)}
          </span>
          <span className={styles.metaSep} aria-hidden>·</span>
          <span className={styles.metaStat}>
            {formatQuantity(p.total_tramites, dict.proyectosPage.tramiteSingular, dict.proyectosPage.tramitePlural)}
          </span>
        </div>

        {/* Categorías — vienen del SIL, NO se traducen */}
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

function Skeleton() {
  return (
    <div className={styles.skeleton}>
      <div className={`${styles.skLine} ${styles.skShort}`} />
      <div className={`${styles.skLine} ${styles.skLong}`} />
      <div className={`${styles.skLine} ${styles.skMid}`} />
    </div>
  )
}

function ProyectosContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { dict } = useT()

  const ordenLabels = useMemo<Record<string, string>>(() => ({
    reciente:   dict.proyectosPage.masRecientes,
    antiguo:    dict.proyectosPage.masAntiguos,
    expediente: dict.proyectosPage.numExpediente,
    titulo_az:  dict.proyectosPage.tituloAZ,
    titulo_za:  dict.proyectosPage.tituloZA,
  }), [dict])

  const estadoFiltros = useMemo(() => getEstadoFiltros(dict), [dict])

  const [query, setQuery]         = useState(() => searchParams.get('q') || '')
  const [categoria, setCategoria] = useState(() => searchParams.get('categoria') || '')
  const [periodo, setPeriodo]     = useState(() => searchParams.get('periodo') || '')
  const [orden, setOrden]         = useState(() => searchParams.get('orden') || 'reciente')
  const [estado, setEstado]       = useState(() => searchParams.get('estado') || '')
  const [pagina, setPagina]       = useState(() => {
    const p = parseInt(searchParams.get('pagina') || '1', 10)
    return Number.isFinite(p) && p >= 1 ? p : 1
  })

  const [proyectos, setProyectos]   = useState<ProyectoResumen[]>([])
  const [paginacion, setPaginacion] = useState<Paginacion | null>(null)
  const [loading, setLoading]       = useState(true)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  // Se activa cuando termina la primera carga, para que la animación de la
  // barra de filtros se ejecute justo cuando el usuario está mirando el
  // contenido (no antes, mientras todavía hay skeleton).
  const [filtersAnimated, setFiltersAnimated] = useState(false)
  const legislativePeriods = useLegislativePeriods()

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

  // Dispara la animación de la barra de filtros una sola vez, cuando termina
  // la primera carga de proyectos. Un pequeño retardo asegura que el
  // contenido ya esté visible antes del "reveal".
  useEffect(() => {
    if (!loading && !filtersAnimated) {
      const t = setTimeout(() => setFiltersAnimated(true), 120)
      return () => clearTimeout(t)
    }
  }, [loading, filtersAnimated])

  useEffect(() => {
    const qs = new URLSearchParams()
    if (query)              qs.set('q', query)
    if (categoria)          qs.set('categoria', categoria)
    if (periodo)            qs.set('periodo', periodo)
    if (estado)             qs.set('estado', estado)
    if (orden !== 'reciente') qs.set('orden', orden)
    if (pagina > 1)         qs.set('pagina', String(pagina))
    const next = qs.toString()
    const current = searchParams.toString()
    if (next !== current) {
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false })
    }
  }, [query, categoria, periodo, orden, estado, pagina, pathname, router, searchParams])

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
        const legPeriod = legislativePeriods.find(p => p.label === periodo)

        const trimmedQuery = query.trim()
        let result
        if (trimmedQuery.length >= 2) {
          result = await api.proyectos.buscar(
            trimmedQuery, pagina,
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
  }, [query, categoria, periodo, orden, estado, pagina, legislativePeriods])

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
    ? `${paginacion.total.toLocaleString(dict.common.locale)} ${paginacion.total !== 1 ? dict.proyectosPage.proyectoPlural : dict.proyectosPage.proyectoSingular}`
    : ''

  return (
    <div className={styles.page}>

      <section className={styles.hero}>
        <div className={styles.heroDots} aria-hidden />
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <span className={styles.heroEyebrow}>{dict.proyectosPage.heroEyebrow}</span>
            <h1 className={styles.heroTitle}>{dict.proyectos.pageTitle}</h1>
            <p className={styles.heroDesc}>
              {dict.proyectosPage.heroDescPrefix} {paginacion ? paginacion.total.toLocaleString(dict.common.locale) : '…'} {dict.proyectosPage.heroDescSuffix}
            </p>
          </div>

          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}><IconSearch /></span>
            <input
              className={styles.searchInput}
              type="search"
              inputMode="search"
              enterKeyHint="search"
              aria-label={dict.proyectosPage.searchAria}
              placeholder={dict.proyectosPage.searchPlaceholder}
              value={query}
              onChange={e => onQueryChange(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button className={styles.searchClear} onClick={() => onQueryChange('')} aria-label={dict.proyectosPage.clearSearchAria}>
                <IconX />
              </button>
            )}
          </div>
        </div>
      </section>

      <div className={`${styles.filtersBar} ${filtersAnimated ? styles.filtersBarReady : ''}`}>
        <div className={styles.filtersInner}>
          <span className={styles.filtersLabel}><IconFilter /> {dict.proyectosPage.filtersLabel}</span>

          <div className={styles.selects}>
            <FilterPill
              value={categoria}
              onChange={onCategoriaChange}
              placeholder={dict.proyectosPage.todosTemas}
              options={[
                { value: '', label: dict.proyectosPage.todosTemas },
                ...categorias.map(c => ({ value: c.slug, label: c.nombre })),
              ]}
            />
            <FilterPill
              value={periodo}
              onChange={onPeriodoChange}
              placeholder={dict.proyectosPage.cualquierPeriodo}
              options={[
                { value: '', label: dict.proyectosPage.cualquierPeriodo },
                ...getPeriodos().map(p => ({ value: p.label, label: p.label })),
                ...legislativePeriods.map(p => ({ value: p.label, label: p.label })),
              ]}
            />
            <FilterPill
              value={estado}
              onChange={onEstadoChange}
              placeholder={dict.proyectosPage.todosEstados}
              active={!!estado}
              options={estadoFiltros}
            />
            <FilterPill
              value={orden}
              onChange={onOrdenChange}
              placeholder={dict.proyectosPage.masRecientes}
              active={orden !== 'reciente'}
              options={[
                { value: 'reciente',   label: dict.proyectosPage.masRecientes },
                { value: 'antiguo',    label: dict.proyectosPage.masAntiguos },
                { value: 'expediente', label: dict.proyectosPage.numExpediente },
                { value: 'titulo_az',  label: dict.proyectosPage.tituloAZ },
                { value: 'titulo_za',  label: dict.proyectosPage.tituloZA },
              ]}
            />
          </div>

          {hasFilters && (
            <button className={styles.clearBtn} onClick={clearFilters}>
              <IconX /> {dict.proyectosPage.limpiar}
            </button>
          )}
        </div>
      </div>

      <div className={styles.main}>
        <div className={styles.container}>

          <div className={styles.resultsRow}>
            <p className={styles.resultsCount}>
              {loading ? dict.proyectosPage.buscando : totalStr}
            </p>

            {hasFilters && (
              <div className={styles.activeChips}>
                {query && (
                  <span className={styles.chip}>
                    &ldquo;{query}&rdquo;
                    <button onClick={() => onQueryChange('')} aria-label={dict.proyectosPage.quitarBusqueda}><IconX /></button>
                  </span>
                )}
                {categoria && (
                  <span className={styles.chip}>
                    {categorias.find(c => c.slug === categoria)?.nombre ?? categoria}
                    <button onClick={() => onCategoriaChange('')} aria-label={dict.proyectosPage.quitarTema}><IconX /></button>
                  </span>
                )}
                {periodo && (
                  <span className={styles.chip}>
                    {periodo}
                    <button onClick={() => onPeriodoChange('')} aria-label={dict.proyectosPage.quitarPeriodo}><IconX /></button>
                  </span>
                )}
                {estado && (
                  <span className={styles.chip}>
                    {estadoFiltros.find(e => e.value === estado)?.label ?? estado}
                    <button onClick={() => onEstadoChange('')} aria-label={dict.proyectosPage.quitarEstado}><IconX /></button>
                  </span>
                )}
                {orden !== 'reciente' && (
                  <span className={styles.chip}>
                    {ordenLabels[orden] ?? orden}
                    <button onClick={() => onOrdenChange('reciente')} aria-label={dict.proyectosPage.quitarOrden}><IconX /></button>
                  </span>
                )}
              </div>
            )}
          </div>

          {loading ? (
            <div className={styles.list}>
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} />)}
            </div>
          ) : proyectos.length === 0 ? (
            <EmptyState
              title={dict.proyectosPage.sinResultadosTitle}
              description={dict.proyectosPage.sinResultadosDesc}
              actions={
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  {dict.proyectosPage.limpiarFiltros}
                </Button>
              }
            />
          ) : (
            <div className={styles.list}>
              {proyectos.map(p => <ProyectoCard key={p.id} p={p} />)}
            </div>
          )}

          {paginacion && paginacion.total_paginas > 1 && !loading && (
            <div className={styles.pagination}>
              <Button
                variant="secondary"
                size="sm"
                disabled={pagina <= 1}
                onClick={() => { setPagina(1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                aria-label={dict.proyectosPage.primeraPaginaAria}
                title={dict.proyectosPage.primeraPaginaTitle}
              >«</Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={pagina <= 1}
                onClick={() => { setPagina(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              >{dict.proyectosPage.paginaAnterior}</Button>

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
              >{dict.proyectosPage.paginaSiguiente}</Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={pagina >= paginacion.total_paginas}
                onClick={() => { setPagina(paginacion.total_paginas); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                aria-label={dict.proyectosPage.ultimaPaginaAria}
                title={dict.proyectosPage.ultimaPaginaTitle}
              >»</Button>
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
