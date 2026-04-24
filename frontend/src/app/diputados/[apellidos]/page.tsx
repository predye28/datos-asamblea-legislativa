import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { api } from '@/lib/api'
import type { PerfilDiputado } from '@/lib/api'
import { formatTitle, formatDate, formatQuantity, formatName, cleanText } from '@/lib/utils'
import { EstadoChip } from '@/components/ui/EstadoChip'
import styles from './perfil.module.css'

function avatarHue(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360
  return h
}

interface Props { params: Promise<{ apellidos: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { apellidos } = await params
  const nombre = formatName(decodeURIComponent(apellidos))
  try {
    const perfil = await api.metricas.perfilDiputado(decodeURIComponent(apellidos))
    const title = `${nombre} · Diputación`
    const desc = `${perfil.total_proyectos} proyectos presentados · ${perfil.total_leyes} aprobados como ley · ${perfil.tasa_aprobacion}% de eficacia legislativa.`
    return {
      title,
      description: desc,
      openGraph: { title, description: desc, type: 'profile' },
      twitter: { title, description: desc },
      alternates: { canonical: `/diputados/${encodeURIComponent(decodeURIComponent(apellidos))}` },
    }
  } catch {
    return { title: nombre || 'Perfil de diputación' }
  }
}

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
  const totalTemas = perfil.temas.reduce((s, t) => s + t.total, 0) || 1
  const temaTop = perfil.temas[0]
  const hue = avatarHue(apellidosRaw)
  const añosActivo = perfil.primer_proyecto
    ? new Date().getFullYear() - new Date(perfil.primer_proyecto).getFullYear()
    : 0

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
          <div
            className={styles.avatar}
            style={{ background: `linear-gradient(135deg, hsl(${hue} 55% 32%), hsl(${(hue + 40) % 360} 55% 20%))` }}
          >
            {getInitials(apellidosRaw)}
          </div>
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
            {temaTop && (
              <p className={styles.heroQuote}>
                Su tema más frecuente: <strong>{cleanText(temaTop.tema)}</strong>{' '}
                <span className={styles.heroQuoteDim}>
                  ({Math.round((temaTop.total / totalTemas) * 100)}% de sus proyectos)
                </span>
              </p>
            )}
          </div>
        </div>
      </section>

      <div className={styles.container}>

        {/* ── Stat cards ── */}
        <div className={styles.statGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Proyectos impulsados</span>
            <span className={styles.statNum}>{perfil.total_proyectos}</span>
            <span className={styles.statHelp}>Iniciativas que presentó como proponente.</span>
          </div>
          <div className={`${styles.statCard} ${styles.statCardLey}`}>
            <span className={styles.statLabel}>Leyes aprobadas</span>
            <span className={`${styles.statNum} ${styles.statNumLey}`}>{perfil.total_leyes}</span>
            <span className={styles.statHelp}>Cuántas de sus iniciativas llegaron a ser ley.</span>
          </div>
          <div className={`${styles.statCard} ${perfil.tasa_aprobacion >= 15 ? styles.statCardAccent : ''}`}>
            <span className={styles.statLabel}>Eficacia</span>
            <span className={`${styles.statNum} ${perfil.tasa_aprobacion >= 15 ? styles.statNumAccent : ''}`}>
              {perfil.tasa_aprobacion}%
            </span>
            <span className={styles.statHelp}>De cada 100 proyectos, cuántos llegan a ser ley.</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>{añosActivo === 1 ? 'Año activo' : 'Años activo'}</span>
            <span className={styles.statNum}>{añosActivo || '—'}</span>
            <span className={styles.statHelp}>Desde su primer proyecto registrado.</span>
          </div>
        </div>

        {/* ── Actividad por período ── */}
        {perfil.por_periodo.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>En qué períodos legislativos trabajó</h2>
            <p className={styles.sectionDesc}>
              Cómo se distribuyó su actividad en el tiempo. La barra verde muestra cuántos de sus proyectos llegaron a ser ley.
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
            <h2 className={styles.sectionTitle}>Los temas que más le importan</h2>
            <p className={styles.sectionDesc}>
              Cómo se reparten sus {perfil.total_proyectos} proyectos entre temas. El porcentaje es sobre su propio total.
            </p>
            <div className={styles.temasGrid}>
              {perfil.temas.map(t => {
                const pct = Math.round((t.total / totalTemas) * 100)
                return (
                  <Link key={t.slug} href={`/proyectos?q=${encodeURIComponent(apellidosRaw)}&categoria=${t.slug}`} className={styles.temaCard}>
                    <div className={styles.temaHeader}>
                      <span className={styles.temaNombre}>{cleanText(t.tema)}</span>
                      <span className={styles.temaCount}>{pct}%</span>
                    </div>
                    <div className={styles.temaBar}>
                      <div
                        className={styles.temaBarFill}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={styles.temaMeta}>{t.total} {t.total === 1 ? 'proyecto' : 'proyectos'}</span>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Actividad reciente ── */}
        {perfil.ultimos_proyectos.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Actividad reciente</h2>
            <p className={styles.sectionDesc}>
              Sus últimos proyectos, de más nuevo a más antiguo.
            </p>
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
                        <EstadoChip
                          estadoActual={p.estado_actual}
                          esLey={isLey}
                          numeroLey={p.numero_ley}
                          size="sm"
                        />
                      </div>
                      <h3 className={styles.pcTitle}>{formatTitle(p.titulo)}</h3>
                      <div className={styles.pcMeta}>
                        {p.fecha_inicio && <span className={styles.pcDate}>{formatDate(p.fecha_inicio)}</span>}
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
