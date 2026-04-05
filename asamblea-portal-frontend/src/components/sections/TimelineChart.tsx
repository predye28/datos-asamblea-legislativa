'use client'
// src/components/sections/TimelineChart.tsx
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import type { ProyectosPorMes } from '@/lib/api'
import styles from './TimelineChart.module.css'

interface Props {
  data: ProyectosPorMes[]
  onClickBar?: (anio: number, mes: number) => void
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipLabel}>{payload[0].payload.fullName}</div>
      <div className={styles.tooltipValue}>{payload[0].value} proyectos</div>
    </div>
  )
}

export default function TimelineChart({ data, onClickBar }: Props) {
  const chartData = data.map(d => ({
    // En móviles es mejor un label corto, usamos 3 letras e.g., "Ene 24"
    name: `${d.mes_nombre.slice(0, 3)} ${String(d.anio).slice(2)}`,
    fullName: `${d.mes_nombre} ${d.anio}`,
    total: d.total,
    anio: d.anio,
    mes: d.mes,
  }))

  return (
    <div className={styles.block}>
      <div className={styles.header}>
        <div className={styles.title}>Evolución de proyectos presentados</div>
        <div className={styles.sub}>Últimos 12 meses — comportamiento de ingreso de expedientes</div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis
            dataKey="name"
            tick={{ fontFamily: 'var(--mono)', fontSize: 10, fill: 'var(--ink-faint)' }}
            axisLine={false}
            tickLine={false}
            tickMargin={10}
            minTickGap={15}
          />
          <YAxis
            tick={{ fontFamily: 'var(--mono)', fontSize: 10, fill: 'var(--ink-faint)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent', stroke: 'var(--rule)', strokeWidth: 1, strokeDasharray: '3 3' }} />
          <Area
            type="monotone"
            dataKey="total"
            stroke="var(--accent)"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorTotal)"
            activeDot={{ r: 6, fill: 'var(--accent)', stroke: 'var(--paper-card)', strokeWidth: 2, onClick: (e: any, payload: any) => onClickBar && onClickBar(payload.payload.anio, payload.payload.mes) }}
            dot={{ r: 3, fill: 'var(--paper-card)', stroke: 'var(--accent)', strokeWidth: 1.5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
