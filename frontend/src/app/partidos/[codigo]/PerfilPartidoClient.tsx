'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { PerfilPartido } from '@/lib/api'
import { formatName, formatDiputadoName, cleanText } from '@/lib/utils'
import { useT } from '@/i18n/LanguageProvider'
import { getPaletaPartido, getBanderaUrl, getSiglasPopulares } from '@/lib/partidos'
import { DiputadoAvatar } from '@/components/ui/DiputadoAvatar'
import styles from './perfil.module.css'

function IconArrowLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
    </svg>
  )
}

function IconChevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}


function IconLayers() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
    </svg>
  )
}

function IconExternalLink() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

function IconBarChart() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function IconFileText() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}

function IconCheckCircle() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function IconTrendingUp() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const MEDAL = ['#F6AD55', '#A0AEC0', '#CD853F']

interface Props {
  perfil: PerfilPartido
  codigoRaw: string
}

export default function PerfilPartidoClient({ perfil }: Props) {
  const { dict } = useT()
  const t = dict.partidoDetalle
  const paleta = getPaletaPartido(perfil.codigo)
  const banderaUrl = getBanderaUrl(perfil.codigo)
  const router = useRouter()

  const maxAdm = Math.max(...perfil.por_administracion.map(a => a.total_propuestas), 1)
  const maxDip = Math.max(...perfil.top_diputados.map(d => d.total_proyectos), 1)
  const totalCats = perfil.por_categoria.reduce((s, c) => s + c.total, 0) || 1
  const maxCat = Math.max(...perfil.por_categoria.map(c => c.total), 1)

  return (
    <div className={styles.page}>
      {/* Back */}
      <div className={styles.backBar}>
        <Link href="/partidos" className={styles.backBtn}>
          <IconArrowLeft /> {t.backToList}
        </Link>
      </div>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroDots} aria-hidden style={{ '--hero-color': paleta.bg } as React.CSSProperties} />
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <span className={styles.heroEyebrow}>{t.heroEyebrow}</span>
            <h1 className={styles.heroName}>{formatName(perfil.nombre)}</h1>
            <p className={styles.heroSub}>{t.heroSub}</p>
            <div className={styles.heroFacts}>
              {perfil.primer_anio && (
                <span className={styles.heroFact}>
                  <IconCalendar />
                  Fundado en {perfil.primer_anio}
                </span>
              )}
              {perfil.primer_anio && perfil.por_administracion.length > 0 && (
                <span className={styles.heroFactSep} aria-hidden>·</span>
              )}
              {perfil.por_administracion.length > 0 && (
                <span className={styles.heroFact}>
                  <IconLayers />
                  {perfil.por_administracion.length} {perfil.por_administracion.length === 1 ? 'período legislativo' : 'períodos legislativos'}
                </span>
              )}
            </div>
          </div>

          {/* Columna derecha: flag identidad del partido */}
          <div className={styles.heroRight}>
            <div
              className={styles.heroFlag}
              style={{ background: banderaUrl ? '#fff' : paleta.bg, '--hero-flag-color': paleta.bg } as React.CSSProperties}
            >
              {banderaUrl ? (
                <img src={banderaUrl} alt={perfil.nombre} className={styles.heroFlagImg} />
              ) : (
                <span className={styles.heroFlagCode}>{getSiglasPopulares(perfil.codigo)}</span>
              )}
            </div>
          </div>
        </div>
        {/* Línea decorativa en el color del partido */}
        <div
          className={styles.heroAccentLine}
          aria-hidden
          style={{ background: `linear-gradient(90deg, transparent, ${paleta.bg}99, transparent)` }}
        />
      </section>

      <div className={styles.container}>

        {/* ── KPIs ── */}
        <div className={styles.statGrid}>
          <div
            className={`${styles.statCard} ${styles.statCardParty}`}
            style={{ '--party-color': paleta.bg } as React.CSSProperties}
          >
            <div className={styles.statIcon}><IconFileText /></div>
            <span className={styles.statLabel}>{t.statPropuestasLabel}</span>
            <strong className={styles.statNum}>{perfil.total_propuestas.toLocaleString('es-CR')}</strong>
            <span className={styles.statHelp}>{t.statPropuestasHelp}</span>
          </div>
          <div className={`${styles.statCard} ${styles.statCardLey}`}>
            <div className={`${styles.statIcon} ${styles.statIconGreen}`}><IconCheckCircle /></div>
            <span className={styles.statLabel}>{t.statLeyesLabel}</span>
            <strong className={`${styles.statNum} ${styles.statNumLey}`}>{perfil.total_leyes.toLocaleString('es-CR')}</strong>
            <span className={styles.statHelp}>{t.statLeyesHelp}</span>
          </div>
          <div className={`${styles.statCard} ${styles.statCardAccent}`}>
            <div className={`${styles.statIcon} ${styles.statIconAccent}`}><IconTrendingUp /></div>
            <span className={styles.statLabel}>{t.statEficaciaLabel}</span>
            <strong className={`${styles.statNum} ${styles.statNumAccent}`}>{perfil.tasa_aprobacion}%</strong>
            <span className={styles.statHelp}>{t.statEficaciaHelp}</span>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}><IconUsers /></div>
            <span className={styles.statLabel}>{t.statDiputadosLabel}</span>
            <strong className={styles.statNum}>{perfil.total_diputados}</strong>
            <span className={styles.statHelp}>{t.statDiputadosHelp}</span>
          </div>
        </div>

        {/* ── Actividad por período legislativo ── */}
        {perfil.por_administracion.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <div className={styles.sectionAccent} style={{ background: paleta.bg }} />
              <div>
                <h2 className={styles.sectionTitle}>{t.administracionTitle}</h2>
                <p className={styles.sectionDesc}>{t.administracionDesc}</p>
              </div>
            </div>
            <div className={styles.admList}>
              {perfil.por_administracion.map(a => {
                const pct = Math.round((a.total_propuestas / maxAdm) * 100)
                const isPeak = a.total_propuestas === maxAdm && maxAdm > 0
                return (
                  <div
                    key={a.administracion}
                    className={`${styles.admRow} ${isPeak ? styles.admRowPeak : ''}`}
                    onClick={() => router.push(`/proyectos?partido=${perfil.partido_id}&periodo=${encodeURIComponent(a.administracion)}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') router.push(`/proyectos?partido=${perfil.partido_id}&periodo=${encodeURIComponent(a.administracion)}`) }}
                  >
                    <div className={styles.admRowLeft}>
                      <span className={styles.admRowPeriodo}>{a.administracion}</span>
                      <div className={styles.admRowSub}>
                        {isPeak && <span className={styles.admPeakBadge}>Más activo</span>}
                        <span className={styles.admRowDips}>{a.total_diputados} {a.total_diputados === 1 ? 'Diputado' : 'Diputados'}</span>
                      </div>
                    </div>
                    <div className={styles.admRowCenter}>
                      <div className={styles.admRowBar}>
                        <div
                          className={styles.admRowBarFill}
                          style={{ width: `${pct}%`, background: isPeak ? paleta.bg : undefined }}
                        />
                      </div>
                    </div>
                    <div className={styles.admRowRight}>
                      <div className={styles.admRowStat}>
                        <strong>{a.total_propuestas}</strong>
                        <span>{a.total_propuestas === 1 ? 'Propuesta' : 'Propuestas'}</span>
                      </div>
                      {a.leyes_aprobadas > 0 && (
                        <div className={styles.admRowStat}>
                          <strong style={{ color: '#4ade80' }}>{a.leyes_aprobadas}</strong>
                          <span>Leyes</span>
                        </div>
                      )}
                      <div className={styles.admRowStat}>
                        <strong style={{ color: 'var(--accent)' }}>{a.tasa_aprobacion}%</strong>
                        <span>Aprobación</span>
                      </div>
                    </div>
                    <div className={styles.admRowActions} onClick={e => e.stopPropagation()}>
                      <Link
                        href={`/proyectos?partido=${perfil.partido_id}&periodo=${encodeURIComponent(a.administracion)}`}
                        className={`${styles.admRowBtn} ${styles.admRowBtnPrimary}`}
                      >
                        <IconExternalLink /> Ver proyectos
                      </Link>
                      <Link
                        href={`/estadisticas?periodo=${encodeURIComponent(a.administracion)}`}
                        className={`${styles.admRowBtn} ${styles.admRowBtnStats}`}
                      >
                        <IconBarChart /> Ver estadísticas
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Diputados más activos ── */}
        {perfil.top_diputados.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <div className={styles.sectionAccent} style={{ background: paleta.bg }} />
              <div>
                <h2 className={styles.sectionTitle}>{t.topDiputadosTitle}</h2>
                <p className={styles.sectionDesc}>{t.topDiputadosDesc}</p>
              </div>
            </div>
            <div className={styles.dipList}>
              {perfil.top_diputados.map((d, i) => {
                const slug = encodeURIComponent(d.nombre_completo)
                const barW = Math.round((d.total_proyectos / maxDip) * 100)
                const medalColor = i < 3 ? MEDAL[i] : undefined
                return (
                  <Link key={d.nombre_completo} href={`/diputados/${slug}`} className={`${styles.dipRow} ${i === 0 ? styles.dipRowFeatured : ''}`}>
                    {/* Rank */}
                    <div className={styles.dipRowLeft}>
                      <span className={styles.dipRowRank} style={medalColor ? { color: medalColor } : undefined}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <span className={styles.dipRowDivider} />

                    {/* Avatar */}
                    <DiputadoAvatar
                      nombreCompleto={d.nombre_completo}
                      size="sm"
                      partyColor={paleta.bg}
                      className={styles.dipRowAvatar}
                    />

                    {/* Body */}
                    <div className={styles.dipRowBody}>
                      <span className={styles.dipRowName}>{formatDiputadoName(d.nombre_completo)}</span>
                      <div className={styles.dipRowBar}>
                        <div
                          className={styles.dipRowBarFill}
                          style={{ width: `${barW}%`, background: paleta.bg }}
                        />
                      </div>
                      <div className={styles.dipRowMeta}>
                        {d.leyes_aprobadas > 0 && (
                          <span className={styles.dipRowMetaItem}>
                            <strong style={{ color: '#4ade80' }}>{d.leyes_aprobadas}</strong>
                            <span className={styles.dipRowMetaLabel}>Leyes</span>
                          </span>
                        )}
                        <span className={styles.dipRowMetaSep}>/</span>
                        <span className={styles.dipRowMetaItem}>
                          <strong style={{ color: 'var(--accent)' }}>{d.tasa_aprobacion}%</strong>
                          <span className={styles.dipRowMetaLabel}>Aprobados</span>
                        </span>
                      </div>
                    </div>

                    {/* Count */}
                    <div className={styles.dipRowCount}>
                      <strong className={styles.dipRowCountNum}>{d.total_proyectos}</strong>
                      <span className={styles.dipRowCountLabel}>Proyectos</span>
                    </div>

                    <span className={styles.dipRowArrow}><IconChevron /></span>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Temas más frecuentes ── */}
        {perfil.por_categoria.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <div className={styles.sectionAccent} style={{ background: paleta.bg }} />
              <div>
                <h2 className={styles.sectionTitle}>{t.categoriasTitle}</h2>
                <p className={styles.sectionDesc}>{t.categoriasDesc}</p>
              </div>
            </div>
            <div className={styles.catGrid}>
              {perfil.por_categoria.map((c, i) => {
                const barPct = Math.round((c.total / maxCat) * 100)
                const sharePct = Math.round((c.total / totalCats) * 100)
                return (
                  <Link key={c.slug} href={`/proyectos?categoria=${c.slug}&partido=${perfil.partido_id}`} className={styles.catCard}>
                    <span className={styles.catAccent} style={{ background: paleta.bg }} />
                    <div className={styles.catMain}>
                      <div className={styles.catTop}>
                        <span className={styles.catRank}>{i + 1}</span>
                        <span className={styles.catNombre}>{cap(cleanText(c.categoria))}</span>
                      </div>
                      <div className={styles.catBar}>
                        <div
                          className={styles.catBarFill}
                          style={{ width: `${barPct}%`, background: paleta.bg }}
                        />
                      </div>
                      <div className={styles.catMeta}>
                        <span className={styles.catMetaItem}>
                          <strong className={styles.catMetaVal}>{c.total}</strong>
                          <span className={styles.catMetaLabel}>Proyectos</span>
                        </span>
                        {c.leyes_aprobadas > 0 && (
                          <>
                            <span className={styles.catMetaSep}>/</span>
                            <span className={styles.catMetaItem}>
                              <strong className={styles.catMetaValGreen}>{c.leyes_aprobadas}</strong>
                              <span className={styles.catMetaLabel}>Leyes</span>
                            </span>
                          </>
                        )}
                        {c.tasa_aprobacion > 0 && (
                          <>
                            <span className={styles.catMetaSep}>/</span>
                            <span className={styles.catMetaItem}>
                              <strong className={styles.catMetaValAccent}>{c.tasa_aprobacion}%</strong>
                              <span className={styles.catMetaLabel}>Aprobación</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className={styles.catRight}>
                      <div className={styles.catPctRow}>
                        <span className={styles.catPct}>{sharePct}%</span>
                        <span className={styles.catPctLabel}>del partido</span>
                      </div>
                      <span className={styles.catArrow}><IconChevron /></span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* Footer */}
        <div className={styles.footerLink}>
          <Link href={`/proyectos?partido=${perfil.partido_id}`} className={styles.verProyectosBtn}>
            {t.verProyectosPartido} <IconChevron />
          </Link>
        </div>
      </div>
    </div>
  )
}
