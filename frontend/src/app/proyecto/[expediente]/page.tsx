import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { api } from '@/lib/api'
import { formatTitle, formatDiputadoName, formatDate, cleanText } from '@/lib/utils'
import styles from './detalle.module.css'

export const revalidate = 300

interface Props { params: Promise<{ expediente: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { expediente } = await params
  const num = parseInt(expediente, 10)
  if (isNaN(num)) return { title: 'Proyecto no encontrado' }
  try {
    const p = await api.proyectos.detalle(num)
    const titulo = formatTitle(p.titulo)
    const title = `Exp. ${p.numero_expediente} — ${titulo.slice(0, 80)}`
    const desc = p.es_ley
      ? `Ley N° ${p.numero_ley} · ${titulo}`
      : `${p.estado_actual || 'Proyecto de ley'} · ${titulo}`
    return {
      title,
      description: desc.slice(0, 180),
      openGraph: { title, description: desc.slice(0, 180), type: 'article' },
      twitter: { title, description: desc.slice(0, 180) },
      alternates: { canonical: `/proyecto/${num}` },
    }
  } catch {
    return { title: `Expediente ${expediente}` }
  }
}

// ── Icons ────────────────────────────────────────────────────────────────────
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function DetallePage({ params }: Props) {
  const { expediente } = await params
  const num = parseInt(expediente, 10)
  if (isNaN(num)) notFound()

  let proyecto
  try {
    proyecto = await api.proyectos.detalle(num)
  } catch {
    notFound()
  }

  const dias = daysUntil(proyecto.vencimiento_cuatrienal)
  const diasStr = dias !== null
    ? dias > 0 ? `${dias} días restantes` : 'Vencido'
    : null

  return (
    <div className={styles.page}>

      {/* ── Back ── */}
      <div className={styles.backBar}>
        <div className={styles.container}>
          <Link href="/proyectos" className={styles.backLink}>
            <IconArrowLeft /> Volver a proyectos
          </Link>
        </div>
      </div>

      {/* ── Header ── */}
      <header className={`${styles.header} ${proyecto.es_ley ? styles.headerLey : ''}`}>
        <div className={styles.headerDots} aria-hidden />
        <div className={styles.container}>
          <div className={styles.headerMeta}>
            <span className={styles.expNum}>Expediente N° {proyecto.numero_expediente}</span>
            {proyecto.es_ley ? (
              <span className={styles.badgeLey}><IconScale /> Ley N° {proyecto.numero_ley}</span>
            ) : proyecto.estado_actual ? (
              <span className={styles.badgeEstado}>{cleanText(proyecto.estado_actual)}</span>
            ) : null}
            {proyecto.tipo_expediente && (
              <span className={styles.badgeTipo}>{proyecto.tipo_expediente}</span>
            )}
          </div>
          <h1 className={styles.headerTitle}>{formatTitle(proyecto.titulo)}</h1>
        </div>
      </header>

      {/* ── Body ── */}
      <div className={styles.body}>
        <div className={styles.container}>
          <div className={styles.layout}>

            {/* ── Main column ── */}
            <main className={styles.main}>

              {/* Detalles */}
              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Detalles del expediente</h2>
                <div className={styles.metaGrid}>
                  {proyecto.fecha_inicio && (
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}><IconCalendar /> Fecha de inicio</span>
                      <span className={styles.metaValue}>{formatDate(proyecto.fecha_inicio)}</span>
                    </div>
                  )}
                  {proyecto.vencimiento_cuatrienal && (
                    <div className={`${styles.metaItem} ${dias !== null && dias < 90 && dias > 0 ? styles.metaWarning : ''}`}>
                      <span className={styles.metaLabel}><IconClock /> Vencimiento cuatrienal</span>
                      <span className={styles.metaValue}>{formatDate(proyecto.vencimiento_cuatrienal)}</span>
                      {diasStr && <span className={styles.metaSub}>{diasStr}</span>}
                    </div>
                  )}
                  {proyecto.numero_ley && (
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}><IconScale /> Número de ley</span>
                      <span className={`${styles.metaValue} ${styles.metaAccentPositive}`}>Ley N° {proyecto.numero_ley}</span>
                    </div>
                  )}
                  {proyecto.fecha_publicacion && (
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}><IconCalendar /> Fecha de publicación</span>
                      <span className={styles.metaValue}>{formatDate(proyecto.fecha_publicacion)}</span>
                    </div>
                  )}
                  {proyecto.numero_gaceta && (
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}><IconFile /> Gaceta oficial</span>
                      <span className={styles.metaValue}>N° {proyecto.numero_gaceta}</span>
                    </div>
                  )}
                  {proyecto.tipo_expediente && (
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}><IconFile /> Tipo de proyecto</span>
                      <span className={styles.metaValue}>{proyecto.tipo_expediente}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Tramitación */}
              {proyecto.tramitacion.length > 0 && (
                <section className={styles.card}>
                  <h2 className={styles.cardTitle}>Historial de tramitación</h2>
                  <div className={styles.timeline}>
                    {proyecto.tramitacion.map((t, i) => (
                      <div key={i} className={`${styles.tramite} ${i === 0 ? styles.tramiteFirst : ''}`}>
                        <div className={styles.tramiteDot} />
                        <div className={styles.tramiteContent}>
                          <p className={styles.tramiteOrgano}>{cleanText(t.organo) || '—'}</p>
                          {t.tipo_tramite && (
                            <p className={styles.tramiteTipo}>{cleanText(t.tipo_tramite)}</p>
                          )}
                          <p className={styles.tramiteFechas}>
                            {formatDate(t.fecha_inicio)}
                            {t.fecha_termino && ` → ${formatDate(t.fecha_termino)}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Documentos */}
              {proyecto.documentos.length > 0 && (
                <section className={styles.card}>
                  <h2 className={styles.cardTitle}>Documentos adjuntos</h2>
                  <div className={styles.docList}>
                    {proyecto.documentos.map((doc, i) => (
                      <div key={i} className={styles.docItem}>
                        <IconFile />
                        <span className={styles.docTipo}>{cleanText(doc.tipo) || 'Documento'}</span>
                        {doc.ruta_archivo && (
                          <span className={styles.docPath}>{doc.ruta_archivo}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

            </main>

            {/* ── Sidebar ── */}
            <aside className={styles.sidebar}>

              {/* Proponentes */}
              <div className={styles.sideCard}>
                <h3 className={styles.sideTitle}><IconUser /> Proponentes</h3>
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
                            {formatDiputadoName(nombreCompleto)}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className={styles.sideEmpty}>Sin información</p>
                )}
              </div>

              {/* Temas */}
              {proyecto.categorias.length > 0 && (
                <div className={styles.sideCard}>
                  <h3 className={styles.sideTitle}>Temas</h3>
                  <div className={styles.tagCloud}>
                    {proyecto.categorias.map(c => (
                      <Link
                        key={c.slug}
                        href={`/proyectos?categoria=${c.slug}`}
                        className={styles.tagLink}
                      >
                        {c.nombre}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Contexto */}
              <div className={`${styles.sideCard} ${styles.sideContext}`}>
                <h3 className={styles.sideTitle}>¿Cómo funciona esto?</h3>
                <p className={styles.sideText}>
                  Un proyecto de ley debe pasar por comisiones y el plenario antes de convertirse en ley.
                  El historial de tramitación muestra cada etapa que ha recorrido este expediente.
                </p>
                <Link href="/acerca" className={styles.sideLearnMore}>Saber más →</Link>
              </div>

            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}
