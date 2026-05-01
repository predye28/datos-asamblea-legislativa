'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { es, type Dictionary } from './dictionaries/es'
import { en } from './dictionaries/en'

export type Lang = 'es' | 'en'

const DICTS: Record<Lang, Dictionary> = { es, en }

const STORAGE_KEY = 'lang'

type Ctx = {
  lang: Lang
  setLang: (l: Lang) => void
  toggleLang: () => void
  dict: Dictionary
}

const LanguageContext = createContext<Ctx | null>(null)

// El SSR siempre renderiza en español. Tras hidratar, si el usuario tenía
// inglés guardado, hay un re-render. Ese flash solo afecta al ~2% que
// usa inglés y se acepta para mantener la app simple (sin middleware ni
// rutas /[lang]/...).
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('es')

  useEffect(() => {
    let saved: Lang | null = null
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw === 'es' || raw === 'en') saved = raw
    } catch {}
    if (saved && saved !== 'es') setLangState(saved)
  }, [])

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang
    }
  }, [lang])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try { localStorage.setItem(STORAGE_KEY, l) } catch {}
  }, [])

  const toggleLang = useCallback(() => {
    setLangState((prev) => {
      const next: Lang = prev === 'es' ? 'en' : 'es'
      try { localStorage.setItem(STORAGE_KEY, next) } catch {}
      return next
    })
  }, [])

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, dict: DICTS[lang] }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useT(): Ctx {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useT must be used within <LanguageProvider>')
  return ctx
}
