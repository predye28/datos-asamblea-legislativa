"""
limpiar_expedientes.py
──────────────────────────────────────────────────────────────────────
Elimina expedientes de la BD y (opcionalmente) resetea el checkpoint
de Fase 2 para que el próximo run los vuelva a scrapear correctamente.

Las tablas hijas (proponentes, tramitacion, proyecto_categorias,
documentos) se borran automáticamente por CASCADE.

Uso:
    python limpiar_expedientes.py                        # Rango por defecto (ver abajo)
    python limpiar_expedientes.py --desde 25108 --hasta 25117
    python limpiar_expedientes.py --desde 25108 --hasta 25117 --checkpoint 38
    python limpiar_expedientes.py --checkpoint 38        # Solo ajusta checkpoint
"""

import argparse
import os
import sys

# Forzar UTF-8 en la consola de Windows
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import psycopg2
from dotenv import load_dotenv

load_dotenv()

# ── Rango por defecto (página 38 del run anterior) ─────────────────
DESDE_DEFAULT = 25108
HASTA_DEFAULT = 25117


def get_connection():
    url = os.getenv("DATABASE_URL")
    if not url:
        print("ERROR: Variable DATABASE_URL no encontrada en .env")
        sys.exit(1)
    return psycopg2.connect(url, sslmode="require")


def listar_expedientes(cur, desde: int, hasta: int):
    cur.execute(
        """
        SELECT p.numero_expediente, p.titulo,
               COUNT(DISTINCT pr.id)  AS n_prop,
               COUNT(DISTINCT tr.id)  AS n_tram,
               COUNT(DISTINCT pc.categoria_id) AS n_cat
        FROM proyectos p
        LEFT JOIN proponentes       pr ON pr.proyecto_id = p.id
        LEFT JOIN tramitacion       tr ON tr.proyecto_id = p.id
        LEFT JOIN proyecto_categorias pc ON pc.proyecto_id = p.id
        WHERE p.numero_expediente BETWEEN %s AND %s
        GROUP BY p.numero_expediente, p.titulo
        ORDER BY p.numero_expediente DESC
        """,
        (desde, hasta),
    )
    return cur.fetchall()


def borrar_expedientes(cur, desde: int, hasta: int) -> int:
    cur.execute(
        "DELETE FROM proyectos WHERE numero_expediente BETWEEN %s AND %s",
        (desde, hasta),
    )
    return cur.rowcount


def ajustar_checkpoint(cur, pagina: int):
    cur.execute(
        """
        INSERT INTO scraper_estado (fase, pagina_actual, ultima_ejecucion)
        VALUES ('fase2', %s, NOW())
        ON CONFLICT (fase) DO UPDATE SET
            pagina_actual    = EXCLUDED.pagina_actual,
            ultima_ejecucion = EXCLUDED.ultima_ejecucion
        """,
        (pagina,),
    )


def main():
    parser = argparse.ArgumentParser(
        description="Limpia expedientes contaminados de la BD y ajusta checkpoint."
    )
    parser.add_argument("--desde",       type=int, default=DESDE_DEFAULT,
                        help=f"Número de expediente mínimo a borrar (default: {DESDE_DEFAULT})")
    parser.add_argument("--hasta",       type=int, default=HASTA_DEFAULT,
                        help=f"Número de expediente máximo a borrar (default: {HASTA_DEFAULT})")
    parser.add_argument("--checkpoint",  type=int, default=None,
                        help="Página a la que resetear el checkpoint de Fase 2 (opcional)")
    parser.add_argument("--solo-checkpoint", action="store_true",
                        help="Solo ajusta el checkpoint, NO borra expedientes")
    args = parser.parse_args()

    print("=" * 60)
    print("  LIMPIEZA DE EXPEDIENTES — Asamblea Legislativa")
    print("=" * 60)

    with get_connection() as conn:
        with conn.cursor() as cur:

            # ── Mostrar lo que se va a borrar ─────────────────────
            if not args.solo_checkpoint:
                print(f"\nExpedientes a borrar: {args.hasta} → {args.desde}")
                print("(las tablas hijas se borran por CASCADE)\n")

                filas = listar_expedientes(cur, args.desde, args.hasta)
                if not filas:
                    print("  No se encontraron expedientes en ese rango.\n")
                else:
                    print(f"  {'Exp.':<8} {'Prop':>5} {'Trám':>5} {'Cat':>4}  Título")
                    print("  " + "-" * 70)
                    for exp, titulo, np, nt, nc in filas:
                        titulo_c = (titulo or "")[:55]
                        print(f"  {exp:<8} {np:>5} {nt:>5} {nc:>4}  {titulo_c}")
                    print(f"\n  Total: {len(filas)} expediente(s)\n")

                # ── Confirmación ──────────────────────────────────
                resp = input("¿Confirmar borrado? [s/N]: ").strip().lower()
                if resp != "s":
                    print("Operación cancelada.")
                    sys.exit(0)

                n = borrar_expedientes(cur, args.desde, args.hasta)
                print(f"\n  ✓ {n} expediente(s) eliminados (con sus proponentes, trámites y categorías).")

            # ── Ajustar checkpoint ────────────────────────────────
            if args.checkpoint is not None:
                ajustar_checkpoint(cur, args.checkpoint)
                print(f"  ✓ Checkpoint ajustado → página {args.checkpoint}.")

        conn.commit()

    print("\n  Listo. Podés correr el scraper desde la página indicada.")
    print("=" * 60)


if __name__ == "__main__":
    main()
