// src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'La Asamblea al Día',
  description: 'Los datos de la Asamblea Legislativa de Costa Rica, traducidos para todos los costarricenses.',
  openGraph: {
    title: 'La Asamblea al Día',
    description: 'Transparencia legislativa para todos los costarricenses.',
    locale: 'es_CR',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/* Preconectar a Google Fonts para reducir latencia */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* stylesheet non-blocking: display=swap permite pintar con fuentes del sistema mientras carga */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
