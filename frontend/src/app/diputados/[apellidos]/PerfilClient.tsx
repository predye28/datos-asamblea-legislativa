'use client'

import Link from 'next/link'
import type { PerfilDiputado, HistorialPartido } from '@/lib/api'
import { formatTitle, formatDate, formatQuantity, formatDiputadoName, cleanText } from '@/lib/utils'
import { EstadoChip } from '@/components/ui/EstadoChip'
import { useT } from '@/i18n/LanguageProvider'
import { getPaletaPartido, getBanderaUrl } from '@/lib/partidos'
import { DiputadoAvatar } from '@/components/ui/DiputadoAvatar'
import styles from './perfil.module.css'

function avatarHue(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360
  return h
}

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

interface Props {
  perfil: PerfilDiputado
  apellidosRaw: string
}

export default function PerfilClient({ perfil, apellidosRaw }: Props) {
  const { dict } = useT()
  const t = dict.diputadoDetalle

  const nombreDisplay = formatDiputadoName(apellidosRaw)
  const maxPeriodo = Math.max(...perfil.por_periodo.map(p => p.total), 1)
  const totalTemas = perfil.temas.reduce((s, t) => s + t.total, 0) || 1
  const temaTop = perfil.temas[0]
  const hue = avatarHue(apellidosRaw)
  const inicioActividad = perfil.primer_proyecto
    ? new Date(perfil.primer_proyecto).getFullYear()
    : null

  // Partido más reciente
  const historialPartidos: HistorialPartido[] = perfil.historial_partidos ?? []
  const partidoActual = historialPartidos[0] ?? null
  const paleta = partidoActual ? getPaletaPartido(partidoActual.partido_codigo) : null

  // Agrupar historial por administración para mostrar compacto
  const historialPorAdm = historialPartidos.reduce<Record<string, HistorialPartido[]>>((acc, h) => {
    if (!acc[h.administracion]) acc[h.administracion] = []
    acc[h.administracion].push(h)
    return acc
  }, {})

  return (
    <div className={styles.page}>

      <div className={styles.backBar}>
        <Link href="/diputados" className={styles.backBtn}>
          <IconArrowLeft /> {t.backToList}
        </Link>
      </div>

      <section className={styles.hero}>
        <div className={styles.heroDots} aria-hidden />
        <div className={styles.heroInner}>
          <DiputadoAvatar
            nombreCompleto={apellidosRaw}
            size="lg"
            partyColor={paleta?.bg}
            hue={hue}
          />
          <div className={styles.heroText}>
            <span className={styles.heroEyebrow}>{t.heroEyebrow}</span>
            {/* Nombre del diputado — NO se traduce */}
            <h1 className={styles.heroName}>{nombreDisplay}</h1>

            <p className={styles.heroSub}>{t.heroSub}</p>
            {perfil.primer_proyecto && (
              <p className={styles.heroRange}>
                {t.registrosDesde(new Date(perfil.primer_proyecto).getFullYear())}
                {perfil.ultimo_proyecto && t.ultimoProyecto(formatDate(perfil.ultimo_proyecto, dict.common.locale))}
              </p>
            )}
            {temaTop && (
              <p className={styles.heroQuote}>
                {t.temaMasFrecuentePrefix}{' '}
                {/* Nombre del tema — viene del SIL, no se traduce */}
                <strong>{cleanText(temaTop.tema)}</strong>{' '}
                <span className={styles.heroQuoteDim}>
                  {t.porcentajeProyectos(Math.round((temaTop.total / totalTemas) * 100))}
                </span>
              </p>
            )}
          </div>
        </div>
      </section>

      <div className={styles.container}>

        <div className={styles.statGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>{t.statProyectosLabel}</span>
            <span className={styles.statNum}>{perfil.total_proyectos}</span>
            <span className={styles.statHelp}>{t.statProyectosHelp}</span>
          </div>
          <div className={`${styles.statCard} ${styles.statCardLey}`}>
            <span className={styles.statLabel}>{t.statLeyesLabel}</span>
            <span className={`${styles.statNum} ${styles.statNumLey}`}>{perfil.total_leyes}</span>
            <span className={styles.statHelp}>{t.statLeyesHelp}</span>
          </div>
          <div className={`${styles.statCard} ${perfil.tasa_aprobacion >= 15 ? styles.statCardAccent : ''}`}>
            <span className={styles.statLabel}>{t.statEficaciaLabel}</span>
            <span className={`${styles.statNum} ${perfil.tasa_aprobacion >= 15 ? styles.statNumAccent : ''}`}>
              {perfil.tasa_aprobacion}%
            </span>
            <span className={styles.statHelp}>{t.statEficaciaHelp}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>{t.statActivoDesdeLabel}</span>
            <span className={styles.statNum}>{inicioActividad || '—'}</span>
            <span className={styles.statHelp}>{t.statActivoDesdeHelp}</span>
          </div>
        </div>

        {historialPartidos.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t.partidosTitle}</h2>
            <p className={styles.sectionDesc}>{t.partidosDesc}</p>
            <div className={styles.partidosGrid}>
              <div className={styles.partidoCardGroup}>
                <h3 className={styles.partidoCardLabel}>{t.partidoActual}</h3>
                <div className={styles.partidoCardList}>
                  <Link
                    href={`/partidos/${partidoActual!.partido_codigo}`}
                    className={`${styles.partidoCard} ${styles.partidoCardCurrent}`}
                    style={{ '--partido-color': paleta!.bg } as React.CSSProperties}
                  >
                    {getBanderaUrl(partidoActual!.partido_codigo)
                      ? <img src={getBanderaUrl(partidoActual!.partido_codigo)!} alt="" className={styles.partidoCardBandera} aria-hidden />
                      : <div className={styles.partidoCardSwatch} style={{ background: paleta!.bg }} />
                    }
                    <div className={styles.partidoCardInfo}>
                      <span className={styles.partidoCardNombre}>{formatTitle(partidoActual!.partido_nombre)}</span>
                      <span className={styles.partidoCardAdm}>{partidoActual!.administracion}</span>
                    </div>
                    <IconChevron />
                  </Link>
                </div>
              </div>

              {historialPartidos.length > 1 && (
                <div className={styles.partidoCardGroup}>
                  <h3 className={styles.partidoCardLabel}>{t.partidosAnteriores}</h3>
                  <div className={styles.partidoCardList}>
                    {historialPartidos.slice(1).map((h, idx) => {
                      const p = getPaletaPartido(h.partido_codigo)
                      return (
                        <Link
                          key={`${h.partido_codigo}-${idx}`}
                          href={`/partidos/${h.partido_codigo}`}
                          className={styles.partidoCard}
                          style={{ '--partido-color': p.bg } as React.CSSProperties}
                        >
                          {getBanderaUrl(h.partido_codigo)
                            ? <img src={getBanderaUrl(h.partido_codigo)!} alt="" className={styles.partidoCardBandera} aria-hidden />
                            : <div className={styles.partidoCardSwatch} style={{ background: p.bg }} />
                          }
                          <div className={styles.partidoCardInfo}>
                            <span className={styles.partidoCardNombre}>{formatTitle(h.partido_nombre)}</span>
                            <span className={styles.partidoCardAdm}>{h.administracion}</span>
                          </div>
                          <IconChevron />
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {perfil.por_periodo.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t.periodosTitle}</h2>
            <p className={styles.sectionDesc}>{t.periodosDesc}</p>
            <div className={styles.periodoBars}>
              {perfil.por_periodo.map(p => {
                const pct    = Math.round((p.total / maxPeriodo) * 100)
                const leyPct = Math.round((p.leyes / maxPeriodo) * 100)
                const partidos = historialPorAdm[p.periodo] ?? []
                return (
                  <div key={p.periodo} className={styles.periodoRow}>
                    <div className={styles.periodoInfo}>
                      {/* Período + partido(s) fusionado */}
                      <div className={styles.periodoLabelGroup}>
                        <span className={styles.periodoLabel}>{p.periodo}</span>
                        {partidos.length > 0 && (
                          <div className={styles.periodoPartidos}>
                            {partidos.map((h, i) => {
                              const pp = getPaletaPartido(h.partido_codigo)
                              return (
                                <span key={i} className={styles.periodoPartidoItem}>
                                  {getBanderaUrl(h.partido_codigo)
                                  ? <img src={getBanderaUrl(h.partido_codigo)!} alt="" className={styles.periodoFlagBandera} aria-hidden />
                                  : <span className={styles.periodoFlagSwatch} style={{ background: pp.bg }} />
                                }
                                  <span className={styles.periodoPartidoNombre}>
                                    {h.partido_nombre}
                                  </span>
                                  {partidos.length > 1 && h.fecha_desde && (
                                    <span className={styles.periodoPartidoAno}>
                                      {new Date(h.fecha_desde).getFullYear()}
                                    </span>
                                  )}
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </div>
                      <div className={styles.periodoNums}>
                        <span className={styles.periodoTotal}>
                          {formatQuantity(p.total, t.proyectoSingular, t.proyectoPlural)}
                        </span>
                        {p.leyes > 0 && (
                          <span className={styles.periodoLeyes}>
                            {p.leyes} {p.leyes === 1 ? t.leySingular : t.leyPlural}
                          </span>
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

        {perfil.temas.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t.temasTitle}</h2>
            <p className={styles.sectionDesc}>
              {t.temasDescPrefix} {perfil.total_proyectos} {t.temasDescSuffix}
            </p>
            <div className={styles.temasGrid}>
              {perfil.temas.map(tm => {
                const pct = Math.round((tm.total / totalTemas) * 100)
                return (
                  <Link
                    key={tm.slug}
                    href={`/proyectos?q=${encodeURIComponent(apellidosRaw)}&categoria=${tm.slug}`}
                    className={styles.temaCard}
                  >
                    <div className={styles.temaHeader}>
                      {/* Nombre del tema — no se traduce */}
                      <span className={styles.temaNombre}>{cleanText(tm.tema)}</span>
                      <span className={styles.temaCount}>{pct}%</span>
                    </div>
                    <div className={styles.temaBar}>
                      <div
                        className={styles.temaBarFill}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={styles.temaMeta}>
                      {tm.total} {tm.total === 1 ? t.proyectoSingular : t.proyectoPlural}
                    </span>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {perfil.ultimos_proyectos.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t.actividadTitle}</h2>
            <p className={styles.sectionDesc}>{t.actividadDesc}</p>
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
                        <span className={styles.pcExp}>{t.expedientePrefix} {p.numero_expediente}</span>
                        <EstadoChip
                          estadoActual={p.estado_actual}
                          estadoGrupo={p.estado_grupo}
                          esLey={isLey}
                          numeroLey={p.numero_ley}
                          size="sm"
                        />
                      </div>
                      {/* Nombre del expediente — no se traduce */}
                      <h3 className={styles.pcTitle}>{formatTitle(p.titulo, dict.estado.sinTitulo)}</h3>
                      <div className={styles.pcMeta}>
                        {p.fecha_inicio && <span className={styles.pcDate}>{formatDate(p.fecha_inicio, dict.common.locale)}</span>}
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
              {t.verTodos} <IconChevron />
            </Link>
          </section>
        )}

      </div>
    </div>
  )
}
