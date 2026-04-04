'use client'
// src/components/sections/ProximosVencer.tsx
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api, type ProximoVencer } from '@/lib/api'
import LoadingIndicator from '@/components/ui/LoadingIndicator'
import styles from './ProximosVencer.module.css'

interface Props {
  // Si se pasan datos directamente (server component), se usan esos
  datos?: ProximoVencer[]
  // Si es cliente, carga los datos internamente
  clientMode?: boolean
}

function urgencyColor(dias: number) {
  if (dias <= 30) return '#c0392b'
  if (dias <= 60) return '#e67e22'
  return '#2a7d4f'
}

function urgencyLabel(dias: number) {
  if (dias <= 30) return 'Crítico'
  if (dias <= 60) return 'Urgente'
  return 'Próximo'
}

const OPCIONES_DIAS = [
  { label: '30 días', value: 30 },
  { label: '60 días', value: 60 },
  { label: '90 días', value: 90 },
  { label: '180 días', value: 180 },
]

export default function ProximosVencer({ datos: datosProp, clientMode = false }: Props) {
  const [diasFiltro, setDiasFiltro] = useState(90)
  const [datos, setDatos] = useState<ProximoVencer[]>(datosProp || [])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!clientMode && datosProp) {
      // Filtrar localmente si hay datos pasados por props
      return
    }
    // Modo cliente: recargar desde API al cambiar los días
    setLoading(true)
    api.metricas.proximosVencer(diasFiltro)
      .then(r => setDatos(r.datos))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [diasFiltro, clientMode])

  // Para modo server: mostrar todos (ya filtrados externamente)
  const datosAMostrar = clientMode ? datos : (datosProp || [])

  if (!clientMode && datosAMostrar.length === 0) return null

  return (
    <div className={styles.block}>
      <div className={styles.blockHeader}>
        <div>
          <div className={styles.kicker}>Seguimiento de vigencia</div>
          <div className={styles.title}>Expedientes próximos a vencer</div>
          <p className={styles.explanation}>
            Según el Reglamento de la Asamblea, los proyectos tienen un plazo cuatrienal de vigencia. 
            Aquí se detallan las iniciativas que están por cumplir su periodo reglamentario.
          </p>
        </div>
        {clientMode && (
          <div className={styles.filtrosDias}>
            {OPCIONES_DIAS.map(op => (
              <button
                key={op.value}
                className={`${styles.filtroDia} ${diasFiltro === op.value ? styles.filtroDiaActive : ''}`}
                onClick={() => setDiasFiltro(op.value)}
              >
                {op.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <LoadingIndicator text="Consultando expedientes en riesgo..." />
      ) : datosAMostrar.length === 0 ? (
        <div className={styles.emptyMsg}>No hay proyectos próximos a vencer en este período.</div>
      ) : (
        <div className={styles.list}>
          {datosAMostrar.map(p => (
            <Link
              key={p.numero_expediente}
              href={`/proyecto/${p.numero_expediente}`}
              className={styles.item}
            >
              <div className={styles.diasWrap}>
                <span
                  className={styles.dias}
                  style={{ background: urgencyColor(p.dias_restantes) }}
                >
                  {p.dias_restantes}d
                </span>
                <span className={styles.urgencyLabel} style={{ color: urgencyColor(p.dias_restantes) }}>
                  {urgencyLabel(p.dias_restantes)}
                </span>
              </div>
              <div className={styles.info}>
                <span className={styles.expNum}>Exp. {p.numero_expediente}</span>
                <span className={styles.expTitle}>{p.titulo}</span>
                {(p.estado_actual || p.proponentes_resumen) && (
                  <div className={styles.meta}>
                    {p.estado_actual && (
                      <span className={styles.metaItem}>📋 {p.estado_actual}</span>
                    )}
                    {p.proponentes_resumen && (
                      <span className={styles.metaItem}>👤 {p.proponentes_resumen}</span>
                    )}
                  </div>
                )}
              </div>
              <span className={styles.arrow}>→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
