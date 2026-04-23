'use client'

import styles from './CreatorSection.module.css'

function IconMail() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 7L2 7" />
    </svg>
  )
}

function IconGitHub() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

function IconLinkedIn() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  )
}

export default function CreatorSection() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Sobre el Creador</h2>
          <p className={styles.sectionSubtitle}>Quién está detrás del proyecto</p>
        </div>
        <div className={styles.card}>
          <div className={styles.content}>
            <div className={styles.header}>
              <div className={styles.avatar}>OM</div>
              <div className={styles.titles}>
                <h2 className={styles.name}>Omar Madrigal</h2>
                <p className={styles.role}>Creador de La Asamblea al Día</p>
              </div>
            </div>

            <p className={styles.bio}>
              Desarrollador apasionado por los datos abiertos y la transparencia.
              Este proyecto nace del deseo de acercar el trabajo legislativo a todas las personas
              mediante tecnología y diseño accesible.
              <br />
              <span className={styles.bioSmall}>Actualmente soy estudiante de Ingeniería en Computación en el Tecnológico de Costa Rica.</span>
            </p>
            <div className={styles.links}>
              <a href="mailto:omarmr14.02@gmail.com" className={styles.link}>
                <IconMail /> <span>omarmr14.02@gmail.com</span>
              </a>
              <a href="https://github.com/predye28" target="_blank" rel="noopener noreferrer" className={styles.link}>
                <IconGitHub /> <span>GitHub</span>
              </a>
              <a href="https://www.linkedin.com/in/omaralexis/" target="_blank" rel="noopener noreferrer" className={styles.link}>
                <IconLinkedIn /> <span>LinkedIn</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
