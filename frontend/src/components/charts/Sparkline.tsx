interface Point {
  anio: number
  leyes_aprobadas: number
}

interface Props {
  data: Point[]
  width?: number
  height?: number
  color?: string
  className?: string
}

export function Sparkline({
  data,
  width = 160,
  height = 40,
  color = 'var(--accent)',
  className,
}: Props) {
  if (!data || data.length < 2) return null
  const slice = data.slice(-18)
  const max = Math.max(...slice.map(d => d.leyes_aprobadas), 1)
  const step = width / (slice.length - 1)
  const toX = (i: number) => i * step
  const toY = (v: number) => 3 + (1 - v / max) * (height - 6)
  const path = slice
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(d.leyes_aprobadas)}`)
    .join(' ')
  const last = slice[slice.length - 1]

  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      aria-hidden
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={toX(slice.length - 1)}
        cy={toY(last.leyes_aprobadas)}
        r={3}
        fill={color}
      />
    </svg>
  )
}
