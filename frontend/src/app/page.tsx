import Hero from '@/components/sections/Hero'
import FeatureBlocks from '@/components/sections/FeatureBlocks'
import AboutSection from '@/components/sections/AboutSection'
import ResumenSemanal from '@/components/home/ResumenSemanal'
import CreatorSection from '@/components/sections/CreatorSection'
import styles from './page.module.css'

export const revalidate = 300

export default function HomePage() {
  return (
    <div className={styles.homeCanvas}>
      <Hero />
      {/* <ResumenSemanal /> */}
      <FeatureBlocks />
      <AboutSection />
      <CreatorSection />
    </div>
  )
}
