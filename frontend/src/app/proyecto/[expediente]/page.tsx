import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { api } from '@/lib/api'
import { formatTitle } from '@/lib/utils'
import DetalleClient from './DetalleClient'

export const revalidate = 300

interface Props { params: Promise<{ expediente: string }> }

// Metadata SEO en español: el contenido es legislación costarricense, el
// público objetivo es CR. El toggle EN es una cortesía cliente; mantener
// metadata bilingüe complicaría hreflang sin beneficio práctico.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { expediente } = await params
  const num = parseInt(expediente, 10)
  if (isNaN(num)) return { title: 'Proyecto no encontrado' }
  try {
    const p = await api.proyectos.detalle(num)
    const titulo = formatTitle(p.titulo)
    const title = `Exp. ${p.numero_expediente} — ${titulo.slice(0, 80)}`
    const desc = p.es_ley
      ? (p.numero_ley?.toUpperCase() === 'SI' ? `Ley Aprobada · ${titulo}` : `Ley N° ${p.numero_ley} · ${titulo}`)
      : `${p.estado_actual || 'Proyecto de ley'} · ${titulo}`
    return {
      title,
      description: desc.slice(0, 180),
      openGraph: { title, description: desc.slice(0, 180), type: 'article' },
      twitter: { title, description: desc.slice(0, 180) },
      alternates: { canonical: `/proyecto/${num}` },
    }
  } catch {
    return { title: `Expediente ${expediente}` }
  }
}

export default async function DetallePage({ params }: Props) {
  const { expediente } = await params
  const num = parseInt(expediente, 10)
  if (isNaN(num)) notFound()

  let proyecto
  try {
    proyecto = await api.proyectos.detalle(num)
  } catch {
    notFound()
  }

  return <DetalleClient proyecto={proyecto} />
}
