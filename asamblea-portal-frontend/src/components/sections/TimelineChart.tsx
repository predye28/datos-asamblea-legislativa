'use client'
// src/components/sections/TimelineChart.tsx
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import type { ProyectosPorMes } from '@/lib/api'
import styles from './TimelineChart.module.css'

interface Props { data: ProyectosPorMes[] }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipLabel}>{label}</div>
      <div className={styles.tooltipValue}>{payload[0].value} proyectos</div>
    </div>
  )
}

export default function TimelineChart({ data }: Props) {
  const chartData = data.map(d => ({
    name: `${d.mes_nombre} ${String(d.anio).slice(2)}`,
    total: d.total,
  }))

  const max = Math.max(...chartData.map(d => d.total))

  return (
    <div className={styles.block}>
      <div className={styles.header}>
        <div className={styles.title}>Proyectos presentados por mes</div>
        <div className={styles.sub}>Últimos 12 meses — cada barra es un mes completo</div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} barCategoryGap="20%" margin={{ top: 8, right: 0, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="name"
            tick={{ fontFamily: 'var(--mono)', fontSize: 10, fill: 'var(--ink-faint)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontFamily: 'var(--mono)', fontSize: 10, fill: 'var(--ink-faint)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--paper-warm)' }} />
          <Bar dataKey="total" radius={[2, 2, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.total === max ? 'var(--accent)' : 'var(--ink)'}
                opacity={entry.total === max ? 1 : 0.15 + (entry.total / max) * 0.55}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className={styles.legend}>
        <span className={styles.legendDot} style={{ background: 'var(--accent)' }} />
        <span>Mes más activo</span>
        <span className={styles.legendDot} style={{ background: 'var(--ink)', opacity: 0.5, marginLeft: 16 }} />
        <span>Resto de meses</span>
      </div>
    </div>
  )
}
