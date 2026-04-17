'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { MetricasResponse } from '@/lib/api'
import { getAllLegislativePeriods, getPeriodos } from '@/lib/periodos'
import { formatTitle } from '@/lib/utils'
import styles from './estadisticas.module.css'
import FilterPill from '@/components/ui/FilterPill'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toLocaleString('es-CR') }
function fmtPct(n: number) { return `${n.toFixed(1)}%` }

function rankBadgeClass(i: number) {
  if (i === 0) return styles.rankBadgeGold
  if (i === 1) return styles.rankBadgeSilver
  if (i === 2) return styles.rankBadgeBronze
  return styles.rankBadgePlain
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonPage() {
  return (
    <div className={styles.main}>
      <div className={styles.container}>
        <div className={styles.skKpiGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skKpi}>
              <div className={`${styles.skLine} ${styles.skShort}`} />
              <div className={`${styles.skLine} ${styles.skBig}`} />
              <div className={`${styles.skLine} ${styles.skMid}`} />
              <div className={`${styles.skLine} ${styles.skShort}`} />
            </div>
          ))}
        </div>
        <div className={styles.cols2}>
          {[0, 1].map(i => (
            <div key={i} className={styles.skPanel}>
              {Array.from({ length: 6 }).map((_, j) => (
                <div key={j} className={styles.skLine} style={{ width: `${90 - j * 10}%` }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EstadisticasPage() {
  const [periodo, setPeriodo] = useState('')
  const [data, setData]       = useState<MetricasResponse | null>(null)
  const [timeline, setTimeline] = useState<{ anio: number; leyes_aprobadas: number }[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const allPeriods = getAllLegislativePeriods()
      const relPeriods = getPeriodos()
      const legPeriod = allPeriods.find(p => p.label === periodo)
      const relPeriod = relPeriods.find(p => p.label === periodo)
      const desde = legPeriod?.desde || relPeriod?.desde()
      const hasta = legPeriod?.hasta

      const [metricas, tl] = await Promise.all([
        api.metricas.general({ desde, hasta }),
        api.metricas.lineaTiempo(),
      ])
      setData(metricas)
      setTimeline(tl.datos)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [periodo])

  useEffect(() => { fetchData() }, [fetchData])

  const periodOptions = [
    { value: '', label: 'Histórico' },
    ...getPeriodos().map(p => ({ value: p.label, label: p.label })),
    ...getAllLegislativePeriods().map(p => ({ value: p.label, label: p.label })),
  ]

  const g = data?.general
  const categorias = data?.por_categoria ?? []
  const topDip = data?.top_diputados ?? []
  const topEfic = data?.top_diputados_eficacia ?? []
  const tipos = data?.por_tipo ?? []
  const organos = data?.organos_activos ?? []

  const maxCat = categorias[0]?.total ?? 1
  const maxDip = topDip[0]?.total_proyectos ?? 1
  const maxTimeline = Math.max(...timeline.map(t => t.leyes_aprobadas), 1)
  const maxTipo = tipos[0]?.total ?? 1

  return (
    <div className={styles.page}>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroDots} aria-hidden />
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <span className={styles.heroEyebrow}>Datos legislativos</span>
            <h1 className={styles.heroTitle}>Estadísticas</h1>
            <p className={styles.heroDesc}>
              Métricas y tendencias de la actividad legislativa de Costa Rica desde 1949.
            </p>
          </div>
          <div className={styles.heroFilters}>
            <FilterPill
              value={periodo}
              onChange={setPeriodo}
              placeholder="Histórico"
              options={periodOptions}
            />
          </div>
        </div>
      </section>

      {/* ── Content ── */}
      {loading ? (
        <SkeletonPage />
      ) : !data ? (
        <div className={styles.main}>
          <div className={styles.container}>
            <p style={{ color: 'var(--ink-faint)', padding: '80px 0', textAlign: 'center' }}>
              No se pudieron cargar los datos.
            </p>
          </div>
        </div>
      ) : (
        <div className={styles.main}>
          <div className={styles.container}>

            {/* ── KPI grid ── */}
            <div className={styles.kpiGrid}>

              {/* Total proyectos */}
              <div className={styles.kpiCard} style={{ borderColor: 'rgba(20,184,166,0.2)' }}>
                <div className={styles.kpiCardAccent} style={{ background: 'linear-gradient(to right, var(--accent), transparent)' }} />
                <p className={styles.kpiEyebrow} style={{ color: 'var(--accent)' }}>EN TOTAL</p>
                <p className={styles.kpiBig} style={{ color: 'var(--accent)' }}>{fmt(g?.total_proyectos ?? 0)}</p>
                <p className={styles.kpiLabel}>Proyectos registrados</p>
                <p className={styles.kpiSub}>Desde 1949 hasta hoy</p>
              </div>

              {/* Leyes aprobadas */}
              <div className={styles.kpiCard} style={{ borderColor: 'rgba(34,197,94,0.2)' }}>
                <div className={styles.kpiCardAccent} style={{ background: 'linear-gradient(to right, var(--positive), transparent)' }} />
                <p className={styles.kpiEyebrow} style={{ color: 'var(--positive)' }}>APROBADAS</p>
                <p className={styles.kpiBig} style={{ color: 'var(--positive)' }}>{fmt(g?.total_leyes_aprobadas ?? 0)}</p>
                <p className={styles.kpiLabel}>Leyes vigentes</p>
                <p className={styles.kpiSub}>Cada una rige la vida del país</p>
              </div>

              {/* Tasa de aprobación */}
              <div className={styles.kpiCard} style={{ borderColor: 'rgba(212,168,67,0.2)' }}>
                <div className={styles.kpiCardAccent} style={{ background: 'linear-gradient(to right, var(--gold), transparent)' }} />
                <p className={styles.kpiEyebrow} style={{ color: 'var(--gold)' }}>TASA HISTÓRICA</p>
                <p className={styles.kpiBig} style={{ color: 'var(--gold)' }}>{fmtPct(g?.tasa_aprobacion_pct ?? 0)}</p>
                <p className={styles.kpiLabel}>De aprobación</p>
                <p className={styles.kpiSub}>Solo 1 de cada 7 proyectos lo logra</p>
              </div>

              {/* Tiempo promedio */}
              <div className={styles.kpiCard}>
                <div className={styles.kpiCardAccent} style={{ background: 'linear-gradient(to right, rgba(129,140,248,0.8), transparent)' }} />
                <p className={styles.kpiEyebrow} style={{ color: '#818CF8' }}>TIEMPO PROMEDIO</p>
                <p className={styles.kpiBig} style={{ color: '#818CF8' }}>
                  {g?.promedio_dias_aprobacion
                    ? `${(g.promedio_dias_aprobacion / 365).toFixed(1)} años`
                    : '—'}
                </p>
                <p className={styles.kpiLabel}>Para aprobar una ley</p>
                <p className={styles.kpiSub}>Más que un ciclo legislativo completo</p>
              </div>

              {/* Este mes */}
              <div className={styles.kpiCard}>
                <div className={styles.kpiCardAccent} style={{ background: 'linear-gradient(to right, rgba(20,184,166,0.5), transparent)' }} />
                <p className={styles.kpiEyebrow} style={{ color: 'var(--ink-faint)' }}>ESTE MES</p>
                <p className={styles.kpiBig} style={{ color: 'var(--ink)' }}>{fmt(g?.proyectos_este_mes ?? 0)}</p>
                <p className={styles.kpiLabel}>Nuevos proyectos</p>
                <p className={styles.kpiSub}>El congreso sesiona todo el año</p>
              </div>

              {/* Este año */}
              <div className={styles.kpiCard}>
                <div className={styles.kpiCardAccent} style={{ background: 'linear-gradient(to right, rgba(20,184,166,0.5), transparent)' }} />
                <p className={styles.kpiEyebrow} style={{ color: 'var(--ink-faint)' }}>ESTE AÑO</p>
                <p className={styles.kpiBig} style={{ color: 'var(--ink)' }}>{fmt(g?.proyectos_este_anio ?? 0)}</p>
                <p className={styles.kpiLabel}>Proyectos en {new Date().getFullYear()}</p>
                <p className={styles.kpiSub}>Ingresados desde enero</p>
              </div>

            </div>

            {/* ── Categories + Top diputados ── */}
            <div className={styles.cols2}>

              {/* Categories by volume */}
              <div className={styles.panel}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Temas más legislados</h2>
                  <span className={styles.sectionSub}>por volumen</span>
                </div>
                <div className={styles.barList}>
                  {categorias.slice(0, 10).map(c => (
                    <div key={c.slug}>
                      <div className={styles.barItem}>
                        <span className={styles.barItemLabel}>{formatTitle(c.categoria)}</span>
                        <span className={styles.barItemValue} style={{ color: 'var(--accent)' }}>{fmt(c.total)}</span>
                        <div className={styles.barItemTrack}>
                          <div
                            className={styles.barItemFill}
                            style={{
                              width: `${(c.total / maxCat) * 100}%`,
                              background: 'linear-gradient(to right, var(--accent), rgba(20,184,166,0.4))',
                            }}
                          />
                        </div>
                        <span className={styles.barItemRate}>{fmtPct(c.tasa_aprobacion)} aprobados</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top diputados */}
              <div className={styles.panel}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Diputados más activos</h2>
                  <span className={styles.sectionSub}>por proyectos</span>
                </div>
                <div className={styles.rankList}>
                  {topDip.slice(0, 10).map((d, i) => (
                    <Link
                      key={`dip-${i}`}
                      href={`/diputados/${encodeURIComponent(d.apellidos)}`}
                      className={styles.rankRow}
                    >
                      <div className={`${styles.rankBadge} ${rankBadgeClass(i)}`}>{i + 1}</div>
                      <span className={styles.rankName}>{d.nombre_completo}</span>
                      <span className={styles.rankVal} style={{ color: 'var(--accent)' }}>{fmt(d.total_proyectos)}</span>
                      <span className={styles.rankValSub}>proy.</span>
                    </Link>
                  ))}
                </div>
              </div>

            </div>

            <div className={styles.divider} />

            {/* ── Laws by year timeline ── */}
            {timeline.length > 0 && (
              <div className={styles.timelineWrap}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Leyes aprobadas por año</h2>
                  <span className={styles.sectionSub}>{timeline[0]?.anio} – {timeline[timeline.length - 1]?.anio}</span>
                </div>
                <div className={styles.timelineChart}>
                  {timeline.map(t => {
                    const h = Math.max((t.leyes_aprobadas / maxTimeline) * 100, 3)
                    return (
                      <div key={t.anio} className={styles.timelineCol} title={`${t.anio}: ${t.leyes_aprobadas} leyes`}>
                        <span className={styles.timelineVal}>{t.leyes_aprobadas > 0 ? t.leyes_aprobadas : ''}</span>
                        <div className={styles.timelineBar} style={{ height: `${h}%` }} />
                        <span className={styles.timelineYear}>{t.anio}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Efficacy + Types + Organs ── */}
            <div className={styles.cols3}>

              {/* Top efficacy */}
              {topEfic.length > 0 && (
                <div className={styles.panel}>
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Mayor eficacia</h2>
                    <span className={styles.sectionSub}>% aprobación</span>
                  </div>
                  <div className={styles.rankList}>
                    {topEfic.slice(0, 8).map((d, i) => (
                      <Link
                        key={`efic-${i}`}
                        href={`/diputados/${encodeURIComponent(d.apellidos)}`}
                        className={styles.rankRow}
                      >
                        <div className={`${styles.rankBadge} ${rankBadgeClass(i)}`}>{i + 1}</div>
                        <span className={styles.rankName}>{d.nombre_completo}</span>
                        <span className={styles.rankVal} style={{ color: 'var(--positive)' }}>{fmtPct(d.tasa_aprobacion)}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Project types */}
              {tipos.length > 0 && (
                <div className={styles.panel}>
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Tipos de expediente</h2>
                    <span className={styles.sectionSub}>distribución</span>
                  </div>
                  <div className={styles.typeList}>
                    {tipos.slice(0, 10).map(t => (
                      <div key={t.tipo}>
                        <div className={styles.typeRow}>
                          <span className={styles.typeLabel}>{t.tipo}</span>
                          <span className={styles.typePct}>{fmtPct(t.porcentaje)}</span>
                        </div>
                        <div className={styles.typeBar}>
                          <div
                            className={styles.typeBarFill}
                            style={{ width: `${(t.total / maxTipo) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active organs */}
              {organos.length > 0 && (
                <div className={styles.panel}>
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Órganos más activos</h2>
                    <span className={styles.sectionSub}>por trámites</span>
                  </div>
                  <div className={styles.organList}>
                    {organos.slice(0, 10).map(o => (
                      <div key={o.organo} className={styles.organRow}>
                        <span className={styles.organName}>{o.organo}</span>
                        <span className={styles.organCount}>{fmt(o.total_tramites)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>
      )}
    </div>
  )
}
