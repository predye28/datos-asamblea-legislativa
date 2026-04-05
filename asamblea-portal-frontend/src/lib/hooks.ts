// src/lib/hooks.ts
// Hooks reutilizables compartidos entre componentes

import { useEffect, useRef } from 'react'

/**
 * Anima un número desde 0 hasta `target` en `duration` ms.
 * Retorna un ref que debe asignarse al elemento que muestra el número.
 *
 * Uso:
 *   const ref = useCountUp(1234)
 *   return <span ref={ref}>0</span>
 */
export function useCountUp<T extends HTMLElement>(target: number, duration = 1200) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (target === 0) {
      el.textContent = '0'
      return
    }
    let current = 0
    const steps  = duration / 16
    const inc    = target / steps
    const timer  = setInterval(() => {
      current = Math.min(current + inc, target)
      if (el) el.textContent = Math.round(current).toLocaleString('es-CR')
      if (current >= target) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])

  return ref
}
