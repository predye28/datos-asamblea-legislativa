import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { api } from '@/lib/api'
import type { PerfilDiputado } from '@/lib/api'
import { formatDiputadoName } from '@/lib/utils'
import PerfilClient from './PerfilClient'

interface Props { params: Promise<{ apellidos: string }> }

// Metadata SEO en español — público objetivo es Costa Rica.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { apellidos } = await params
  const nombre = formatDiputadoName(decodeURIComponent(apellidos))
  try {
    const perfil = await api.metricas.perfilDiputado(decodeURIComponent(apellidos))
    const title = `${nombre} · Diputación`
    const desc = `${perfil.total_proyectos} proyectos presentados · ${perfil.total_leyes} aprobados como ley · ${perfil.tasa_aprobacion}% de eficacia legislativa.`
    return {
      title,
      description: desc,
      openGraph: { title, description: desc, type: 'profile' },
      twitter: { title, description: desc },
      alternates: { canonical: `/diputados/${encodeURIComponent(decodeURIComponent(apellidos))}` },
    }
  } catch {
    return { title: nombre || 'Perfil de diputación' }
  }
}

export default async function PerfilDiputadoPage({ params }: Props) {
  const { apellidos } = await params
  const apellidosRaw = decodeURIComponent(apellidos)

  let perfil: PerfilDiputado
  try {
    perfil = await api.metricas.perfilDiputado(apellidosRaw)
  } catch {
    notFound()
  }

  return <PerfilClient perfil={perfil} apellidosRaw={apellidosRaw} />
}
