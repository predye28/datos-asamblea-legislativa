'use client'
// src/components/sections/ProximosVencer.tsx
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api, type ProximoVencer } from '@/lib/api'
import LoadingIndicator from '@/components/ui/LoadingIndicator'
import styles from './ProximosVencer.module.css'

interface Props {
  datos?: ProximoVencer[]
  clientMode?: boolean
  maxItems?: number
  esPaginaDedicada?: boolean
  hideHeader?: boolean
}

function urgencyColorHex(dias: number) {
  if (dias <= 30) return '#ef4444' // red-500
  if (dias <= 60) return '#f59e0b' // amber-500
  return '#3b82f6' // blue-500 (más serio que el verde para "Próximo")
}

function urgencyColorRgba(dias: number, alpha: number) {
  if (dias <= 30) return `rgba(239, 68, 68, ${alpha})`
  if (dias <= 60) return `rgba(245, 158, 11, ${alpha})`
  return `rgba(59, 130, 246, ${alpha})`
}

function urgencyLabel(dias: number) {
  if (dias <= 30) return 'Crítico'
  if (dias <= 60) return 'Urgente'
  return 'Próximo'
}

function formatTitle(title: string | null) {
  if (!title) return 'Sin título';
  const text = title.toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatName(name: string) {
  return name.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function formatProponentes(texto: string | null) {
  if (!texto) return null;
  const list = texto.split(',').filter(x => x.trim().length > 0);
  if (list.length === 0) return null;
  const first = list[0].trim();
  const titleCaseFirst = formatName(first);
  if (list.length > 1) {
    return `${titleCaseFirst} y ${list.length - 1} más`;
  }
  return titleCaseFirst;
}

const OPCIONES_DIAS = [
  { label: 'En los próximos 30 días', value: 30 },
  { label: 'En los próximos 60 días', value: 60 },
  { label: 'En los próximos 90 días', value: 90 },
  { label: 'En los próximos 180 días', value: 180 },
]

export default function ProximosVencer({
  datos: datosProp,
  clientMode = false,
  maxItems,
  esPaginaDedicada = false,
  hideHeader = false
}: Props) {
  const router = useRouter()
  // Si no es página dedicada, por defecto buscamos en rango amplio para asegurar siempre encontrar los 5 más cercanos
  const [diasFiltro, setDiasFiltro] = useState(esPaginaDedicada ? 90 : 180)
  const [datos, setDatos] = useState<ProximoVencer[]>(datosProp || [])
  const [loading, setLoading] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  useEffect(() => {
    if (!clientMode && datosProp) {
      return
    }
    setLoading(true)
    api.metricas.proximosVencer(diasFiltro)
      .then(r => setDatos(r.datos))
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [diasFiltro, clientMode])

  // Click outside para cerrar dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (isDropdownOpen) setIsDropdownOpen(false)
    }
    document.addEventListener('click', handleOutsideClick)
    return () => document.removeEventListener('click', handleOutsideClick)
  }, [isDropdownOpen])

  const datosFiltrados = clientMode ? datos : (datosProp || [])
  const datosAMostrar = maxItems ? datosFiltrados.slice(0, maxItems) : datosFiltrados

  if (!clientMode && datosAMostrar.length === 0) return null

  return (
    <div className={`${styles.wrapper} ${esPaginaDedicada ? styles.wrapperDedicado : styles.block}`}>
      {!esPaginaDedicada && !hideHeader && (
        <div className={styles.blockHeader}>
          <div>
            {/* <div className={styles.kicker}>Seguimiento de vigencia</div> */}
            <div className={styles.title}>Expedientes próximos a vencer</div>
            <p className={styles.explanation}>
              Según el Reglamento de la Asamblea, los proyectos tienen un plazo cuatrienal de vigencia.
              Aquí se muestran las 5 iniciativas más próximas a cumplir su periodo y ser enviadas al archivo.
            </p>
          </div>
        </div>
      )}

      {esPaginaDedicada && clientMode && (
        <div className={styles.filterContainerWrapper}>
          <div className={styles.filterContainer} onClick={e => e.stopPropagation()}>
            <button
              type="button"
              className={styles.filterToggle}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              {OPCIONES_DIAS.find(op => op.value === diasFiltro)?.label || 'Rango de tiempo'}
              <span className={`${styles.toggleIcon} ${isDropdownOpen ? styles.toggleIconOpen : ''}`}>▼</span>
            </button>
            <div className={`${styles.filterRow} ${isDropdownOpen ? styles.filterRowOpen : ''}`}>
              {OPCIONES_DIAS.map(op => (
                <button
                  key={op.value}
                  className={`${styles.chip} ${diasFiltro === op.value ? styles.chipActive : ''}`}
                  onClick={() => { setDiasFiltro(op.value); setIsDropdownOpen(false); }}
                >
                  {op.label}
                </button>
              ))}
            </div>
          </div>
          {!loading && (
            <div className={styles.resultsCount}>
              Mostrando {datosFiltrados.length} expediente{datosFiltrados.length !== 1 ? 's' : ''} en este periodo
            </div>
          )}
        </div>
      )}

      {loading ? (
        <LoadingIndicator text="Consultando expedientes en riesgo..." />
      ) : datosFiltrados.length === 0 ? (
        <div className={styles.emptyMsg}>No hay proyectos próximos a vencer en este período.</div>
      ) : (
        <div className={styles.grid}>
          {datosAMostrar.map(p => {
            const colorHex = urgencyColorHex(p.dias_restantes)
            const colorRgba = urgencyColorRgba(p.dias_restantes, 0.1)

            return (
              <article
                key={p.numero_expediente}
                className={styles.card}
                onClick={() => router.push(`/proyecto/${p.numero_expediente}`)}
                style={{ '--urgency-color': colorHex, '--urgency-bg': colorRgba } as React.CSSProperties}
              >
                <div className={styles.cardBorder} />
                <div className={styles.cardHeader}>
                  <div className={styles.cardHeaderTop}>
                    <span className={styles.urgencyBadge}>
                      Quedan {p.dias_restantes} días — {urgencyLabel(p.dias_restantes)}
                    </span>
                    <span className={styles.expNum}>Exp. {p.numero_expediente}</span>
                  </div>
                  <h2 className={styles.cardTitle}>{formatTitle(p.titulo || '')}</h2>
                </div>

                <div className={styles.cardInfo}>
                  {p.proponentes_resumen && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Proponente:</span>
                      <span className={styles.infoValue}>{formatProponentes(p.proponentes_resumen)}</span>
                    </div>
                  )}
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Estado:</span>
                    <div className={styles.tagsContainer}>
                      <span className={styles.badge}>
                        Sin convertir en ley
                      </span>
                      {p.estado_actual && (
                        <span className={styles.badge}>
                          {formatTitle(p.estado_actual.slice(0, 40))}
                        </span>
                      )}
                      {p.tipo_expediente && (
                        <span className={styles.badge}>
                          {formatTitle(p.tipo_expediente)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {!loading && !esPaginaDedicada && datosFiltrados.length > (maxItems || 0) && (
        <div className={styles.verMasWrap}>
          <button
            className={styles.verMasBtn}
            onClick={() => router.push('/vencimientos')}
          >
            Ver catálogo completo ({datosFiltrados.length} expedientes) →
          </button>
        </div>
      )}
    </div>
  )
}
