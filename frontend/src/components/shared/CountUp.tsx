'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  end: number
  duration?: number
  decimals?: number
  suffix?: string
  prefix?: string
  format?: (n: number) => string
  className?: string
  startOnView?: boolean
}

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

export default function CountUp({
  end,
  duration = 1400,
  decimals = 0,
  suffix = '',
  prefix = '',
  format,
  className,
  startOnView = true,
}: Props) {
  // Start at `end` if the user prefers reduced motion — skips the animation entirely.
  const [value, setValue] = useState(() => (prefersReducedMotion() ? end : 0))
  const ref = useRef<HTMLSpanElement | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (prefersReducedMotion()) return

    const run = () => {
      const t0 = performance.now()
      const step = (t: number) => {
        const p = Math.min(1, (t - t0) / duration)
        const eased = 1 - Math.pow(1 - p, 3)
        setValue(end * eased)
        if (p < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }

    if (!startOnView) {
      run()
      return
    }

    const el = ref.current
    if (!el) return

    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting && !started.current) {
          started.current = true
          run()
          obs.disconnect()
        }
      }
    }, { threshold: 0.3 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [end, duration, startOnView])

  const display = format
    ? format(value)
    : value.toLocaleString('es-CR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })

  return <span ref={ref} className={className}>{prefix}{display}{suffix}</span>
}
