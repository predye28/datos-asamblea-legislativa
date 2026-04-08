'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hasScrolledRef = useRef(false)

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
    
    // Al cambiar la ruta, reseteamos el candado
    hasScrolledRef.current = false
    
    const scrollUp = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      // Forzar también body scrollTop por si hay algún overflow oculto
      document.body.scrollTop = 0
      document.documentElement.scrollTop = 0
    }
    
    // 1. Forzar inmediato
    scrollUp()
    
    // 2. Forzar luego de 50ms para sincronización inicial
    const t1 = setTimeout(scrollUp, 50)
    
    // 3. Forzar agresivamente un poco más tarde para combatir componentes cargando con Suspense
    // Mobile browsers and Suspense sometimes take hundreds of ms to actually paint the page height
    const t2 = setTimeout(() => {
      if (!hasScrolledRef.current) scrollUp()
    }, 300)

    // Agregamos un listener de scroll. Si el usuario scrollea manualmente antes de los 300ms, cancelamos
    const handleUserScroll = () => { hasScrolledRef.current = true }
    window.addEventListener('wheel', handleUserScroll, { passive: true })
    window.addEventListener('touchstart', handleUserScroll, { passive: true })
    
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      window.removeEventListener('wheel', handleUserScroll)
      window.removeEventListener('touchstart', handleUserScroll)
    }
  }, [pathname])

  return <div className="animate-fadeup">{children}</div>
}
