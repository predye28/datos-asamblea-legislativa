// src/app/page.tsx
import { api } from '@/lib/api'
import Hero from '@/components/sections/Hero'
import StatCards from '@/components/sections/StatCards'
import AprobacionBar from '@/components/sections/AprobacionBar'
import TimelineInteractiva from '@/components/sections/TimelineInteractiva'
import ProximosVencer from '@/components/sections/ProximosVencer'
import RankingDiputados from '@/components/sections/RankingDiputados'
import BuscadorHome from '@/components/sections/BuscadorHome'
import SectionRule from '@/components/ui/SectionRule'

export const revalidate = 300 // refresca cada 5 min

export default async function HomePage() {
  const [metricas, vencer] = await Promise.all([
    api.metricas.general(),
    api.metricas.proximosVencer(),
  ])

  return (
    <>
      <Hero
        kicker="¿Para qué sirve esto?"
        headline={<>Los datos de la Asamblea Legislativa,<br />para que cualquier persona los entienda</>}
        deck="La Asamblea publica su información, pero de una forma que pocos entienden. Este portal toma esos mismos datos oficiales y los convierte en algo que cualquier ciudadano puede leer, comparar y cuestionar. Porque la transparencia solo funciona si se entiende."
      />

      <div className="container" style={{ paddingTop: 0, paddingBottom: 60 }}>
        <SectionRule label="Resumen general" />
        <StatCards general={metricas.general} />

        <SectionRule label="Tasa de aprobación" />
        <AprobacionBar
          pct={metricas.general.tasa_aprobacion_pct}
          total={metricas.general.total_proyectos}
          leyes={metricas.general.total_leyes_aprobadas}
        />


        <SectionRule label="Proyectos en riesgo de vencer" />
        <ProximosVencer datos={vencer.datos} clientMode={true} />

        <TimelineInteractiva datosIniciales={metricas.por_mes} />


        <SectionRule label="Diputados más activos" />
        <RankingDiputados diputados={metricas.top_diputados} />

        <SectionRule label="Buscador de proyectos" />
        <BuscadorHome />
      </div>
    </>
  )
}
