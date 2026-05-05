'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { DiputadoRanking, PartidoResumen } from '@/lib/api'
import { getPaletaPartido, getBanderaUrl } from '@/lib/partidos'
import { useLegislativePeriods, getPeriodos, getDefaultLegislativePeriodLabel } from '@/lib/periodos'
import { formatDiputadoName } from '@/lib/utils'
import { DiputadoAvatar } from '@/components/ui/DiputadoAvatar'
import { useT } from '@/i18n/LanguageProvider'
import styles from './diputados.module.css'
import FilterPill from '@/components/ui/FilterPill'
import { Button } from '@/components/ui/Button'

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

function rankClass(i: number) {
  if (i === 0) return styles.rankGold
  if (i === 1) return styles.rankSilver
  if (i === 2) return styles.rankBronze
  return styles.rankPlain
}

function avatarHue(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360
  return h
}

function DiputadoCard({ d, index, max }: { d: DiputadoRanking; index: number; max: number }) {
  const { dict } = useT()
  const pct = max > 0 ? (d.total_proyectos / max) * 100 : 0
  const slug = encodeURIComponent(d.nombre_completo)
  const hue = avatarHue(d.nombre_completo)
  const isTop3 = index < 3
  const paleta = d.partido_codigo ? getPaletaPartido(d.partido_codigo) : null
  const banderaUrl = d.partido_codigo ? getBanderaUrl(d.partido_codigo) : null

  return (
    <Link href={`/diputados/${slug}`} className={styles.card}>
      <div className={styles.avatarWrap}>
        <DiputadoAvatar
          nombreCompleto={d.nombre_completo}
          size="md"
          partyColor={paleta?.bg}
          hue={hue}
        />
        <div className={`${styles.rankBadge} ${rankClass(index)}`}>
          {isTop3 ? (index === 0 ? '1º' : index === 1 ? '2º' : '3º') : `#${index + 1}`}
        </div>
      </div>

      <div className={styles.cardBody}>
        <p className={styles.cardName}>
          {/* Nombre del diputado — NO se traduce */}
          <span className={styles.cardSurname}>{formatDiputadoName(d.nombre_completo)}</span>
        </p>
        {d.partido_nombre && paleta && (
          <span className={styles.partidoBadge} style={{ background: paleta.soft, color: paleta.bg, borderColor: paleta.border }}>
            {banderaUrl && <img src={banderaUrl} alt="" className={styles.partidoBandera} aria-hidden />}
            {d.partido_nombre}
          </span>
        )}
        <div className={styles.barRow}>
          <div className={styles.bar}>
            <div className={styles.barFill} style={{ width: `${pct}%`, background: paleta?.bg }} />
          </div>
        </div>
      </div>

      <div className={styles.cardCount}>
        <strong>{d.total_proyectos}</strong>
        <span>{d.total_proyectos === 1 ? dict.diputadosPage.proyectoSingular : dict.diputadosPage.proyectoPlural}</span>
      </div>

      <div className={styles.cardArrow} aria-hidden><IconChevron /></div>
    </Link>
  )
}

function Skeleton() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.skBox} />
      <div className={styles.skBody}>
        <div className={`${styles.skLine} ${styles.skName}`} />
        <div className={`${styles.skLine} ${styles.skBar}`} />
      </div>
    </div>
  )
}

