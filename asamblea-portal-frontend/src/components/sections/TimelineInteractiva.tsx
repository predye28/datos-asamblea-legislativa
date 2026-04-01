'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import SectionRule from '@/components/ui/SectionRule'
import TimelineChart from '@/components/sections/TimelineChart'
import { api, type ProyectosPorMes, type DetallesMes } from '@/lib/api'
import styles from '@/app/estadisticas/estadisticas.module.css'

interface Props {
  datosIniciales?: ProyectosPorMes[]
}

export default function TimelineInteractiva({ datosIniciales }: Props) {
  const [datos, setDatos] = useState<ProyectosPorMes[]>(datosIniciales || [])
  const [detalleMes, setDetalleMes] = useState<DetallesMes | null>(null)
  const [loadingMes, setLoadingMes] = useState(false)

  useEffect(() => {
    if (!datosIniciales) {
      api.metricas.general().then(r => setDatos(r.por_mes))
    }
  }, [datosIniciales])

  const handleMonthClick = (anio: number, mes: number) => {
    setLoadingMes(true)
    api.metricas.detalleMes(anio, mes)
      .then(setDetalleMes)
      .finally(() => setLoadingMes(false))
  }

  return (
    <>
      <SectionRule label="Proyectos presentados por mes — últimos 12 meses" />
      <TimelineChart data={datos} onClickBar={handleMonthClick} />

      {/* Detalle mes seleccionado */}
      {loadingMes && (
        <div style={{ padding: 24, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-faint)', textTransform: 'uppercase' }}>
          Cargando detalle del mes...
        </div>
      )}
      {detalleMes && !loadingMes && (
        <div style={{ background: 'var(--paper-card)', border: '1px solid var(--rule)', borderTop: '3px solid var(--accent-warm)', padding: 28, marginTop: 12, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: 'var(--ink)' }}>
            Detalle de {detalleMes.mes_nombre} {detalleMes.anio}
          </div>
          <p style={{ fontSize: 15, color: 'var(--ink-muted)', marginBottom: 20 }}>
            En este mes se presentaron <strong>{detalleMes.resumen.total_proyectos}</strong> proyectos, 
            de los cuales <strong>{detalleMes.resumen.total_leyes}</strong> ya son ley. 
            {detalleMes.top_proponentes.length > 0 && (
              <> Top proponentes: {detalleMes.top_proponentes.map(p => p.nombre_completo).join(', ')}.</>
            )}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {detalleMes.proyectos.map((p) => (
              <Link key={p.numero_expediente} href={`/proyecto/${p.numero_expediente}`} style={{ padding: '12px 0', borderBottom: '1px solid var(--rule)', textDecoration: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--mono)', textTransform: 'uppercase' }}>EXP. {p.numero_expediente}</span>
                  {p.estado_actual && <span style={{ fontSize: 12, color: 'var(--ink-muted)', fontFamily: 'var(--mono)' }}>{p.estado_actual}</span>}
                </div>
                <div style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 500 }}>{p.titulo}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
