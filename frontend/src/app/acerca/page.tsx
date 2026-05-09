'use client'

import CreatorSection from '@/components/sections/CreatorSection'
import { useT } from '@/i18n/LanguageProvider'
import styles from './acerca.module.css'

export default function AcercaPage() {
  const { dict } = useT()
  const t = dict.acerca

  return (
    <div className={styles.page}>

      <section className={styles.hero}>
        <div className={styles.heroDots} aria-hidden />
        <div className={styles.heroInner}>
          <span className={styles.heroEyebrow}>{t.heroEyebrow}</span>
          <h1 className={styles.heroTitle}>
            {t.heroTitleLine1}<br />
            <span className={styles.heroAccent}>{t.heroTitleAccent}</span>
          </h1>
          <p className={styles.heroDesc}>{t.heroDesc}</p>
        </div>
      </section>

      <div className={styles.main}>
        <div className={styles.layout}>

          <div className={styles.content}>

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>{t.propositoTitle}</h2>
                <p className={styles.sectionSubtitle}>{t.propositoSubtitle}</p>
              </div>
              <div className={styles.sectionContent}>
                <div className={styles.pullQuote}>
                  &ldquo;{t.propositoQuote}&rdquo;
                </div>
                <p className={styles.bodyText}>{t.propositoP1}</p>
                <p className={styles.bodyText}>{t.propositoP2}</p>
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>{t.compromisoTitle}</h2>
                <p className={styles.sectionSubtitle}>{t.compromisoSubtitle}</p>
              </div>
              <div className={styles.sectionContent}>
                <p className={styles.bodyText}>{t.compromisoP1}</p>
                <p className={styles.bodyText}>
                  {t.compromisoP2Prefix} <em>{t.compromisoP2Em}</em>{t.compromisoP2Suffix}
                </p>
                <div className={styles.principios}>
                  {t.principios.map(([titulo, desc]) => (
                    <div key={titulo} className={styles.principio}>
                      <div className={styles.principioDot} aria-hidden />
                      <div>
                        <div className={styles.principioTitle}>{titulo}</div>
                        <div className={styles.principioDesc}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>{t.comoFuncionaTitle}</h2>
                <p className={styles.sectionSubtitle}>{t.comoFuncionaSubtitle}</p>
              </div>
              <div className={styles.sectionContent}>
                <p className={styles.bodyText}>{t.comoFuncionaIntro}</p>
                <div className={styles.steps}>
                  {t.pasos.map(([num, title, desc]) => (
                    <div key={num} className={styles.step}>
                      <div className={styles.stepNum}>{num}</div>
                      <div className={styles.stepContent}>
                        <div className={styles.stepTitle}>{title}</div>
                        <div className={styles.stepDesc}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Sección "Por dentro" con video — oculta en la primera versión.
                Se reactiva cuando exista el video. */}
            {/*
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>{t.porDentroTitle}</h2>
                <p className={styles.sectionSubtitle}>{t.porDentroSubtitle}</p>
              </div>
              <div className={styles.sectionContent}>
                <p className={styles.bodyText}>{t.porDentroBody}</p>
                <div className={styles.videoPlaceholder}>
                  <div className={styles.videoIcon}>▶</div>
                  <div className={styles.videoLabel}>{t.videoLabel}</div>
                </div>
              </div>
            </section>
            */}

          </div>
        </div>

        <section className={styles.infoSection}>
          <div className={styles.infoContainer}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{t.soporteTitle}</h2>
              <p className={styles.sectionSubtitle}>{t.soporteSubtitle}</p>
            </div>
            <div className={styles.infoGrid}>
              <div className={styles.infoCard}>
                <div className={styles.infoCardAccent} />
                <div className={styles.infoTitle}>{t.soporteFuenteTitle}</div>
                <p className={styles.infoText}>{t.soporteFuenteText}</p>
                <a
                  href="https://www.asamblea.go.cr/Centro_de_informacion/Consultas_SIL/SitePages/SIL.aspx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.infoLink}
                >
                  {t.soporteFuenteLink}
                </a>
              </div>

              <div className={styles.infoCard}>
                <div className={styles.infoCardAccent} />
                <div className={styles.infoTitle}>{t.soporteErrorTitle}</div>
                <p className={styles.infoText}>{t.soporteErrorText}</p>
                <a href="mailto:contacto@la-asamblea-al-dia.org" className={styles.infoLink}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="m22 7-10 7L2 7"/>
                  </svg> contacto@la-asamblea-al-dia.org
                </a>
              </div>

              <div className={styles.infoCard}>
                <div className={styles.infoCardAccent} />
                <div className={styles.infoTitle}>{t.soporteCodigoTitle}</div>
                <p className={styles.infoText}>{t.soporteCodigoText}</p>
                <a
                  href="https://github.com/omarmr14/datos-asamblea-legislativa"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.infoLink}
                >
                  {t.soporteCodigoLink}
                </a>
              </div>
            </div>
          </div>
        </section>

        <CreatorSection />
      </div>
    </div>
  )
}
