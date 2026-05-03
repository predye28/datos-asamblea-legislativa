'use client'

import Link from 'next/link'
import type { PerfilPartido } from '@/lib/api'
import { formatQuantity, cleanText } from '@/lib/utils'
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

interface Props {
  perfil: PerfilPartido
  codigoRaw: string
}

export default function PerfilPartidoClient({ perfil, codigoRaw }: Props) {
  const { dict } = useT()
  const t = dict.partidoDetalle
  const paleta = getPaletaPartido(perfil.codigo)

  const maxAdm = Math.max(...perfil.por_administracion.map(a => a.total_propuestas), 1)
  const totalCats = perfil.por_categoria.reduce((s, c) => s + c.total, 0) || 1

  return (
    <div className={styles.page}>
      <div className={styles.backBar}>
        <Link href="/partidos" className={styles.backBtn}>
          <IconArrowLeft /> {t.backToList}
        </Link>
      </div>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroDots} aria-hidden style={{ '--hero-color': paleta.bg } as React.CSSProperties} />
        <div className={styles.heroInner}>
          <div
            className={styles.avatar}
            style={{ background: `linear-gradient(135deg, ${paleta.bg}, color-mix(in srgb, ${paleta.bg} 70%, #000))` }}
          >
            {perfil.codigo}
          </div>
          <div className={styles.heroText}>
            <span className={styles.heroEyebrow}>{t.heroEyebrow}</span>
            <h1 className={styles.heroName} style={{ color: paleta.bg }}>{perfil.nombre}</h1>
            <p className={styles.heroSub}>{t.heroSub}</p>
          </div>
        </div>
      </section>

      <div className={styles.container}>
        {/* Stat grid */}
        <div className={styles.statGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>{t.statPropuestasLabel}</span>
            <span className={styles.statNum}>{perfil.total_propuestas.toLocaleString('es-CR')}</span>
            <span className={styles.statHelp}>{t.statPropuestasHelp}</span>
          </div>
          <div className={`${styles.statCard} ${styles.statCardLey}`}>
            <span className={styles.statLabel}>{t.statLeyesLabel}</span>
            <span className={`${styles.statNum} ${styles.statNumLey}`}>{perfil.total_leyes.toLocaleString('es-CR')}</span>
            <span className={styles.statHelp}>{t.statLeyesHelp}</span>
          </div>
          <div className={`${styles.statCard} ${perfil.tasa_aprobacion >= 10 ? styles.statCardAccent : ''}`}>
            <span className={styles.statLabel}>{t.statEficaciaLabel}</span>
            <span className={`${styles.statNum} ${perfil.tasa_aprobacion >= 10 ? styles.statNumAccent : ''}`}>
              {perfil.tasa_aprobacion}%
            </span>
            <span className={styles.statHelp}>{t.statEficaciaHelp}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>{t.statDiputadosLabel}</span>
            <span className={styles.statNum}>{perfil.total_diputados}</span>
            <span className={styles.statHelp}>{t.statDiputadosHelp}</span>
          </div>
        </div>

        {/* Por administración */}
        {perfil.por_administracion.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t.administracionTitle}</h2>
            <p className={styles.sectionDesc}>{t.administracionDesc}</p>
            <div className={styles.admBars}>
              {perfil.por_administracion.map(a => {
                const pct = Math.round((a.total_propuestas / maxAdm) * 100)
                const leyPct = Math.round((a.leyes_aprobadas / maxAdm) * 100)
                return (
                  <div key={a.administracion} className={styles.admRow}>
                    <div className={styles.admInfo}>
                      <div className={styles.admLabelGroup}>
                        <span className={styles.admLabel}>{a.administracion}</span>
                        <span className={styles.admDips}>
                          {a.total_diputados} {a.total_diputados === 1 ? t.dipSingular : t.dipPlural}
                        </span>
                      </div>
                      <div className={styles.admNums}>
                        <span className={styles.admTotal}>
                          {formatQuantity(a.total_propuestas, t.propuestaSingular, t.propuestaPlural)}
                        </span>
                        {a.leyes_aprobadas > 0 && (
                          <span className={styles.admLeyes}>
                            {a.leyes_aprobadas} {a.leyes_aprobadas === 1 ? t.leySingular : t.leyPlural}
                          </span>
                        )}
                        <span className={styles.admTasa}>{a.tasa_aprobacion}%</span>
                      </div>
                    </div>
                    <div className={styles.gaugeTrack}>
                      <div
                        className={styles.gaugeFill}
                        style={{ width: `${pct}%`, background: paleta.bg }}
                      />
                      {leyPct > 0 && (
                        <div className={styles.gaugeLey} style={{ width: `${leyPct}%` }} />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Top diputados */}
        {perfil.top_diputados.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t.topDiputadosTitle}</h2>
            <p className={styles.sectionDesc}>{t.topDiputadosDesc}</p>
            <div className={styles.dipList}>
              {perfil.top_diputados.map((d, i) => {
                const slug = encodeURIComponent(d.nombre_completo)
                return (
                  <Link
                    key={d.nombre_completo}
                    href={`/diputados/${slug}`}
                    className={styles.dipCard}
                  >
                    <span className={styles.dipRank}>{i + 1}</span>
                    <div
                      className={styles.dipAvatar}
                      style={{ background: paleta.soft, color: paleta.bg }}
                    >
                      {d.apellidos?.[0] ?? d.nombre?.[0] ?? '·'}
                    </div>
                    <div className={styles.dipBody}>
                      <span className={styles.dipName}>{d.nombre_completo}</span>
                      <div className={styles.dipMeta}>
                        <span>{d.total_proyectos} proyectos</span>
                        {d.leyes_aprobadas > 0 && (
                          <span className={styles.dipLeyes}>{d.leyes_aprobadas} leyes</span>
                        )}
                        <span className={styles.dipTasa}>{d.tasa_aprobacion}%</span>
                      </div>
                    </div>
                    <span className={styles.dipArrow}><IconChevron /></span>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* Por categoría */}
        {perfil.por_categoria.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t.categoriasTitle}</h2>
            <p className={styles.sectionDesc}>{t.categoriasDesc}</p>
            <div className={styles.catGrid}>
              {perfil.por_categoria.map(c => {
                const pct = Math.round((c.total / totalCats) * 100)
                return (
                  <Link
                    key={c.slug}
                    href={`/proyectos?categoria=${c.slug}`}
                    className={styles.catCard}
                  >
                    <div className={styles.catHeader}>
                      <span className={styles.catNombre}>{cleanText(c.categoria)}</span>
                      <span className={styles.catPct}>{pct}%</span>
                    </div>
                    <div className={styles.catBar}>
                      <div
                        className={styles.catBarFill}
                        style={{ width: `${pct}%`, background: paleta.bg }}
                      />
                    </div>
                    <div className={styles.catMeta}>
                      <span>{c.total} proyectos</span>
                      {c.leyes_aprobadas > 0 && (
                        <span className={styles.catLeyes}>{c.leyes_aprobadas} leyes</span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* Link to proyectos */}
        <div className={styles.footerLink}>
          <Link
            href={`/proyectos`}
            className={styles.verProyectosBtn}
          >
            {t.verProyectosPartido} <IconChevron />
          </Link>
        </div>
      </div>
    </div>
  )
}
