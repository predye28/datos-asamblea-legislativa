import type { Metadata, Viewport } from 'next'
import { Inter, Outfit, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import ScrollToTop from '@/components/layout/ScrollToTop'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
})

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-mono',
})

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://datos-asamblea-legislativa.vercel.app'
const SITE_NAME = 'La Asamblea al Día'
const SITE_DESC =
  'Portal ciudadano e independiente que organiza la información pública del Sistema de Información Legislativa (SIL) de Costa Rica: proyectos de ley, diputados y estadísticas.'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1A1A1A',
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  keywords: [
    'Asamblea Legislativa',
    'Costa Rica',
    'proyectos de ley',
    'diputados',
    'SIL',
    'transparencia',
    'datos abiertos',
  ],
  authors: [{ name: 'Omar Madrigal' }],
  creator: 'Omar Madrigal',
  openGraph: {
    type: 'website',
    locale: 'es_CR',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESC,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESC,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  alternates: { canonical: '/' },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${inter.variable} ${outfit.variable} ${mono.variable}`}>
      <body>
        <ScrollToTop />
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
