'use client'

import Link from 'next/link'
import type { ProyectoDetalle } from '@/lib/api'
import { formatTitle, formatDiputadoName, formatDate, cleanText } from '@/lib/utils'
import { useT } from '@/i18n/LanguageProvider'
import styles from './detalle.module.css'

function IconArrowLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
    </svg>
  )
}
function IconCalendar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}
function IconUser() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  )
}
function IconScale() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
      <path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
    </svg>
  )
}
function IconClock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}
function IconFile() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  )
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function DetalleClient({ proyecto }: { proyecto: ProyectoDetalle }) {
  const { dict } = useT()

  const dias = daysUntil(proyecto.vencimiento_cuatrienal)
  const diasStr = dias !== null
    ? dias > 0 ? dict.proyectoDetalle.diasRestantes(dias) : dict.proyectoDetalle.vencido
    : null

  const esLeyAprobadaSi = proyecto.numero_ley?.toUpperCase() === 'SI'

  return (
    <div className={styles.page}>

      <div className={styles.backBar}>
        <div className={styles.container}>
          <Link href="/proyectos" className={styles.backLink}>
            <IconArrowLeft /> {dict.proyectoDetalle.backToList}
          </Link>
        </div>
      </div>

      <header className={`${styles.header} ${proyecto.es_ley ? styles.headerLey : ''}`}>
        <div className={styles.headerDots} aria-hidden />
        <div className={styles.container}>
          <div className={styles.headerMeta}>
            <span className={styles.expNum}>
              {dict.proyectoDetalle.expedienteN} {proyecto.numero_expediente}
            </span>
            {proyecto.es_ley ? (
              <span className={styles.badgeLey}>
                <IconScale />{' '}
                {esLeyAprobadaSi || !proyecto.numero_ley
                  ? dict.proyectoDetalle.leyAprobada
                  : dict.proyectoDetalle.leyN(proyecto.numero_ley)}
              </span>
            ) : proyecto.estado_actual ? (
              // Texto oficial del SIL — no se traduce
              <span className={styles.badgeEstado}>{cleanText(proyecto.estado_actual)}</span>
            ) : null}
            {proyecto.tipo_expediente && (
              // Tipo oficial del SIL — no se traduce
              <span className={styles.badgeTipo}>{proyecto.tipo_expediente}</span>
            )}
          </div>
          {/* Nombre del expediente — NO se traduce (nombre legal oficial) */}
          <h1 className={styles.headerTitle}>{formatTitle(proyecto.titulo, dict.estado.sinTitulo)}</h1>
        </div>
      </header>

      <div className={styles.body}>
        <div className={styles.container}>
          <div className={styles.layout}>

            <main className={styles.main}>

              <section className={styles.card}>
                <h2 className={styles.cardTitle}>{dict.proyectoDetalle.cardTitleDetalles}</h2>
                <div className={styles.metaGrid}>
                  {proyecto.fecha_inicio && (
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}><IconCalendar /> {dict.proyectoDetalle.fechaInicio}</span>
                      <span className={styles.metaValue}>{formatDate(proyecto.fecha_inicio, dict.common.locale)}</span>
                    </div>
                  )}
                  {proyecto.vencimiento_cuatrienal && (
                    <div className={`${styles.metaItem} ${dias !== null && dias < 90 && dias > 0 ? styles.metaWarning : ''}`}>
                      <span className={styles.metaLabel}><IconClock /> {dict.proyectoDetalle.vencimientoCuatrienal}</span>
                      <span className={styles.metaValue}>{formatDate(proyecto.vencimiento_cuatrienal, dict.common.locale)}</span>
                      {diasStr && <span className={styles.metaSub}>{diasStr}</span>}
                    </div>
                  )}
                  {proyecto.numero_ley && (
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>
                        <IconScale /> {esLeyAprobadaSi ? dict.proyectoDetalle.estadoDeLey : dict.proyectoDetalle.numeroDeLey}
                      </span>
                      <span className={`${styles.metaValue} ${styles.metaAccentPositive}`}>
                        {esLeyAprobadaSi ? dict.proyectoDetalle.leyAprobada : dict.proyectoDetalle.leyN(proyecto.numero_ley)}
                      </span>
                    </div>
                  )}
                  {proyecto.fecha_publicacion && (
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}><IconCalendar /> {dict.proyectoDetalle.fechaPublicacion}</span>
                      <span className={styles.metaValue}>{formatDate(proyecto.fecha_publicacion, dict.common.locale)}</span>
                    </div>
                  )}
                  {proyecto.numero_gaceta && (
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}><IconFile /> {dict.proyectoDetalle.numeroGaceta}</span>
                      <span className={styles.metaValue}>{proyecto.numero_gaceta}</span>
                    </div>
                  )}
                  {proyecto.tipo_expediente && (
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}><IconFile /> {dict.proyectoDetalle.tipoProyecto}</span>
                      {/* Tipo oficial del SIL — no se traduce */}
                      <span className={styles.metaValue}>{proyecto.tipo_expediente}</span>
                    </div>
                  )}
                </div>
              </section>

              {proyecto.tramitacion.length > 0 && (
                <section className={styles.card}>
                  <h2 className={styles.cardTitle}>{dict.proyectoDetalle.historialTramitacion}</h2>
                  <div className={styles.timeline}>
                    {proyecto.tramitacion.map((t, i) => (
                      <div key={i} className={`${styles.tramite} ${i === 0 ? styles.tramiteFirst : ''}`}>
                        <div className={styles.tramiteDot} />
                        <div className={styles.tramiteContent}>
                          {/* Órgano y tipo de trámite — vienen del SIL, no se traducen */}
                          <p className={styles.tramiteOrgano}>{cleanText(t.organo) || '—'}</p>
                          {t.tipo_tramite && (
                            <p className={styles.tramiteTipo}>{cleanText(t.tipo_tramite)}</p>
                          )}
                          <p className={styles.tramiteFechas}>
                            {formatDate(t.fecha_inicio, dict.common.locale)}
                            {t.fecha_termino && ` → ${formatDate(t.fecha_termino, dict.common.locale)}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

            </main>

            <aside className={styles.sidebar}>

              <div className={styles.sideCard}>
                <h3 className={styles.sideTitle}><IconUser /> {dict.proyectoDetalle.proponentes}</h3>
                {proyecto.proponentes.length > 0 ? (
                  <ul className={styles.proponenteList}>
                    {proyecto.proponentes.map((p, i) => {
                      const nombreCompleto = p.nombre_completo || `${p.nombre} ${p.apellidos}`.trim()
                      return (
                        <li key={i} className={styles.proponente}>
                          <Link
                            href={`/diputados/${encodeURIComponent(nombreCompleto)}`}
                            className={styles.proponenteLink}
                          >
                            {/* Nombre del diputado — no se traduce */}
                            {formatDiputadoName(nombreCompleto)}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className={styles.sideEmpty}>{dict.proyectoDetalle.sinInformacion}</p>
                )}
              </div>

              {proyecto.categorias.length > 0 && (
                <div className={styles.sideCard}>
                  <h3 className={styles.sideTitle}>
                    {dict.proyectoDetalle.temas}
                    <span
                      className={styles.sideHint}
                      tabIndex={0}
                      role="button"
                      aria-label={dict.proyectoDetalle.temasHelpAria}
                    >
                      ?
                      <span className={styles.sideHintTooltip} role="tooltip">
                        {dict.proyectoDetalle.temasHelpTooltip}
                      </span>
                    </span>
                  </h3>
                  <div className={styles.tagCloud}>
                    {proyecto.categorias.map(c => (
                      <Link
                        key={c.slug}
                        href={`/proyectos?categoria=${c.slug}`}
                        className={styles.tagLink}
                      >
                        {/* Categoría oficial — no se traduce */}
                        {c.nombre}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className={`${styles.sideCard} ${styles.sideContext}`}>
                <h3 className={styles.sideTitle}>{dict.proyectoDetalle.comoFunciona}</h3>
                <p className={styles.sideText}>{dict.proyectoDetalle.comoFuncionaText}</p>
                <Link href="/acerca" className={styles.sideLearnMore}>{dict.proyectoDetalle.saberMas}</Link>
              </div>

            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}
