import Link from 'next/link'
import { notFound } from 'next/navigation'
import { api } from '@/lib/api'
import type { PerfilDiputado } from '@/lib/api'
import { formatTitle, formatDate, formatQuantity, formatName, cleanText } from '@/lib/utils'
import styles from './perfil.module.css'

interface Props { params: Promise<{ apellidos: string }> }

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconArrowLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
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

function IconScale() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
      <path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
    </svg>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function PerfilDiputadoPage({ params }: Props) {
  const { apellidos } = await params
  const apellidosRaw = decodeURIComponent(apellidos)
  const nombreDisplay = formatName(apellidosRaw)

  let perfil: PerfilDiputado
  try {
    perfil = await api.metricas.perfilDiputado(apellidosRaw)
  } catch {
    notFound()
  }

  const maxPeriodo = Math.max(...perfil.por_periodo.map(p => p.total), 1)
  const maxTema    = Math.max(...perfil.temas.map(t => t.total), 1)

  return (
    <div className={styles.page}>

      {/* ── Back ── */}
      <div className={styles.backBar}>
        <Link href="/diputados" className={styles.backBtn}>
          <IconArrowLeft /> Volver a diputados
        </Link>
      </div>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroDots} aria-hidden />
        <div className={styles.heroInner}>
          <div className={styles.avatar}>{getInitials(apellidosRaw)}</div>
          <div className={styles.heroText}>
            <span className={styles.heroEyebrow}>Perfil legislativo</span>
            <h1 className={styles.heroName}>{nombreDisplay}</h1>
            <p className={styles.heroSub}>Diputación · Asamblea Legislativa de Costa Rica</p>
            {perfil.primer_proyecto && (
              <p className={styles.heroRange}>
                Registros desde {new Date(perfil.primer_proyecto).getFullYear()}
                {perfil.ultimo_proyecto && ` · último proyecto ${formatDate(perfil.ultimo_proyecto)}`}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className={styles.container}>

        {/* ── Stat cards ── */}
        <div className={styles.statGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Proyectos propuestos</span>
            <span className={styles.statNum}>{perfil.total_proyectos}</span>
          </div>
          <div className={`${styles.statCard} ${styles.statCardLey}`}>
            <span className={styles.statLabel}>Leyes aprobadas</span>
            <span className={`${styles.statNum} ${styles.statNumLey}`}>{perfil.total_leyes}</span>
          </div>
          <div className={`${styles.statCard} ${perfil.tasa_aprobacion >= 15 ? styles.statCardAccent : ''}`}>
            <span className={styles.statLabel}>Eficacia legislativa</span>
            <span className={`${styles.statNum} ${perfil.tasa_aprobacion >= 15 ? styles.statNumAccent : ''}`}>
              {perfil.tasa_aprobacion}%
            </span>
          </div>
        </div>

        {/* ── Actividad por período ── */}
        {perfil.por_periodo.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Actividad por período legislativo</h2>
            <p className={styles.sectionDesc}>
              Proyectos presentados como proponente. La barra verde representa los que se aprobaron como ley.
            </p>
            <div className={styles.periodoBars}>
              {perfil.por_periodo.map(p => {
                const pct    = Math.round((p.total   / maxPeriodo) * 100)
                const leyPct = Math.round((p.leyes   / maxPeriodo) * 100)
                return (
                  <div key={p.periodo} className={styles.periodoRow}>
                    <div className={styles.periodoInfo}>
                      <span className={styles.periodoLabel}>{p.periodo}</span>
                      <div className={styles.periodoNums}>
                        <span className={styles.periodoTotal}>{formatQuantity(p.total, 'proyecto', 'proyectos')}</span>
                        {p.leyes > 0 && (
                          <span className={styles.periodoLeyes}>{p.leyes} {p.leyes === 1 ? 'ley' : 'leyes'}</span>
                        )}
                      </div>
                    </div>
                    <div className={styles.gaugeTrack}>
                      <div className={styles.gaugeFill} style={{ width: `${pct}%` }} />
                      {leyPct > 0 && <div className={styles.gaugeLey} style={{ width: `${leyPct}%` }} />}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Enfoque temático ── */}
        {perfil.temas.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Enfoque temático</h2>
            <div className={styles.temasGrid}>
              {perfil.temas.map(t => (
                <Link key={t.slug} href={`/proyectos?q=${encodeURIComponent(apellidosRaw)}&categoria=${t.slug}`} className={styles.temaCard}>
                  <div className={styles.temaHeader}>
                    <span className={styles.temaNombre}>{cleanText(t.tema)}</span>
                    <span className={styles.temaCount}>{t.total}</span>
                  </div>
                  <div className={styles.temaBar}>
                    <div
                      className={styles.temaBarFill}
                      style={{ width: `${Math.round((t.total / maxTema) * 100)}%` }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Últimos proyectos ── */}
        {perfil.ultimos_proyectos.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Últimos proyectos presentados</h2>
            <div className={styles.proyectosList}>
              {perfil.ultimos_proyectos.map(p => {
                const isLey = !!p.numero_ley
                return (
                  <Link
                    key={p.numero_expediente}
                    href={`/proyecto/${p.numero_expediente}`}
                    className={`${styles.proyectoCard} ${isLey ? styles.proyectoCardLey : ''}`}
                  >
                    <div className={styles.pcAccent} />
                    <div className={styles.pcBody}>
                      <div className={styles.pcTop}>
                        <span className={styles.pcExp}>Exp. {p.numero_expediente}</span>
                        {isLey && (
                          <span className={styles.pcBadgeLey}><IconScale /> Ley N°{p.numero_ley}</span>
                        )}
                      </div>
                      <h3 className={styles.pcTitle}>{formatTitle(p.titulo)}</h3>
                      <div className={styles.pcMeta}>
                        {p.fecha_inicio && <span className={styles.pcDate}>{formatDate(p.fecha_inicio)}</span>}
                        {p.estado_actual && !isLey && (
                          <>
                            <span className={styles.pcSep} aria-hidden>·</span>
                            <span className={styles.pcEstado}>{p.estado_actual}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className={styles.pcArrow} aria-hidden><IconChevron /></div>
                  </Link>
                )
              })}
            </div>
            <Link
              href={`/proyectos?q=${encodeURIComponent(apellidosRaw)}`}
              className={styles.verTodosBtn}
            >
              Ver todos los proyectos de este diputado <IconChevron />
            </Link>
          </section>
        )}

      </div>
    </div>
  )
}
