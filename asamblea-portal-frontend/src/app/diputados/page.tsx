'use client'
// src/app/diputados/page.tsx
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { api, DiputadoRanking } from '@/lib/api'
import { getPeriodos } from '@/lib/periodos'
import SectionRule from '@/components/ui/SectionRule'
import LoadingIndicator from '@/components/ui/LoadingIndicator'
import Hero from '@/components/sections/Hero'
import styles from './diputados.module.css'

function DiputadosContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const periodos = getPeriodos()
  const [periodoIdx, setPeriodoIdx] = useState(1) // 1 = 6 meses
  const [diputados, setDiputados] = useState<DiputadoRanking[]>([])
  const [loading, setLoading] = useState(true)
  const maxProyectos = diputados[0]?.total_proyectos || 1

  useEffect(() => {
    setLoading(true)
    const desde = periodos[periodoIdx].desde()
    api.metricas.general({ desde })
      .then(d => setDiputados(d.top_diputados))
      .finally(() => setLoading(false))
  }, [periodoIdx])

  const filtered = diputados.filter(d =>
    !query || d.nombre_completo.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div style={{ paddingBottom: 80 }}>
      <Hero
        kicker="Actividad parlamentaria"
        headline="Registro de iniciativas por diputado"
        deck="Distribución de diputaciones según la cantidad de proyectos presentados. Este registro refleja el volumen de iniciativas ingresadas a la secretaría del Plenario en el período seleccionado."
      />

      <div className="container">
        <SectionRule label="Filtrar ranking" />
        <div className={styles.controlsLayout}>
          <div className={styles.periodoSelector} role="group" aria-label="Filtrar por período">
            {periodos.map((p, i) => (
              <button
                key={p.label}
                className={`${styles.periodoBtn} ${i === periodoIdx ? styles.periodoBtnActive : ''}`}
                onClick={() => setPeriodoIdx(i)}
                aria-pressed={i === periodoIdx}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className={styles.searchWrap}>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Escribe el nombre o apellido del diputado..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
        </div>

        <SectionRule label={`${filtered.length} diputados`} />

        {loading ? (
          <div className={styles.loading}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        ) : (
          <div className={styles.list}>
            {filtered.map((d, i) => {
              const barPct = Math.round((d.total_proyectos / maxProyectos) * 100)
              return (
                <div
                  key={d.nombre_completo}
                  className={styles.item}
                  onClick={() => router.push(`/proyectos?q=${encodeURIComponent(d.apellidos || d.nombre_completo)}`)}
                >
                  <span className={`${styles.rank} ${i < 3 ? styles.rankTop : ''}`}>{i + 1}</span>
                  <div className={styles.info}>
                    <div className={styles.name}>{d.nombre_completo}</div>
                    <div className={styles.barWrap}>
                      <div className={styles.barFill} style={{ width: `${barPct}%` }} />
                    </div>
                  </div>
                  <div className={styles.count}>
                    <span className={styles.countNum}>{d.total_proyectos}</span>
                    <span className={styles.countLabel}>proyectos</span>
                  </div>
                  <span className={styles.arrow}>→</span>
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div className={styles.empty}>No se encontró ningún diputado con ese nombre o en ese periodo.</div>
            )}
          </div>
        )}

        <div className={styles.nota}>
          <div className={styles.notaTitle}>¿Qué mide este registro?</div>
          <p>
            Esta visualización muestra la frecuencia con la que una diputación presenta nuevos expedientes
            a la corriente legislativa. Es un indicador de actividad propositiva que no contempla
            parámetros de efectividad, aprobación ni evaluación de contenido.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function DiputadosPage() {
  return (
    <Suspense fallback={<LoadingIndicator text="Analizando actividad legislativa..." fillSpace={true} />}>
      <DiputadosContent />
    </Suspense>
  )
}
