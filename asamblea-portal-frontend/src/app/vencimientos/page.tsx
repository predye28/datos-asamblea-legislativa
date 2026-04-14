'use client'
// src/app/vencimientos/page.tsx
import Hero from '@/components/sections/Hero'
import ProximosVencer from '@/components/sections/ProximosVencer'

export default function VencimientosPage() {
  return (
    <div style={{ paddingBottom: 80, flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* 
        Usamos un diseño de header simple sin Hero para mantener foco
        o usamos un Hero como en proyectos
      */}
      <Hero
        kicker="Vigilancia ciudadana"
        headline="Expedientes próximos a vencer"
        deck="El Reglamento de la Asamblea dispone que los proyectos tienen una vida útil de 4 años. Si en ese tiempo no se aprueban, se envían al archivo. Revisá cuáles iniciativas están al borde del vencimiento."
      />
      <div className="container" style={{ flex: 1 }}>
        <ProximosVencer clientMode={true} esPaginaDedicada={true} />
      </div>
    </div>
  )
}
