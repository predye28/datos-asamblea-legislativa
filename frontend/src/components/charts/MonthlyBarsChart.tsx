'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import styles from './ChartTooltip.module.css'

interface Point {
  anio: number
  mes: number
  mes_nombre: string
  total: number
}

interface Props {
  data: Point[]
  height?: number
  ariaLabel?: string
}

function CustomTooltip(props: { active?: boolean; payload?: Array<{ payload: Point }> }) {
  if (!props.active || !props.payload || props.payload.length === 0) return null
  const p = props.payload[0].payload
  return (
    <div className={styles.tooltip}>
      <div className={styles.label}>{p.mes_nombre} {p.anio}</div>
      <div className={styles.value}>{p.total.toLocaleString('es-CR')}</div>
      <div className={styles.sub}>proyectos presentados</div>
    </div>
  )
}

export function MonthlyBarsChart({
  data,
  height = 240,
  ariaLabel = 'Proyectos presentados por mes',
}: Props) {
  if (!data || data.length === 0) return null

  const promedio = data.reduce((s, d) => s + d.total, 0) / data.length
  const withLabel = data.map(d => ({
    ...d,
    label: `${d.mes_nombre.slice(0, 3)} ${String(d.anio).slice(-2)}`,
  }))

  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height} minHeight={200}>
        <BarChart data={withLabel} margin={{ top: 16, right: 8, bottom: 8, left: -8 }}>
          <CartesianGrid stroke="#333" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="#9A9A9A"
            tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono', fill: '#9A9A9A' }}
            tickLine={false}
            axisLine={{ stroke: '#333' }}
            interval={0}
          />
          <YAxis
            stroke="#9A9A9A"
            tick={{ fontSize: 12, fontFamily: 'IBM Plex Mono', fill: '#9A9A9A' }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(6,182,212,0.08)' }} />
          <Bar dataKey="total" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={600}>
            {withLabel.map((d, i) => (
              <Cell
                key={i}
                fill={d.total > promedio * 1.3 ? '#22C55E' : d.total < promedio * 0.7 ? '#F59E0B' : '#06B6D4'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
