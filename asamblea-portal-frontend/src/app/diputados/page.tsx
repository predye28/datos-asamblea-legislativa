"use client";
// src/app/diputados/page.tsx
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { api, DiputadoRanking } from "@/lib/api";
import { getPeriodos } from "@/lib/periodos";
import SectionRule from "@/components/ui/SectionRule";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import Hero from "@/components/sections/Hero";
import styles from "./diputados.module.css";

function DiputadosContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const periodos = getPeriodos();

  const [periodoIdx, setPeriodoIdx] = useState(1); // 1 = 6 meses
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [diputados, setDiputados] = useState<DiputadoRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [verTodos, setVerTodos] = useState(false);

  // Debounce para la búsqueda (300ms)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(handler);
  }, [query]);

  // Cargar diputados desde el nuevo endpoint
  useEffect(() => {
    setLoading(true);
    const desde = periodos[periodoIdx].desde();
    api.metricas
      .diputados({ desde, q: debouncedQuery })
      .then((res) => setDiputados(res.datos))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [periodoIdx, debouncedQuery]);

  // Lógica de visualización
  const maxProyectos = diputados[0]?.total_proyectos || 1;

  // Si estamos buscando activamente O elegimos ver todos, los mostramos completos.
  // Si no, limitamos a los top 10.
  const isBuscando = debouncedQuery.trim().length > 0;
  const mostrarTodos = verTodos || isBuscando;
  const displayCount = mostrarTodos ? diputados.length : 10;
  const visibleDiputados = diputados.slice(0, displayCount);
  const hayMas = diputados.length > 10 && !mostrarTodos;

  return (
    <div style={{ paddingBottom: 80 }}>
      <Hero
        kicker="Actividad parlamentaria"
        headline="Registro de iniciativas por diputado"
        deck={
          isBuscando
            ? "Resultados de búsqueda en todo el histórico de diputados."
            : "Distribución de diputaciones según la cantidad de proyectos presentados. Este registro refleja el volumen de iniciativas ingresadas a la secretaría del Plenario en el período seleccionado."
        }
      />

      <div className="container">
        <SectionRule
          label={
            isBuscando
              ? "Buscando en la base de datos histórica"
              : "Filtrar ranking"
          }
        />
        <div className={styles.controlsLayout}>
          <div
            className={styles.periodoSelector}
            role="group"
            aria-label="Filtrar por período"
          >
            {periodos.map((p, i) => (
              <button
                key={p.label}
                className={`${styles.periodoBtn} ${i === periodoIdx ? styles.periodoBtnActive : ""}`}
                onClick={() => {
                  setPeriodoIdx(i);
                  setVerTodos(false);
                  setQuery("");
                }}
                aria-pressed={i === periodoIdx}
                disabled={isBuscando}
                style={{ opacity: isBuscando ? 0.5 : 1 }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className={styles.searchWrap}>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Escribe el nombre de cualquier diputado histórico..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <SectionRule
          label={
            isBuscando
              ? `${diputados.length} resultados encontrados`
              : `Top de diputados (${diputados.length} en total)`
          }
        />

        {loading ? (
          <div className={styles.loading}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        ) : (
          <div className={styles.list}>
            {visibleDiputados.map((d, i) => {
              const barPct = Math.round(
                (d.total_proyectos / maxProyectos) * 100,
              );
              return (
                <div
                  key={`${d.nombre_completo}-${i}`}
                  className={styles.item}
                  onClick={() =>
                    router.push(
                      `/diputados/${encodeURIComponent(d.nombre_completo)}`,
                    )
                  }
                >
                  <span
                    className={`${styles.rank} ${i < 3 && !isBuscando ? styles.rankTop : ""}`}
                  >
                    {i + 1}
                  </span>
                  <div className={styles.info}>
                    <div className={styles.name}>{d.nombre_completo}</div>
                    <div className={styles.barWrap}>
                      <div
                        className={styles.barFill}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>
                  <div className={styles.count}>
                    <span className={styles.countNum}>{d.total_proyectos}</span>
                    <span className={styles.countLabel}>proyectos</span>
                  </div>
                  <span className={styles.arrow}>→</span>
                </div>
              );
            })}

            {visibleDiputados.length === 0 && (
              <div className={styles.empty}>
                No se encontró ningún diputado con ese nombre.
              </div>
            )}

            {hayMas && (
              <button
                className={styles.loadMoreBtn}
                onClick={() => setVerTodos(true)}
              >
                Ver listado completo ({diputados.length - 10} más ↓)
              </button>
            )}
          </div>
        )}

        <div className={styles.nota}>
          <div className={styles.notaTitle}>¿Qué mide este registro?</div>
          <p>
            {isBuscando
              ? "Esta visualización histórica muestra la cantidad total de proyectos propuestos por un diputado a lo largo del tiempo, sin importar si pertenecen o no al período legislativo actual."
              : "Esta visualización muestra la frecuencia con la que una diputación presenta nuevos expedientes a la corriente legislativa. Es un indicador de actividad propositiva que no contempla parámetros de efectividad, aprobación ni evaluación de contenido."}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DiputadosPage() {
  return (
    <Suspense
      fallback={
        <LoadingIndicator
          text="Analizando actividad legislativa..."
          fillSpace={true}
        />
      }
    >
      <DiputadosContent />
    </Suspense>
  );
}