export default function DiputadosPage() {
  const { dict } = useT()
  const [query, setQuery]     = useState('')
  const DEFAULT_PERIOD = getDefaultLegislativePeriodLabel()
  const [periodo, setPeriodo] = useState(DEFAULT_PERIOD)
  const [orden, setOrden]     = useState('proyectos')
  const [partido, setPartido] = useState('')

  const [data, setData]       = useState<DiputadoRanking[]>([])
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(10)
  const [partidos, setPartidos] = useState<PartidoResumen[]>([])
  // Los filtros se muestran inmediatamente, sin esperar la primera carga.
  const [filtersAnimated, setFiltersAnimated] = useState(true)
  // Panel de filtros colapsable en móvil
  const [filtersOpen, setFiltersOpen] = useState(false)
  const legislativePeriods = useLegislativePeriods()

  // Cargar partidos disponibles según el período seleccionado (filtro inteligente)
  useEffect(() => {
    let cancelled = false
    const legPeriod = legislativePeriods.find(p => p.label === periodo)
    const administracion = legPeriod ? periodo : undefined
    queueMicrotask(async () => {
      try {
        const r = await api.partidos.listar(administracion)
        if (!cancelled) {
          setPartidos(r.datos)
          // Si el partido seleccionado no existe en el nuevo período, lo limpiamos
          if (partido && !r.datos.some(p => String(p.id) === partido)) {
            setPartido('')
          }
        }
      } catch { /* noop */ }
    })
    return () => { cancelled = true }
  }, [periodo, legislativePeriods, partido])

  const prevFiltersRef = useRef({ query, periodo, partido })
  useEffect(() => {
    const prev = prevFiltersRef.current
    const onlyQueryChanged =
      prev.query !== query &&
      prev.periodo === periodo &&
      prev.partido === partido
    prevFiltersRef.current = { query, periodo, partido }
    const delay = onlyQueryChanged ? 350 : 0

    let cancelled = false
    const timer = setTimeout(async () => {
      if (cancelled) return
      setLoading(true)
      try {
        const relPeriods = getPeriodos()
        const legPeriod = legislativePeriods.find(p => p.label === periodo)
        const relPeriod = relPeriods.find(p => p.label === periodo)
        const desde = legPeriod?.desde || relPeriod?.desde()
        const hasta = legPeriod?.hasta
        const partidoId = partido ? parseInt(partido, 10) : undefined

        const result = await api.metricas.diputados({
          desde, hasta, q: query.trim() || undefined, partido_id: partidoId,
        })
        if (cancelled) return
        setData(result.datos)
        setVisible(10)
      } catch {
        if (!cancelled) setData([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, delay)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, periodo, partido, legislativePeriods])

  const onOrdenChange = (v: string) => { setOrden(v); setVisible(10) }
  const onPeriodoChange = (v: string) => { setPeriodo(v); setPartido(''); setVisible(10) }
  const onPartidoChange = (v: string) => { setPartido(v); setVisible(10) }

  const clearFilters = () => {
    setQuery(''); setPeriodo(DEFAULT_PERIOD); setOrden('proyectos'); setPartido(''); setVisible(10)
  }
  const hasFilters = query || periodo !== DEFAULT_PERIOD || orden !== 'proyectos' || partido
  const activeFiltersCount = [periodo !== DEFAULT_PERIOD ? periodo : '', orden !== 'proyectos' ? orden : '', partido].filter(Boolean).length

  const partidoOptions = useMemo(() => [
    { value: '', label: 'Todos los partidos' },
    ...partidos.map(p => {
      const paleta = getPaletaPartido(p.codigo)
      return { value: String(p.id), label: p.nombre, color: paleta.bg }
    }),
  ], [partidos])

  const max = data.length > 0 ? Math.max(...data.map(d => d.total_proyectos)) : 1

  const sorted = useMemo(() => {
    const arr = [...data]
    arr.sort((a, b) => {
      if (orden === 'az') return (a.nombre_completo || '').localeCompare(b.nombre_completo || '')
      if (orden === 'za') return (b.nombre_completo || '').localeCompare(a.nombre_completo || '')
      return b.total_proyectos - a.total_proyectos
    })
    return arr
  }, [data, orden])

  const periodOptions = [
    { value: '', label: dict.diputadosPage.cualquierPeriodo },
    ...getPeriodos().map(p => ({ value: p.label, label: p.label })),
    ...legislativePeriods.map(p => ({ value: p.label, label: p.label })),
  ]

  return (
    <div className={styles.page}>

      <section className={styles.hero}>
        <div className={styles.heroDots} aria-hidden />
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <span className={styles.heroEyebrow}>{dict.diputadosPage.heroEyebrow}</span>
            <h1 className={styles.heroTitle}>{dict.diputados.pageTitle}</h1>
            <p className={styles.heroDesc}>
              {dict.diputadosPage.heroDescPrefix} {data.length > 0 ? data.length : '…'} {dict.diputadosPage.heroDescSuffix}
            </p>
          </div>

          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}><IconSearch /></span>
            <input
              className={styles.searchInput}
              type="search"
              inputMode="search"
              enterKeyHint="search"
              aria-label={dict.diputadosPage.searchAria}
              placeholder={dict.diputadosPage.searchPlaceholder}
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button className={styles.searchClear} onClick={() => setQuery('')} aria-label={dict.diputadosPage.clearSearchAria}>
                <IconX />
              </button>
            )}
          </div>
        </div>
      </section>

      <div className={`${styles.filtersBar} ${filtersAnimated ? styles.filtersBarReady : ''}`}>
        {/* ── Vista móvil: toggle compacto ── */}
        <div className={styles.filtersMobileHeader}>
          <button
            className={`${styles.filtersMobileToggle} ${filtersOpen ? styles.filtersMobileToggleOpen : ''}`}
            onClick={() => setFiltersOpen(v => !v)}
            aria-expanded={filtersOpen}
          >
            <span className={styles.filtersMobileIcon}><IconFilter /></span>
            {activeFiltersCount > 0 && (
              <span className={styles.filtersBadge}>{activeFiltersCount}</span>
            )}
            <span>{filtersOpen ? 'Cerrar' : 'Filtros'}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: filtersOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>
          {hasFilters && (
            <button className={styles.filtersMobileClear} onClick={clearFilters}>
              <IconX /> {dict.diputadosPage.limpiar}
            </button>
          )}
        </div>

        {/* Panel expandido en móvil */}
        {filtersOpen && (
          <div className={styles.filtersMobilePanel}>
            <FilterPill
              value={periodo}
              onChange={onPeriodoChange}
              placeholder={dict.diputadosPage.cualquierPeriodo}
              options={periodOptions}
            />
            {partidos.length > 0 && (
              <FilterPill
                value={partido}
                onChange={onPartidoChange}
                placeholder="Todos los partidos"
                active={!!partido}
                options={partidoOptions}
              />
            )}
            <FilterPill
              value={orden}
              onChange={onOrdenChange}
              placeholder={dict.diputadosPage.masProyectos}
              active={orden !== 'proyectos'}
              options={[
                { value: 'proyectos', label: dict.diputadosPage.masProyectos },
                { value: 'az', label: dict.diputadosPage.az },
                { value: 'za', label: dict.diputadosPage.za },
              ]}
            />
          </div>
        )}

        {/* ── Vista escritorio: fila inline ── */}
        <div className={styles.filtersInner}>
          <span className={styles.filtersLabel}><IconFilter /></span>

          <FilterPill
            value={periodo}
            onChange={onPeriodoChange}
            placeholder={dict.diputadosPage.cualquierPeriodo}
            options={periodOptions}
          />

          {partidos.length > 0 && (
            <FilterPill
              value={partido}
              onChange={onPartidoChange}
              placeholder="Todos los partidos"
              active={!!partido}
              options={partidoOptions}
            />
          )}

          <FilterPill
            value={orden}
            onChange={onOrdenChange}
            placeholder={dict.diputadosPage.masProyectos}
            active={orden !== 'proyectos'}
            options={[
              { value: 'proyectos', label: dict.diputadosPage.masProyectos },
              { value: 'az', label: dict.diputadosPage.az },
              { value: 'za', label: dict.diputadosPage.za },
            ]}
          />

          {hasFilters && (
            <>
              <div className={styles.filtersSep} aria-hidden />
              <Button variant="ghost" size="sm" onClick={clearFilters} leftIcon={<IconX />}>
                {dict.diputadosPage.limpiar}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className={styles.main}>
        <div className={styles.container}>

          <div className={styles.resultsRow}>
            <p className={styles.resultsCount}>
              {loading
                ? dict.diputadosPage.cargando
                : `${sorted.length.toLocaleString(dict.common.locale)} ${sorted.length !== 1 ? dict.diputadosPage.diputadoPlural : dict.diputadosPage.diputadoSingular}`}
            </p>

            <div className={styles.activeChips}>
              <span className={styles.chip}>
                {periodo || dict.diputadosPage.cualquierPeriodo}
                {periodo !== DEFAULT_PERIOD && (
                  <button onClick={() => onPeriodoChange(DEFAULT_PERIOD)} aria-label={dict.diputadosPage.volverA6Meses}><IconX /></button>
                )}
              </span>

              {query && (
                <span className={styles.chip}>
                  &ldquo;{query}&rdquo;
                  <button onClick={() => setQuery('')} aria-label={dict.diputadosPage.quitarBusqueda}><IconX /></button>
                </span>
              )}
              {orden !== 'proyectos' && (
                <span className={styles.chip}>
                  {orden === 'az' ? dict.diputadosPage.az : dict.diputadosPage.za}
                  <button onClick={() => onOrdenChange('proyectos')} aria-label={dict.diputadosPage.quitarOrden}><IconX /></button>
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className={styles.list}>
              {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} />)}
            </div>
          ) : sorted.length === 0 ? (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>{dict.diputadosPage.sinResultadosTitle}</p>
              <p className={styles.emptyDesc}>{dict.diputadosPage.sinResultadosDesc}</p>
            </div>
          ) : (
            <>
              <div className={styles.list}>
                {sorted.slice(0, visible).map((d, i) => (
                  <DiputadoCard key={d.nombre_completo} d={d} index={i} max={max} />
                ))}
              </div>
              {visible < sorted.length && (
                <div className={styles.loadMoreRow}>
                  <Button variant="secondary" onClick={() => setVisible(v => v + 10)}>
                    {dict.diputadosPage.verMasPrefix} ({dict.diputadosPage.verMasRestantes(sorted.length - visible)})
                  </Button>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  )
}
