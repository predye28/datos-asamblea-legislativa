"""
migrate_fix_fechas_2079.py
──────────────────────────────────────────────────────────────────────
Corrige dos expedientes con fecha_inicio = 2079, que en el SIL fueron
digitados con typo (escribieron "79" interpretado como año 2079).

Correcciones aplicadas:
  - Exp. 7306: 2079-09-01 → 1979-09-01
  - Exp. 7468: 2079-01-26 → 1979-01-26

Razonamiento: ambos expedientes tienen número bajo (7306, 7468) y temas
consistentes con los años 70s (impuesto sobre la renta, horarios laborales
en San José). El año "2079" no es plausible.

Toda corrección queda documentada en CORRECCIONES.md (raíz del repo).

Idempotente: si ya está corregido, no hace nada.

Uso:
  python migrate_fix_fechas_2079.py
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv

load_dotenv()


# Lista de correcciones: (expediente, fecha_original, fecha_corregida, razon)
CORRECCIONES = [
    (
        7306,
        "2079-09-01",
        "1979-09-01",
        "Typo de captura en SIL: '79' interpretado como 2079. "
        "Tema (Impuesto sobre la Renta) y número de expediente bajo "
        "consistentes con 1979.",
    ),
    (
        7468,
        "2079-01-26",
        "1979-01-26",
        "Typo de captura en SIL: '79' interpretado como 2079. "
        "Tema (horarios laborales en área metropolitana) y número de "
        "expediente bajo consistentes con 1979.",
    ),
]


def main():
    url = os.getenv("DATABASE_URL")
    if not url:
        raise SystemExit("DATABASE_URL no definida")

    conn = psycopg2.connect(url, sslmode="require")
    conn.autocommit = False
    cur = conn.cursor()

    aplicadas = 0
    omitidas = 0

    try:
        for expediente, fecha_orig, fecha_nueva, _razon in CORRECCIONES:
            cur.execute(
                "SELECT fecha_inicio FROM proyectos WHERE numero_expediente = %s",
                (expediente,),
            )
            row = cur.fetchone()

            if not row:
                print(f"  Exp {expediente}: NO existe en BD. Omitido.")
                omitidas += 1
                continue

            fecha_actual = str(row[0]) if row[0] else None

            if fecha_actual == fecha_nueva:
                print(f"  Exp {expediente}: ya corregido ({fecha_nueva}). Omitido.")
                omitidas += 1
                continue

            if fecha_actual != fecha_orig:
                print(
                    f"  Exp {expediente}: fecha_inicio actual ({fecha_actual}) "
                    f"no coincide con la original esperada ({fecha_orig}). "
                    f"OMITIDO por seguridad."
                )
                omitidas += 1
                continue

            cur.execute(
                "UPDATE proyectos SET fecha_inicio = %s WHERE numero_expediente = %s",
                (fecha_nueva, expediente),
            )
            print(f"  Exp {expediente}: {fecha_orig} → {fecha_nueva}")
            aplicadas += 1

        conn.commit()
        print()
        print(f"Correcciones aplicadas: {aplicadas}")
        print(f"Omitidas:               {omitidas}")
        print()
        print("Recordatorio: las correcciones quedan documentadas en CORRECCIONES.md")

    except Exception as e:
        conn.rollback()
        print(f"ERROR: {e}")
        sys.exit(1)
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
