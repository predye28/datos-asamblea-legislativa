'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import styles from './ChartTooltip.module.css'

interface Point {
  anio: number
  leyes_aprobadas: number
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
      <div className={styles.label}>Año {p.anio}</div>
      <div className={styles.value}>
        {p.leyes_aprobadas.toLocaleString('es-CR')}
      </div>
      <div className={styles.sub}>leyes aprobadas</div>
    </div>
  )
}

export function TimelineAreaChart({
  data,
  height = 320,
  ariaLabel = 'Leyes aprobadas por año',
}: Props) {
  if (!data || data.length < 2) return null

  const peak = data.reduce((m, d) => (d.leyes_aprobadas > m.leyes_aprobadas ? d : m), data[0])

  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height} minHeight={240}>
        <AreaChart data={data} margin={{ top: 24, right: 16, bottom: 8, left: -8 }}>
          <defs>
            <linearGradient id="leyesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#333" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="anio"
            stroke="#9A9A9A"
            tick={{ fontSize: 12, fontFamily: 'IBM Plex Mono', fill: '#9A9A9A' }}
            tickLine={false}
            axisLine={{ stroke: '#333' }}
            interval="preserveStartEnd"
            minTickGap={32}
          />
          <YAxis
            stroke="#9A9A9A"
            tick={{ fontSize: 12, fontFamily: 'IBM Plex Mono', fill: '#9A9A9A' }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#06B6D4', strokeOpacity: 0.25 }} />
          <Area
            type="monotone"
            dataKey="leyes_aprobadas"
            stroke="#06B6D4"
            strokeWidth={2.2}
            fill="url(#leyesGrad)"
            isAnimationActive
            animationDuration={600}
          />
          <ReferenceDot
            x={peak.anio}
            y={peak.leyes_aprobadas}
            r={6}
            fill="#F59E0B"
            stroke="#1A1A1A"
            strokeWidth={2.5}
            ifOverflow="extendDomain"
          />
        </AreaChart>
      </ResponsiveContainer>
      <p className="sr-only">
        Serie de {data.length} años. Pico en {peak.anio} con {peak.leyes_aprobadas} leyes aprobadas.
      </p>
    </div>
  )
}
