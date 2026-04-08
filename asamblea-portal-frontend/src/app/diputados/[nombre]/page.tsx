"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import SectionRule from "@/components/ui/SectionRule";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import styles from "./perfil.module.css";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface PeriodoData {
  periodo: string;
  total: number;
  leyes: number;
}

interface TemaData {
  tema: string;
  slug: string;
  total: number;
}

interface ProyectoResumen {
  numero_expediente: number;
  titulo: string | null;
  fecha_inicio: string | null;
  numero_ley: string | null;
}

interface PerfilDiputado {
  nombre_completo: string;
  total_proyectos: number;
  total_leyes: number;
  tasa_aprobacion: number;
  primer_proyecto: string;
  ultimo_proyecto: string;
  por_periodo: PeriodoData[];
  temas: TemaData[];
  ultimos_proyectos: ProyectoResumen[];
}

function formatName(name: string) {
  return name
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function fmtFecha(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function PeriodoBar({ datos, max }: { datos: PeriodoData[]; max: number }) {
  return (
    <div className={styles.periodoBars}>
      {datos.map((p) => (
        <div key={p.periodo} className={styles.periodoRow}>
          <span className={styles.periodoLabel}>{p.periodo}</span>
          <div className={styles.periodoBarWrap}>
            <div
              className={styles.periodoBarFill}
              style={{ width: `${Math.round((p.total / max) * 100)}%` }}
            />
            {p.leyes > 0 && (
              <div
                className={styles.periodoBarLey}
                style={{ width: `${Math.round((p.leyes / max) * 100)}%` }}
              />
            )}
          </div>
          <span className={styles.periodoCount}>{p.total}</span>
        </div>
      ))}
    </div>
  );
}

export default function PerfilDiputadoPage() {
  const params = useParams();
  const router = useRouter();
  const nombreRaw = decodeURIComponent(params.nombre as string);

  const [perfil, setPerfil] = useState<PerfilDiputado | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`${BASE}/metricas/diputados/${encodeURIComponent(nombreRaw)}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((data) => setPerfil(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [nombreRaw]);

  const maxPeriodo = perfil
    ? Math.max(...perfil.por_periodo.map((p) => p.total), 1)
    : 1;

  if (loading) {
    return (
      <div style={{ paddingBottom: 80, paddingTop: 40 }}>
        <LoadingIndicator text="Buscando registros del diputado..." fillSpace={true} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorWrap}>
        <div className={styles.errorIcon}>?</div>
        <h2>Diputado no encontrado</h2>
        <p>No encontramos registros para <strong>{formatName(nombreRaw)}</strong>.</p>
        <Link href="/diputados" className={styles.backLink}>← Volver al ranking</Link>
      </div>
    );
  }

  if (!perfil) return null;

  return (
    <div className={styles.page}>
      <div className={styles.backBar}>
        <button onClick={() => router.back()} className={styles.backBtn}>
          ← Volver
        </button>
      </div>

      <div className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.avatar}>{getInitials(nombreRaw)}</div>
          <div className={styles.heroText}>
            <p className={styles.heroKicker}>Perfil legislativo</p>
            <h1 className={styles.heroName}>{formatName(nombreRaw)}</h1>
            <p className={styles.heroSub}>Diputación · Asamblea Legislativa</p>
            {perfil.primer_proyecto && (
              <p className={styles.heroRange}>
                Registros desde {new Date(perfil.primer_proyecto).getFullYear()}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className={styles.container}>
        <SectionRule label="Métricas principales" />
        <div className={styles.statGrid}>
          <div className={styles.statCard}>
            <span className={styles.statNum}>{perfil.total_proyectos}</span>
            <span className={styles.statLabel}>Proyectos propuestos</span>
          </div>
          <div className={`${styles.statCard} ${styles.statCardAccent}`}>
            <span className={styles.statNum}>{perfil.total_leyes}</span>
            <span className={styles.statLabel}>Convertidos en ley</span>
          </div>
          <div className={`${styles.statCard} ${perfil.tasa_aprobacion >= 10 ? styles.statCardAccent : ""}`}>
            <span className={styles.statNum}>{perfil.tasa_aprobacion}%</span>
            <span className={styles.statLabel}>Eficacia legislativa</span>
          </div>
        </div>

        {perfil.por_periodo.length > 0 && (
          <>
            <SectionRule label="Actividad por período legislativo" />
            <section className={styles.card}>
              <p className={styles.cardDesc}>
                Total de proyectos en los que figura como proponente. La barra azul representa los proyectos que lograron aprobarse como leyes de la república.
              </p>
              <PeriodoBar datos={perfil.por_periodo} max={maxPeriodo} />
            </section>
          </>
        )}

        {perfil.temas.length > 0 && (() => {
          const maxTema = Math.max(...perfil.temas.map(t => t.total), 1);
          return (
            <>
              <SectionRule label="Enfoque temático" />
              <div className={styles.temasGrid}>
                {perfil.temas.map((t) => (
                  <Link
                    key={t.slug}
                    href={`/proyectos?categoria=${t.slug}`}
                    className={styles.temaChip}
                  >
                    <span className={styles.temaNombre}>{t.tema}</span>
                    <div className={styles.temaNumWrap}>
                      <div className={styles.temaBarWrap}>
                        <div
                          className={styles.temaBarFill}
                          style={{ width: `${Math.round((t.total / maxTema) * 100)}%` }}
                        />
                      </div>
                      <span className={styles.temaNum}>{t.total}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          );
        })()}

        {perfil.ultimos_proyectos.length > 0 && (
          <>
            <SectionRule label="Últimos proyectos propuestos" />
            <div className={styles.proyectosGrid}>
              {perfil.ultimos_proyectos.map((p) => (
                <Link
                  key={p.numero_expediente}
                  href={`/proyecto/${p.numero_expediente}`}
                  className={styles.proyectoCard}
                >
                  <div className={styles.pcTop}>
                    <div className={styles.pcMeta}>
                      <span className={styles.pcExp}>Exp. {p.numero_expediente}</span>
                      {p.numero_ley && <span className={styles.pcBadgeLey}>✓ Ley {p.numero_ley}</span>}
                    </div>
                    <span className={styles.pcArrow}>→</span>
                  </div>
                  <h3 className={styles.pcTitle}>{p.titulo ? (p.titulo.charAt(0).toUpperCase() + p.titulo.slice(1).toLowerCase()) : 'Sin título'}</h3>
                  <div className={styles.pcBottom}>
                    <span className={styles.pcDate}>Presentado en {fmtFecha(p.fecha_inicio)}</span>
                  </div>
                </Link>
              ))}
            </div>
            
            <div style={{ marginTop: 24 }}>
              <Link href={`/proyectos?proponente=${encodeURIComponent(nombreRaw)}`} className={styles.verTodosBtn}>
                Explorar todos los proyectos de este diputado →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
