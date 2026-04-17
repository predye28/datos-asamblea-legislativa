import Hero from '@/components/sections/Hero'
import TimelineInteractiva from '@/components/sections/TimelineInteractiva'
import RankingDiputados from '@/components/sections/RankingDiputados'
import BuscadorHome from '@/components/sections/BuscadorHome'
import AboutAsamblea from '@/components/sections/AboutAsamblea'
import TryAsambleaBlocks from '@/components/sections/TryAsambleaBlocks'

export const revalidate = 300 // refresca cada 5 min

export default function HomePage() {
  return (
    <>
      <Hero />

      <TryAsambleaBlocks />

      <AboutAsamblea />

      <div className="container" style={{ paddingBottom: 80 }}>
        <h2 className="section-title" style={{ marginTop: 64 }}>Iniciativas por diputado</h2>
        <RankingDiputados />

        <h2 className="section-title" style={{ marginTop: 64 }}>Línea de tiempo legislativa</h2>
        <TimelineInteractiva />

        <h2 className="section-title" style={{ marginTop: 64 }}>Consulta de proyectos</h2>
        <BuscadorHome />
      </div>
    </>
  )
}
