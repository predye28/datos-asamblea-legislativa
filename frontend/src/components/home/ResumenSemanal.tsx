'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { ProyectoResumen, MetricasResponse, ProximoVencer } from '@/lib/api'
import { formatName, formatTitle, formatDate } from '@/lib/utils'
import styles from './ResumenSemanal.module.css'

type Rango = 'semana' | 'mes' | 'seis_meses'

const RANGO_DIAS: Record<Rango, number> = { semana: 7, mes: 30, seis_meses: 180 }
const RANGO_LABEL: Record<Rango, string> = {
  semana: 'Esta semana',
  mes: 'Este mes',
  seis_meses: 'Últimos 6 meses',
}

function toISO(d: Date) { return d.toISOString().slice(0, 10) }

function formatRangoHumano(desde: Date, hasta: Date) {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  const a = desde.toLocaleDateString('es-CR', opts)
  const b = hasta.toLocaleDateString('es-CR', { ...opts, year: 'numeric' })
  return `${a} – ${b}`
}

export default function ResumenSemanal() {
  const [rango, setRango] = useState<Rango>('semana')
  const [loading, setLoading] = useState(true)
  const [proyectos, setProyectos] = useState<ProyectoResumen[]>([])
  const [leyes, setLeyes] = useState<ProyectoResumen[]>([])
  const [metricas, setMetricas] = useState<MetricasResponse | null>(null)
  const [porVencer, setPorVencer] = useState<ProximoVencer[]>([])
  const [ultimaFecha, setUltimaFecha] = useState<Date | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const hasta = new Date()
        const desde = new Date()
        desde.setDate(desde.getDate() - RANGO_DIAS[rango])

        const [listado, soloLeyes, gen, prox] = await Promise.all([
          api.proyectos.list({ desde: toISO(desde), hasta: toISO(hasta), por_pagina: 100, orden: 'reciente' }),
          api.proyectos.list({ desde: toISO(desde), hasta: toISO(hasta), solo_leyes: true, por_pagina: 30, orden: 'reciente' }),
          api.metricas.general({ desde: toISO(desde), hasta: toISO(hasta) }),
          api.metricas.proximosVencer(rango === 'semana' ? 30 : rango === 'mes' ? 60 : 90).catch(() => ({ datos: [] as ProximoVencer[] })),
        ])

        if (cancelled) return
        setProyectos(listado.datos)
        setLeyes(soloLeyes.datos)
        setMetricas(gen)
        setPorVencer(prox.datos || [])

        const fechas = listado.datos.map(p => p.fecha_inicio).filter(Boolean) as string[]
        const max = fechas.length > 0 ? new Date(fechas.reduce((a, b) => a > b ? a : b)) : null
        setUltimaFecha(max)
      } catch {
        if (!cancelled) {
          setProyectos([]); setLeyes([]); setMetricas(null); setPorVencer([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [rango])

  const { desdeDate, hastaDate } = useMemo(() => {
    const hasta = ultimaFecha ?? new Date()
    const desde = new Date(hasta)
    desde.setDate(desde.getDate() - RANGO_DIAS[rango])
    return { desdeDate: desde, hastaDate: hasta }
  }, [ultimaFecha, rango])

  const topTema = metricas?.por_categoria?.[0]
  const topDiputado = metricas?.top_diputados?.[0]
  const totalProyectos = proyectos.length
  const totalLeyes = leyes.length
  const urgentes = porVencer.filter(p => p.dias_restantes <= (rango === 'semana' ? 30 : rango === 'mes' ? 60 : 90))

  return (
    <section className={styles.wrap}>
      <div className={styles.container}>

        {/* Header + toggle */}
        <header className={styles.head}>
          <div>
            <div className={styles.kicker}>
              <span className={styles.dot} aria-hidden />
              <span>RESUMEN {rango === 'semana' ? 'SEMANAL' : rango === 'mes' ? 'MENSUAL' : 'SEMESTRAL'}</span>
              <span className={styles.kickerSep}>·</span>
              <span className={styles.kickerRange}>{formatRangoHumano(desdeDate, hastaDate)}</span>
            </div>
            <h2 className={styles.title}>
              {RANGO_LABEL[rango]} en la Asamblea
            </h2>
            <p className={styles.deck}>
              Lo más relevante que pasó en el Congreso, calculado con datos hasta{' '}
              <strong>{ultimaFecha ? formatDate(toISO(ultimaFecha)) : 'hoy'}</strong>.
            </p>
          </div>

          <div className={styles.toggle} role="tablist" aria-label="Rango de tiempo">
            {(['semana', 'mes', 'seis_meses'] as Rango[]).map(r => (
              <button
                key={r}
                role="tab"
                aria-selected={rango === r}
                className={`${styles.toggleBtn} ${rango === r ? styles.toggleBtnActive : ''}`}
                onClick={() => setRango(r)}
              >
                {r === 'semana' ? 'Semana' : r === 'mes' ? 'Mes' : '6 meses'}
              </button>
            ))}
          </div>
        </header>

        {/* KPIs rápidos */}
        <div className={styles.kpiRow}>
          <StatCard
            color="var(--accent)"
            value={loading ? '…' : totalProyectos}
            label="Proyectos ingresados"
            help="Nuevas iniciativas presentadas en el período."
          />
          <StatCard
            color="var(--positive)"
            value={loading ? '…' : totalLeyes}
            label={totalLeyes === 1 ? 'Ley aprobada' : 'Leyes aprobadas'}
            help="Proyectos que completaron su trámite y entraron en vigencia."
          />
          <StatCard
            color="#F59E0B"
            value={loading ? '…' : topTema ? topTema.categoria.split(' ')[0] : '—'}
            label="Tema dominante"
            help={topTema ? `${topTema.total} proyectos sobre este tema.` : 'Sin un tema protagonista claro.'}
            isWord
          />
          <StatCard
            color="#EF4444"
            value={loading ? '…' : urgentes.length}
            label={urgentes.length === 1 ? 'Proyecto urgente' : 'Proyectos urgentes'}
            help="Expedientes por vencer su plazo cuatrienal."
          />
        </div>

        {/* Bandas narrativas */}
        <div className={styles.bandas}>
          {/* Lo más propuesto */}
          <Banda
            titulo="Lo más propuesto"
            loading={loading}
            empty={!topTema || totalProyectos === 0}
            emptyText="Sin iniciativas en el período. Probá con un rango más amplio."
          >
            {topTema && (
              <p className={styles.bandaText}>
                El tema <strong>{topTema.categoria}</strong> domina la agenda con{' '}
                <strong>{topTema.total} proyectos</strong> en el período
                {topTema.tasa_aprobacion > 0 && (
                  <> · <span className={styles.bandaHint}>{Math.round(topTema.tasa_aprobacion)}% llega a ser ley</span></>
                )}.
              </p>
            )}
            <Link href={topTema ? `/proyectos?categoria=${topTema.slug}` : '/proyectos'} className={styles.bandaCta}>
              Ver proyectos del tema →
            </Link>
          </Banda>

          {/* Lo que se aprobó */}
          <Banda
            titulo="Lo que se aprobó"
            loading={loading}
            empty={totalLeyes === 0}
            emptyText="Ninguna ley entró en vigencia en este período. Los trámites legislativos suelen tomar años."
          >
            <p className={styles.bandaText}>
              <strong>{totalLeyes} {totalLeyes === 1 ? 'ley' : 'leyes'}</strong>{' '}
              {totalLeyes === 1 ? 'entró' : 'entraron'} en vigencia.
              {leyes[0] && (
                <> La más reciente: <em>{formatTitle(leyes[0].titulo)}</em>.</>
              )}
            </p>
            <Link href="/proyectos?estado=ley" className={styles.bandaCta}>
              Ver leyes vigentes →
            </Link>
          </Banda>

          {/* Lo que está por vencer */}
          <Banda
            titulo="Lo que está por vencer"
            loading={loading}
            empty={urgentes.length === 0}
            emptyText="No hay proyectos urgentes en la ventana consultada."
            urgent
          >
            <p className={styles.bandaText}>
              <strong>{urgentes.length} {urgentes.length === 1 ? 'proyecto' : 'proyectos'}</strong>{' '}
              {urgentes.length === 1 ? 'está' : 'están'} por vencer su plazo cuatrienal.
              Si no se aprueban a tiempo, se archivan sin trámite.
            </p>
            <Link href="/estadisticas#reloj" className={styles.bandaCta}>
              Revisar vencimientos →
            </Link>
          </Banda>

          {/* Quién trabajó más */}
          <Banda
            titulo="Quién trabajó más"
            loading={loading}
            empty={!topDiputado}
            emptyText="Sin actividad legislativa registrada en el período."
          >
            {topDiputado && (
              <p className={styles.bandaText}>
                <strong>{formatName(topDiputado.nombre_completo)}</strong> presentó{' '}
                <strong>{topDiputado.total_proyectos}</strong>{' '}
                {topDiputado.total_proyectos === 1 ? 'proyecto' : 'proyectos'} en el período —
                el diputado más activo.
              </p>
            )}
            <Link
              href={topDiputado ? `/diputados/${encodeURIComponent(topDiputado.nombre_completo)}` : '/diputados'}
              className={styles.bandaCta}
            >
              Ver perfil →
            </Link>
          </Banda>
        </div>

      </div>
    </section>
  )
}

function StatCard({ color, value, label, help, isWord }: {
  color: string
  value: React.ReactNode
  label: string
  help: string
  isWord?: boolean
}) {
  return (
    <div className={styles.stat} style={{ '--stat-color': color } as React.CSSProperties}>
      <div className={styles.statAccent} />
      <div className={`${styles.statValue} ${isWord ? styles.statWord : ''}`}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statHelp}>{help}</div>
    </div>
  )
}

function Banda({ titulo, children, loading, empty, emptyText, urgent }: {
  titulo: string
  children: React.ReactNode
  loading: boolean
  empty: boolean
  emptyText: string
  urgent?: boolean
}) {
  return (
    <article className={`${styles.banda} ${urgent ? styles.bandaUrgent : ''}`}>
      <div className={styles.bandaHead}>
        <h3 className={styles.bandaTitle}>{titulo}</h3>
      </div>
      {loading ? (
        <div className={styles.bandaSkeleton} aria-hidden />
      ) : empty ? (
        <p className={styles.bandaEmpty}>{emptyText}</p>
      ) : (
        children
      )}
    </article>
  )
}
