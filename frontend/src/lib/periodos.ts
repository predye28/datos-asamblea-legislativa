'use client'

import { useEffect, useState } from 'react'
import { api, type PeriodoLegislativo } from './api'

export const getPeriodos = () => {
  const d = new Date()
  return [
    { label: 'Este mes',  desde: () => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01` },
    { label: '6 meses',   desde: () => { const d6=new Date(); d6.setMonth(d6.getMonth()-6); return d6.toISOString().slice(0,10) } },
    { label: 'Este año',  desde: () => `${d.getFullYear()}-01-01` },
  ]
}

// Cache a nivel de módulo: los períodos casi no cambian, así evitamos
// refetch al navegar entre páginas dentro de la misma sesión.
let _cache: PeriodoLegislativo[] | null = null
let _inflight: Promise<PeriodoLegislativo[]> | null = null

async function fetchPeriodos(): Promise<PeriodoLegislativo[]> {
  if (_cache) return _cache
  if (!_inflight) {
    _inflight = api.periodos.listar()
      .then(r => { _cache = r.datos; return r.datos })
      .catch(() => { _inflight = null; return [] })
  }
  return _inflight
}

export function useLegislativePeriods(): PeriodoLegislativo[] {
  const [periods, setPeriods] = useState<PeriodoLegislativo[]>(_cache ?? [])
  useEffect(() => {
    let cancelled = false
    fetchPeriodos().then(p => { if (!cancelled) setPeriods(p) })
    return () => { cancelled = true }
  }, [])
  return periods
}
