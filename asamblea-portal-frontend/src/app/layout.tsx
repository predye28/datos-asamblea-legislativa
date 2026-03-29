// src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'La Asamblea en Números — Portal Ciudadano CR',
  description: 'Los datos de la Asamblea Legislativa de Costa Rica, traducidos para todos los costarricenses.',
  openGraph: {
    title: 'La Asamblea en Números',
    description: 'Transparencia legislativa para todos los costarricenses.',
    locale: 'es_CR',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
