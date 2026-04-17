'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './FilterPill.module.css'

export interface FilterOption {
  value: string
  label: string
}

interface Props {
  value: string
  onChange: (v: string) => void
  options: FilterOption[]
  placeholder: string
  active?: boolean
}

function IconChevronDown() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m6 9 6 6 6-6"/>
    </svg>
  )
}

export default function FilterPill({ value, onChange, options, placeholder, active }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const label = options.find(o => o.value === value)?.label ?? placeholder
  const isActive = active ?? !!value

  return (
    <div ref={ref} className={styles.pillWrap}>
      <button
        className={`${styles.pillBtn} ${isActive ? styles.pillActive : ''} ${open ? styles.pillOpen : ''}`}
        onClick={() => setOpen(v => !v)}
        type="button"
      >
        <span>{label}</span>
        <span className={`${styles.pillChevron} ${open ? styles.pillChevronUp : ''}`}>
          <IconChevronDown />
        </span>
      </button>

      {open && (
        <div className={styles.dropdown}>
          {options.map((opt, i) => (
            <button
              key={`${i}-${opt.value}`}
              className={`${styles.dropdownItem} ${opt.value === value ? styles.dropdownItemActive : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              type="button"
            >
              {opt.label}
              {opt.value === value && <span className={styles.dropdownCheck}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
