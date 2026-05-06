'use client'

import { useState } from 'react'
import Image from 'next/image'
import { getFotoUrl } from '@/lib/diputados'
import { cleanText } from '@/lib/utils'
import styles from './DiputadoAvatar.module.css'

type Size = 'sm' | 'md' | 'lg'

// Hints al navegador del tamaño real de display para servir la imagen correcta
// en pantallas normales y Retina (2x) sin descargar más de lo necesario.
const SIZES: Record<Size, string> = {
  sm: '(max-width: 640px) 44px, 52px',
  md: '(max-width: 640px) 68px, 86px',
  lg: '(max-width: 640px) 132px, 168px',
}

interface Props {
  nombreCompleto: string
  size?: Size
  partyColor?: string
  hue?: number
  className?: string
}

function getInitials(nombreCompleto: string): string {
  const words = cleanText(nombreCompleto).toLowerCase().split(/\s+/).filter(w => w.length > 0)
  if (words.length === 0) return '·'
  const reordered = words.length >= 3 ? [words[2], words[0]] : [words[0], words[1]]
  return reordered.filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '·'
}

export function DiputadoAvatar({ nombreCompleto, size = 'md', partyColor, hue = 0, className }: Props) {
  const [photoFailed, setPhotoFailed] = useState(false)

  const gradient = partyColor
    ? `linear-gradient(135deg, ${partyColor}, color-mix(in srgb, ${partyColor} 70%, #000))`
    : `linear-gradient(135deg, hsl(${hue} 55% 28%), hsl(${(hue + 40) % 360} 55% 18%))`

  const initials = getInitials(nombreCompleto)
  const fotoUrl = getFotoUrl(nombreCompleto)

  return (
    <div
      className={`${styles.avatar} ${styles[size]}${className ? ` ${className}` : ''}`}
      style={{ background: gradient }}
      aria-hidden
    >
      {initials}
      {!photoFailed && (
        <Image
          src={fotoUrl}
          alt=""
          fill
          sizes={SIZES[size]}
          quality={90}
          className={styles.photo}
          style={{ objectPosition: 'center top' }}
          onError={() => setPhotoFailed(true)}
        />
      )}
    </div>
  )
}
