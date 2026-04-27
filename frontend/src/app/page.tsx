import Hero from '@/components/sections/Hero'
import FeatureBlocks from '@/components/sections/FeatureBlocks'
import AboutSection from '@/components/sections/AboutSection'
import CreatorSection from '@/components/sections/CreatorSection'
import styles from './page.module.css'

// Render dinámico: los datos vienen de la API en cada request. Si dejamos
// revalidate, Next.js intenta pre-renderizar en build cuando la API aún
// no está disponible y el home queda con valores en blanco.
export const dynamic = 'force-dynamic'

export default function HomePage() {
  return (
    <div className={styles.homeCanvas}>
      <Hero />
      <FeatureBlocks />
      <AboutSection />
      <CreatorSection />
    </div>
  )
}
