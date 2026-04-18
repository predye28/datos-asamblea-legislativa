'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { DiputadoRanking } from '@/lib/api'
import { getAllLegislativePeriods, getPeriodos } from '@/lib/periodos'
import { formatName } from '@/lib/utils'
import styles from './diputados.module.css'
import FilterPill from '@/components/ui/FilterPill'

// ── Icons ─────────────────────────────────────────────────────────────────────

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

// ── Rank badge helper ─────────────────────────────────────────────────────────

function rankClass(i: number) {
  if (i === 0) return styles.rankGold
  if (i === 1) return styles.rankSilver
  if (i === 2) return styles.rankBronze
  return styles.rankPlain
}

// ── Diputado card ─────────────────────────────────────────────────────────────

function DiputadoCard({ d, index, max }: { d: DiputadoRanking; index: number; max: number }) {
  const pct = max > 0 ? (d.total_proyectos / max) * 100 : 0
  const slug = encodeURIComponent(d.nombre_completo)

  return (
    <Link href={`/diputados/${slug}`} className={styles.card}>
      {/* Rank */}
      <div className={`${styles.rank} ${rankClass(index)}`}>
        {index + 1}
      </div>

      {/* Body */}
      <div className={styles.cardBody}>
        <p className={styles.cardName}>{formatName(d.nombre_completo)}</p>
        <div className={styles.barRow}>
          <div className={styles.bar}>
            <div className={styles.barFill} style={{ width: `${pct}%` }} />
          </div>
          <span className={styles.barCount}>
            {d.total_proyectos} <span className={styles.barLabel}>{d.total_proyectos === 1 ? 'proyecto' : 'proyectos'}</span>
          </span>
        </div>
      </div>

      {/* Arrow */}
      <div className={styles.cardArrow} aria-hidden><IconChevron /></div>
    </Link>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DiputadosPage() {
  const [query, setQuery]     = useState('')
  const [periodo, setPeriodo] = useState('6 meses')
  const [orden, setOrden]     = useState('proyectos')

  const [data, setData]       = useState<DiputadoRanking[]>([])
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(10)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchData = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const allPeriods = getAllLegislativePeriods()
      const relPeriods = getPeriodos()
      const legPeriod = allPeriods.find(p => p.label === periodo)
      const relPeriod = relPeriods.find(p => p.label === periodo)
      const desde = legPeriod?.desde || relPeriod?.desde()
      const hasta = legPeriod?.hasta

      const result = await api.metricas.diputados({ desde, hasta, q: q.trim() || undefined })
      setData(result.datos)
    } catch {
      setData([])
    } finally {
      setLoading(false)
    }
  }, [periodo])

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchData(query), 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, fetchData])

  // Immediate on filter change
  useEffect(() => {
    fetchData(query)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo])

  const clearFilters = () => { setQuery(''); setPeriodo('6 meses'); setOrden('proyectos'); setVisible(10) }
  const hasFilters = query || periodo !== '6 meses' || orden !== 'proyectos'

  // Reset visible count when filters/data change
  useEffect(() => { setVisible(10) }, [data, orden])

  const sorted = [...data].sort((a, b) => {
    if (orden === 'az') return a.apellidos.localeCompare(b.apellidos)
    if (orden === 'za') return b.apellidos.localeCompare(a.apellidos)
    return b.total_proyectos - a.total_proyectos
  })

  const max = sorted[0]?.total_proyectos ?? 1

  const periodOptions = [
    { value: '', label: 'Cualquier período' },
    ...getPeriodos().map(p => ({ value: p.label, label: p.label })),
    ...getAllLegislativePeriods().map(p => ({ value: p.label, label: p.label })),
  ]

  return (
    <div className={styles.page}>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroDots} aria-hidden />
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <span className={styles.heroEyebrow}>Representantes del pueblo</span>
            <h1 className={styles.heroTitle}>Diputados</h1>
            <p className={styles.heroDesc}>
              Explorá la actividad legislativa de los {data.length > 0 ? data.length : '…'} diputados por número de proyectos presentados.
            </p>
          </div>

          {/* Search */}
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}><IconSearch /></span>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Buscá por nombre o apellido…"
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

          <FilterPill
            value={periodo}
            onChange={setPeriodo}
            placeholder="Cualquier período"
            options={periodOptions}
          />

          <FilterPill
            value={orden}
            onChange={setOrden}
            placeholder="Más proyectos"
            active={orden !== 'proyectos'}
            options={[
              { value: 'proyectos', label: 'Más proyectos' },
              { value: 'az', label: 'A → Z' },
              { value: 'za', label: 'Z → A' },
            ]}
          />

          {hasFilters && (
            <>
              <div className={styles.filtersSep} aria-hidden />
              <button className={styles.clearBtn} onClick={clearFilters}>
                <IconX /> Limpiar
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Results ── */}
      <div className={styles.main}>
        <div className={styles.container}>

          <div className={styles.resultsRow}>
            <p className={styles.resultsCount}>
              {loading
                ? 'Cargando…'
                : `${sorted.length.toLocaleString('es-CR')} diputado${sorted.length !== 1 ? 's' : ''}`}
              {!loading && periodo && (
                <span className={styles.activeFilter}> — {periodo}</span>
              )}
            </p>
          </div>

          {loading ? (
            <div className={styles.list}>
              {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} />)}
            </div>
          ) : sorted.length === 0 ? (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>Sin resultados</p>
              <p className={styles.emptyDesc}>Intentá con otro nombre o período diferente.</p>
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
                  <button className={styles.loadMoreBtn} onClick={() => setVisible(v => v + 10)}>
                    Ver más diputados ({sorted.length - visible} restantes)
                  </button>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  )
}
