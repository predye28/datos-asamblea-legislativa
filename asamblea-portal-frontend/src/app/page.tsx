import Hero from '@/components/sections/Hero'
import StatCards from '@/components/sections/StatCards'
import ResumenMetricas from '@/components/sections/ResumenMetricas'
import TimelineInteractiva from '@/components/sections/TimelineInteractiva'
import ProximosVencer from '@/components/sections/ProximosVencer'
import RankingDiputados from '@/components/sections/RankingDiputados'
import BuscadorHome from '@/components/sections/BuscadorHome'
import InfoAsamblea from '@/components/sections/InfoAsamblea'
import SectionRule from '@/components/ui/SectionRule'

export const revalidate = 300 // refresca cada 5 min

export default function HomePage() {
  return (
    <>
      <Hero
        kicker="Transparencia ciudadana"
        headline={<>El trabajo de la Asamblea Legislativa,<br />explicado de forma sencilla</>}
        deck="Facilitamos el acceso a la información oficial del Sistema de Información Legislativa (SIL). Nuestra misión es presentar los datos de manera clara y estructurada para que cualquier ciudadano pueda dar seguimiento al proceso de creación de leyes en Costa Rica."
      />

      <div className="container" style={{ paddingTop: 0, paddingBottom: 60 }}>
        <SectionRule label="Panorama legislativo" />
        <StatCards />
        
        <ResumenMetricas />


        <SectionRule label="Expedientes en trámite" />
        <ProximosVencer clientMode={true} />

        <TimelineInteractiva />


        <SectionRule label="Iniciativas por diputado" />
        <RankingDiputados />

        <SectionRule label="Consulta de proyectos" />
        <BuscadorHome />

        <br />
        <br />
        <br />
        <InfoAsamblea />
      </div>
    </>
  )
}
