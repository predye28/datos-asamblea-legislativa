"""
clasificar_historico.py
────────────────────────────────────────────────────────────────────────
Clasifica temáticamente TODOS los proyectos existentes en la BD.

Lee cada proyecto de la tabla `proyectos`, aplica la clasificación
basada en palabras clave del título y actualiza la tabla
`proyecto_categorias` de forma atómica por lote.

Uso
────
  python clasificar_historico.py
  python clasificar_historico.py --dry-run
  python clasificar_historico.py --batch 200

Opciones
────────
  --dry-run      Muestra qué categorías se asignarían sin escribir en la BD.
  --batch N      Tamaño del lote de proyectos a procesar por iteración
                 (default: 500).
"""

import argparse
import sys
from collections import Counter

from dotenv import load_dotenv

from sync_engine import (
    get_connection,
    crear_tablas,
    clasificar_proyecto,
    sync_categorias_proyecto,
)

load_dotenv()


# ════════════════════════════════════════════════════════════════════════
# HELPERS
# ════════════════════════════════════════════════════════════════════════

def _contar_proyectos(conn) -> int:
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM proyectos")
        return cur.fetchone()[0]


def _leer_lote(conn, offset: int, batch: int) -> list[tuple[int, str]]:
    """Retorna lista de (id, titulo) para el lote dado."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, titulo FROM proyectos ORDER BY id LIMIT %s OFFSET %s",
            (batch, offset),
        )
        return cur.fetchall()


# ════════════════════════════════════════════════════════════════════════
# CLASIFICACIÓN EN DRY-RUN (solo muestra, no escribe)
# ════════════════════════════════════════════════════════════════════════

def dry_run_lote(
    proyectos: list[tuple[int, str]],
    idx_inicio: int,
    total: int,
    resumen: Counter,
) -> None:
    for i, (pid, titulo) in enumerate(proyectos, start=idx_inicio):
        slugs = clasificar_proyecto(titulo or "")
        resumen.update(slugs)
        print(
            f"  [{i:>6}/{total}] ID {pid:>6} "
            f"| {', '.join(slugs):<40} "
            f"| {(titulo or '')[:60]}"
        )


# ════════════════════════════════════════════════════════════════════════
# CLASIFICACIÓN REAL
# ════════════════════════════════════════════════════════════════════════

def clasificar_lote(
    conn,
    proyectos: list[tuple[int, str]],
    idx_inicio: int,
    total: int,
    resumen: Counter,
) -> int:
    """
    Clasifica cada proyecto del lote dentro de una sola transacción.
    Retorna el número de proyectos procesados con éxito.
    """
    procesados = 0
    with conn.cursor() as cur:
        for i, (pid, titulo) in enumerate(proyectos, start=idx_inicio):
            try:
                n_cats = sync_categorias_proyecto(pid, titulo or "", cur)
                slugs  = clasificar_proyecto(titulo or "")
                resumen.update(slugs)
                print(
                    f"  [{i:>6}/{total}] ID {pid:>6} "
                    f"| {n_cats} cat. | {(titulo or '')[:60]}"
                )
                procesados += 1
            except Exception as exc:
                print(f"  [{i:>6}/{total}] ERROR ID {pid}: {exc}", file=sys.stderr)
    conn.commit()
    return procesados


# ════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ════════════════════════════════════════════════════════════════════════

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Clasifica temáticamente todos los proyectos en la BD."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Muestra las clasificaciones sin escribir en la BD.",
    )
    parser.add_argument(
        "--batch",
        type=int,
        default=500,
        metavar="N",
        help="Proyectos por lote (default: 500).",
    )
    args = parser.parse_args()

    modo = "DRY-RUN (sin cambios en la BD)" if args.dry_run else "ESCRITURA en la BD"
    print("=" * 70)
    print(f"  clasificar_historico.py — {modo}")
    print(f"  Tamaño de lote: {args.batch}")
    print("=" * 70)

    # Asegurar que las tablas (incluyendo categorias) existen
    crear_tablas()

    conn = get_connection()
    try:
        total = _contar_proyectos(conn)
        print(f"\nProyectos en la BD: {total}\n")

        if total == 0:
            print("No hay proyectos. Saliendo.")
            return

        resumen: Counter = Counter()
        procesados_total = 0
        offset = 0
        lote_num = 0

        while offset < total:
            lote_num += 1
            lote = _leer_lote(conn, offset, args.batch)
            if not lote:
                break

            idx_inicio = offset + 1
            print(f"\n── Lote {lote_num} | proyectos {idx_inicio}–{offset + len(lote)} ──")

            if args.dry_run:
                dry_run_lote(lote, idx_inicio, total, resumen)
                procesados_total += len(lote)
            else:
                procesados_total += clasificar_lote(
                    conn, lote, idx_inicio, total, resumen
                )

            offset += args.batch

    finally:
        conn.close()

    # Resumen final
    print("\n" + "=" * 70)
    print("RESUMEN POR CATEGORÍA")
    print("=" * 70)
    print(f"{'Categoría':<25} {'Proyectos':>10}")
    print("-" * 37)
    for slug, count in sorted(resumen.items(), key=lambda x: -x[1]):
        print(f"  {slug:<23} {count:>10,}")
    print("-" * 37)
    total_asignaciones = sum(resumen.values())
    print(f"  {'TOTAL asignaciones':<23} {total_asignaciones:>10,}")
    print(f"  {'Proyectos procesados':<23} {procesados_total:>10,}")
    print("=" * 70)

    if args.dry_run:
        print("\n[DRY-RUN] No se realizaron cambios en la base de datos.")
    else:
        print(f"\nClasificacion completa. {procesados_total} proyectos actualizados.")


if __name__ == "__main__":
    main()
