import Hero from '@/components/sections/Hero'
import StatCards from '@/components/sections/StatCards'
import ResumenMetricas from '@/components/sections/ResumenMetricas'
import TemasDestacados from '@/components/sections/TemasDestacados'
import TimelineInteractiva from '@/components/sections/TimelineInteractiva'
import ProximosVencer from '@/components/sections/ProximosVencer'
import RankingDiputados from '@/components/sections/RankingDiputados'
import BuscadorHome from '@/components/sections/BuscadorHome'
import InfoAsamblea from '@/components/sections/InfoAsamblea'

export const revalidate = 300 // refresca cada 5 min

export default function HomePage() {
  return (
    <>
      <Hero
        kicker="Transparencia ciudadana"
        headline={<>El trabajo de la Asamblea Legislativa,<br />explicado de forma sencilla</>}
        deck="Somos una plataforma independiente que facilita el acceso a la información legislativa de Costa Rica. Transformamos los datos oficiales del Sistema de Información Legislativa (SIL) en una experiencia clara y estructurada, para que cualquier ciudadano pueda dar seguimiento al proceso de creación de leyes."
      />

      <div className="container" style={{ paddingTop: 0, paddingBottom: 40 }}>
        <h2 className="section-title">Panorama legislativo</h2>
        <StatCards />
        
        <ResumenMetricas />

        <h2 className="section-title" style={{ marginTop: 48 }}>Temas en debate</h2>
        <TemasDestacados />

        <h2 className="section-title" style={{ marginTop: 48 }}>Expedientes en trámite</h2>
        <ProximosVencer clientMode={true} maxItems={5} />

        <TimelineInteractiva />


        <h2 className="section-title" style={{ marginTop: 48 }}>Iniciativas por diputado</h2>
        <RankingDiputados />

        <h2 className="section-title" style={{ marginTop: 48 }}>Consulta de proyectos</h2>
        <BuscadorHome />

        <InfoAsamblea />
      </div>
    </>
  )
}
