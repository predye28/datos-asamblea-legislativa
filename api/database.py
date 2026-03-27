"""
database.py — Conexión a PostgreSQL (Neon) y helpers de consulta
"""

import os
from contextlib import contextmanager
from typing import Any

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()


def get_connection():
    """Abre una conexión a la base de datos usando DATABASE_URL."""
    url = os.getenv("DATABASE_URL")
    if not url:
        raise EnvironmentError("DATABASE_URL no definida.")
    return psycopg2.connect(url, sslmode="require")


@contextmanager
def db_cursor():
    """
    Context manager que entrega un RealDictCursor listo para usar.
    Cierra la conexión automáticamente al salir del bloque.

    Uso:
        with db_cursor() as cur:
            cur.execute("SELECT ...")
            rows = cur.fetchall()
    """
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            yield cur
    finally:
        conn.close()


def fetchall(sql: str, params: tuple = ()) -> list[dict]:
    """Ejecuta una query y devuelve todas las filas como lista de dicts."""
    with db_cursor() as cur:
        cur.execute(sql, params)
        return [dict(row) for row in cur.fetchall()]


def fetchone(sql: str, params: tuple = ()) -> dict | None:
    """Ejecuta una query y devuelve la primera fila como dict, o None."""
    with db_cursor() as cur:
        cur.execute(sql, params)
        row = cur.fetchone()
        return dict(row) if row else None


def fetchval(sql: str, params: tuple = ()) -> Any:
    """Devuelve el valor de la primera columna de la primera fila."""
    with db_cursor() as cur:
        cur.execute(sql, params)
        row = cur.fetchone()
        return list(row.values())[0] if row else None
