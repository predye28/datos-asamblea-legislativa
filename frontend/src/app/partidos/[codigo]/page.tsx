import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import PerfilPartidoClient from './PerfilPartidoClient'

interface Props {
  params: Promise<{ codigo: string }>
}

export default async function PartidoPage({ params }: Props) {
  const { codigo } = await params

  let perfil
  try {
    perfil = await api.metricas.perfilPartido(codigo)
  } catch {
    notFound()
  }

  return <PerfilPartidoClient perfil={perfil} codigoRaw={codigo} />
}
