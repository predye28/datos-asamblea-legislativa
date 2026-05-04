'use client'

import Link from 'next/link'
import type { PerfilPartido } from '@/lib/api'
import { formatName, formatDiputadoName, cleanText } from '@/lib/utils'
import { useT } from '@/i18n/LanguageProvider'
import { getPaletaPartido } from '@/lib/partidos'
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

function IconMapPin() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 10c0 6-8 13-8 13s-8-7-8-13a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
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
            <div className={styles.heroChips}>
              {perfil.primer_anio && (
                <span className={styles.heroChip}>
                  <IconCalendar />
                  Desde {perfil.primer_anio}
                </span>
              )}
              {perfil.por_administracion.length > 0 && (
                <span className={styles.heroChip}>
                  <IconLayers />
                  {perfil.por_administracion.length} {perfil.por_administracion.length === 1 ? 'período' : 'períodos'}
                </span>
              )}
              {perfil.provincia_principal && (
                <span className={styles.heroChip}>
                  <IconMapPin />
                  {perfil.provincia_principal}
                </span>
              )}
            </div>
          </div>
          {/* Bandera grande en el extremo derecho */}
          <div className={styles.heroFlag} style={{ background: paleta.bg }}>
            <span className={styles.heroFlagCode}>{perfil.codigo}</span>
          </div>
        </div>
      </section>

      <div className={styles.container}>

        {/* ── KPIs ── */}
        <div className={styles.statGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>{t.statPropuestasLabel}</span>
            <strong className={styles.statNum}>{perfil.total_propuestas.toLocaleString('es-CR')}</strong>
            <span className={styles.statHelp}>{t.statPropuestasHelp}</span>
          </div>
          <div className={`${styles.statCard} ${styles.statCardLey}`}>
            <span className={styles.statLabel}>{t.statLeyesLabel}</span>
            <strong className={`${styles.statNum} ${styles.statNumLey}`}>{perfil.total_leyes.toLocaleString('es-CR')}</strong>
            <span className={styles.statHelp}>{t.statLeyesHelp}</span>
          </div>
          <div className={`${styles.statCard} ${styles.statCardAccent}`}>
            <span className={styles.statLabel}>{t.statEficaciaLabel}</span>
            <strong className={`${styles.statNum} ${styles.statNumAccent}`}>{perfil.tasa_aprobacion}%</strong>
            <span className={styles.statHelp}>{t.statEficaciaHelp}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>{t.statDiputadosLabel}</span>
            <strong className={styles.statNum}>{perfil.total_diputados}</strong>
            <span className={styles.statHelp}>{t.statDiputadosHelp}</span>
          </div>
        </div>

        {/* ── Actividad por período legislativo ── */}
        {perfil.por_administracion.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{t.administracionTitle}</h2>
              <p className={styles.sectionDesc}>{t.administracionDesc}</p>
            </div>
            <div className={styles.admGrid}>
              {perfil.por_administracion.map(a => {
                const pct = Math.round((a.total_propuestas / maxAdm) * 100)
                const isPeak = a.total_propuestas === maxAdm && maxAdm > 0
                const eficiencia = a.total_diputados > 0
                  ? Math.round(a.total_propuestas / a.total_diputados)
                  : 0
                return (
                  <div
                    key={a.administracion}
                    className={`${styles.admCard} ${isPeak ? styles.admCardPeak : ''}`}
                  >
                    <div className={styles.admCardHeader}>
                      <span className={styles.admPeriodo}>{a.administracion}</span>
                      <div className={styles.admHeaderRight}>
                        {isPeak && <span className={styles.admPeakBadge}>Más activo</span>}
                        <span className={styles.admDips}>
                          {a.total_diputados} {a.total_diputados === 1 ? t.dipSingular : t.dipPlural}
                        </span>
                      </div>
                    </div>
                    <div className={styles.admCardStats}>
                      <div className={styles.admStatBlock}>
                        <strong className={styles.admStatNum}>{a.total_propuestas}</strong>
                        <span className={styles.admStatLabel}>{cap(t.propuestaPlural)}</span>
                      </div>
                      {a.leyes_aprobadas > 0 && (
                        <div className={styles.admStatBlock}>
                          <strong className={styles.admStatNumGreen}>{a.leyes_aprobadas}</strong>
                          <span className={styles.admStatLabel}>{cap(t.leyPlural)}</span>
                        </div>
                      )}
                      <div className={styles.admStatBlock}>
                        <strong className={styles.admStatNumAccent}>{a.tasa_aprobacion}%</strong>
                        <span className={styles.admStatLabel}>Tasa</span>
                      </div>
                      {eficiencia > 0 && (
                        <div className={`${styles.admStatBlock} ${styles.admStatBlockEfic}`}>
                          <strong className={styles.admStatNumMuted}>{eficiencia}</strong>
                          <span className={styles.admStatLabel}>Proy/dip</span>
                        </div>
                      )}
                    </div>
                    <div className={styles.admBar}>
                      <div className={styles.admBarFill} style={{ width: `${pct}%` }} />
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
              <h2 className={styles.sectionTitle}>{t.topDiputadosTitle}</h2>
              <p className={styles.sectionDesc}>{t.topDiputadosDesc}</p>
            </div>
            <div className={styles.dipGrid}>
              {perfil.top_diputados.map((d, i) => {
                const slug = encodeURIComponent(d.nombre_completo)
                const medalColor = i < 3 ? MEDAL[i] : undefined
                const barW = Math.round((d.total_proyectos / maxDip) * 100)
                return (
                  <Link key={d.nombre_completo} href={`/diputados/${slug}`} className={styles.dipCard}>
                    <div className={styles.dipCardInner}>
                      <div className={styles.dipAvatarWrap}>
                        <div className={styles.dipAvatar} style={{ background: paleta.soft, color: paleta.bg }}>
                          {(d.apellidos?.[0] ?? d.nombre?.[0] ?? '·').toUpperCase()}
                        </div>
                        <span
                          className={styles.dipRankBadge}
                          style={medalColor ? { color: medalColor, borderColor: medalColor } : undefined}
                        >
                          {i + 1}
                        </span>
                      </div>
                      <div className={styles.dipBody}>
                        <span className={styles.dipName}>{formatDiputadoName(d.nombre_completo)}</span>
                        <div className={styles.dipMeta}>
                          <span className={styles.dipMetaItem}>
                            <strong className={styles.dipMetaVal}>{d.total_proyectos}</strong>
                            <span className={styles.dipMetaLabel}>proy.</span>
                          </span>
                          {d.leyes_aprobadas > 0 && (
                            <>
                              <span className={styles.dipMetaSep}>/</span>
                              <span className={styles.dipMetaItem}>
                                <strong className={styles.dipMetaValGreen}>{d.leyes_aprobadas}</strong>
                                <span className={styles.dipMetaLabel}>leyes</span>
                              </span>
                            </>
                          )}
                          <span className={styles.dipMetaSep}>/</span>
                          <span className={styles.dipMetaItem}>
                            <strong className={styles.dipMetaValAccent}>{d.tasa_aprobacion}%</strong>
                          </span>
                        </div>
                      </div>
                      <span className={styles.dipArrow}><IconChevron /></span>
                    </div>
                    <div className={styles.dipBar}>
                      <div className={styles.dipBarFill} style={{ width: `${barW}%` }} />
                    </div>
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
              <h2 className={styles.sectionTitle}>{t.categoriasTitle}</h2>
              <p className={styles.sectionDesc}>{t.categoriasDesc}</p>
            </div>
            <div className={styles.catGrid}>
              {perfil.por_categoria.map((c, i) => {
                const pct = Math.round((c.total / maxCat) * 100)
                return (
                  <Link key={c.slug} href={`/proyectos?categoria=${c.slug}`} className={styles.catCard}>
                    <span className={styles.catAccent} />
                    <div className={styles.catMain}>
                      <div className={styles.catTop}>
                        <span className={styles.catRank}>{i + 1}</span>
                        <span className={styles.catNombre}>{cap(cleanText(c.categoria))}</span>
                      </div>
                      <div className={styles.catBar}>
                        <div className={styles.catBarFill} style={{ width: `${pct}%` }} />
                      </div>
                      <div className={styles.catMeta}>
                        <span className={styles.catMetaItem}>
                          <strong className={styles.catMetaVal}>{c.total}</strong>
                          <span className={styles.catMetaLabel}>proyectos</span>
                        </span>
                        {c.leyes_aprobadas > 0 && (
                          <>
                            <span className={styles.catMetaSep}>/</span>
                            <span className={styles.catMetaItem}>
                              <strong className={styles.catMetaValGreen}>{c.leyes_aprobadas}</strong>
                              <span className={styles.catMetaLabel}>leyes</span>
                            </span>
                          </>
                        )}
                        {c.tasa_aprobacion > 0 && (
                          <>
                            <span className={styles.catMetaSep}>/</span>
                            <span className={styles.catMetaItem}>
                              <strong className={styles.catMetaValAccent}>{c.tasa_aprobacion}%</strong>
                              <span className={styles.catMetaLabel}>tasa</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className={styles.catRight}>
                      <span className={styles.catPct}>{pct}%</span>
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
          <Link href="/proyectos" className={styles.verProyectosBtn}>
            {t.verProyectosPartido} <IconChevron />
          </Link>
        </div>
      </div>
    </div>
  )
}
