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

/**
 * Calcula el label del período legislativo actual basado en la lógica del
 * backend: los diputados toman posesión el 1 de mayo cada 4 años
 * (2006, 2010, 2014, 2018, 2022, 2026…).
 *
 * Devuelve un string del tipo "2022-2026" que coincide exactamente con
 * los labels que genera la API de períodos, permitiendo preseleccionar
 * el período vigente sin esperar a que cargue la respuesta de la API.
 */
export function getDefaultLegislativePeriodLabel(): string {
  const d = new Date()
  // Si aún no llegamos al 1 de mayo, el período arrancó el año anterior
  const anio = (d.getMonth() + 1 > 5 || (d.getMonth() + 1 === 5 && d.getDate() >= 1))
    ? d.getFullYear()
    : d.getFullYear() - 1
  // El período siempre empieza en un año cuya diferencia con 1994 es múltiplo de 4
  const offset = (anio - 1994) % 4
  const inicio = anio - offset
  const fin = inicio + 4
  return `${inicio}-${fin}`
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
