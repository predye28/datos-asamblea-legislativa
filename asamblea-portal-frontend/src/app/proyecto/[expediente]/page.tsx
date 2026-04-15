import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatTitle, formatName, formatQuantity, cleanText } from '@/lib/utils'
import styles from './detalle.module.css'

export const revalidate = 300

function fmtFecha(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function ProyectoDetallePage({
  params,
}: {
  params: Promise<{ expediente: string }>
}) {
  const { expediente } = await params
  const num = Number(expediente)
  if (isNaN(num)) notFound()

  let proyecto
  try {
    proyecto = await api.proyectos.detalle(num)
  } catch {
    notFound()
  }

  const {
    titulo, tipo_expediente, fecha_inicio, vencimiento_cuatrienal,
    fecha_publicacion, numero_gaceta, numero_ley,
    proponentes, tramitacion, documentos, es_ley, estado_actual, categorias,
  } = proyecto

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Back */}
      <div className={styles.backBar}>
        <div className="container">
          <Link href="/proyectos" className={styles.back}>← Volver a proyectos</Link>
        </div>
      </div>

      {/* Header */}
      <div className={`${styles.pageHero} ${es_ley ? styles.pageHeroLey : ''} animate-fadeup`}>
        <div className="container">
          <div className={styles.heroMeta}>
            <span className={styles.expNum}>Expediente {num}</span>
            {es_ley
              ? <span className={styles.badgeLey}>✓ Ley {numero_ley}</span>
              : <span className={styles.badgeActivo}>{cleanText(estado_actual) || 'En trámite'}</span>
            }
          </div>
          <h1 className={styles.heroTitle}>{formatTitle(titulo)}</h1>
          {tipo_expediente && (
            <div className={styles.heroType}>{cleanText(tipo_expediente)}</div>
          )}
        </div>
      </div>

      <div className="container">
        <div className={styles.layout}>

          {/* Main column */}
          <div className={styles.main}>

            {/* Datos maestros — Mosaic Layout */}
            <section className={styles.card}>
              <div className={styles.sectionTitle}>Detalles del expediente</div>
              <div className={styles.mosaicGrid}>
                <div className={styles.infoTile}>
                  <label>Fecha de inicio</label>
                  <span>{fmtFecha(fecha_inicio)}</span>
                </div>
                
                <div className={styles.infoTile}>
                  <label>Vencimiento cuatrienal</label>
                  <span className={!es_ley && vencimiento_cuatrienal ? styles.vencWarning : ''}>
                    {fmtFecha(vencimiento_cuatrienal)}
                    {!es_ley && vencimiento_cuatrienal && (() => {
                      const dias = Math.ceil((new Date(vencimiento_cuatrienal).getTime() - Date.now()) / 86400000)
                      return dias < 90 ? ` (${dias} días)` : ''
                    })()}
                  </span>
                </div>

                {numero_ley && (
                  <div className={styles.infoTile}>
                    <label>Número de Ley</label>
                    <span className={styles.positiveValue}>{numero_ley}</span>
                  </div>
                )}
                
                {fecha_publicacion && (
                  <div className={styles.infoTile}>
                    <label>Fecha de publicación</label>
                    <span>{fmtFecha(fecha_publicacion)}</span>
                  </div>
                )}

                {numero_gaceta && (
                  <div className={styles.infoTile}>
                    <label>Gaceta Oficial</label>
                    <span>#{numero_gaceta}</span>
                  </div>
                )}
                
                <div className={styles.infoTile}>
                  <label>Tipo de proyecto</label>
                  <span>{cleanText(tipo_expediente) || 'Ley Regular'}</span>
                </div>
              </div>
            </section>

            {/* Tramitación — línea de tiempo */}
            {tramitacion.length > 0 && (
              <section className={styles.card}>
                <div className={styles.sectionTitle}>
                  Historial de tramitación
                  <span className={styles.sectionCount}>{formatQuantity(tramitacion.length, 'paso', 'pasos')}</span>
                </div>
                <p className={styles.sectionExplain}>
                  El recorrido que hizo este proyecto por las comisiones y órganos de la Asamblea.
                </p>
                <div className={styles.timeline}>
                  {tramitacion.map((t, i) => (
                    <div key={i} className={styles.timelineItem}>
                      <div className={styles.timelineLine}>
                        <div className={`${styles.timelineDot} ${i === tramitacion.length - 1 ? styles.timelineDotLast : ''}`} />
                        {i < tramitacion.length - 1 && <div className={styles.timelineConnector} />}
                      </div>
                      <div className={styles.timelineContent}>
                        <div className={styles.timelineOrgano}>{cleanText(t.organo) || 'Órgano no especificado'}</div>
                        <div className={styles.timelineDates}>
                          {fmtFecha(t.fecha_inicio)}
                          {t.fecha_termino && ` → ${fmtFecha(t.fecha_termino)}`}
                        </div>
                        {t.tipo_tramite && (
                          <div className={styles.timelineTipo}>{cleanText(t.tipo_tramite)}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Documentos */}
            {documentos.length > 0 && (
              <section className={styles.card}>
                <div className={styles.sectionTitle}>Documentos adjuntos</div>
                {documentos.map((d, i) => (
                  <div key={i} className={styles.docItem}>
                    <span className={styles.docType}>{d.tipo?.toUpperCase() || 'DOC'}</span>
                    <span className={styles.docPath}>{d.ruta_archivo}</span>
                  </div>
                ))}
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className={styles.sidebar}>
            {/* Proponentes — PRIMERO */}
            <section className={styles.sideCard}>
              <div className={styles.sideTitle}>
                Proponentes
                <span className={styles.sectionCount}>{proponentes.length}</span>
              </div>
              <p className={styles.sideExplain}>Diputados que firmaron este proyecto</p>
              <ul className={styles.propList}>
                {proponentes.map((p, i) => (
                  <li key={i} className={styles.propItem}>
                    <Link
                      href={`/diputados/${encodeURIComponent((p.nombre_completo || '').trim())}`}
                      className={styles.propLink}
                    >
                      <span className={styles.propName}>
                        {formatName(p.nombre_completo)}
                      </span>
                      <span className={styles.propArrow}>→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            {/* Categorías temáticas — SEGUNDO */}
            {categorias && categorias.length > 0 && (
              <section className={styles.sideCard}>
                <div className={styles.sideTitle}>Tema{categorias.length !== 1 ? 's' : ''}</div>
                <p className={styles.sideExplain}>Categorías temáticas de este proyecto</p>
                <div className={styles.catLinks}>
                  {categorias.map(cat => (
                    <Link
                      key={cat.slug}
                      href={`/proyectos?categoria=${cat.slug}`}
                      className={styles.catLink}
                    >
                      {cleanText(cat.nombre)}
                      <span className={styles.propArrow}>→</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Contexto educativo */}
            <section className={styles.sideCard}>
              <div className={styles.sideTitle}>¿Cómo funciona esto?</div>
              <div className={styles.contextBox}>
                <p>Un <strong>proyecto de ley</strong> es una propuesta formal para crear, modificar o derogar una ley.</p>
                <p>Debe ser aprobado por la mayoría de la Asamblea para convertirse en ley.</p>
                <p>Si pasa 4 años sin ser votado, <strong>vence automáticamente</strong>.</p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}
