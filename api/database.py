"""
database.py — Conexión a PostgreSQL (Neon) y helpers de consulta
"""

import os
import threading
from typing import Any

import psycopg2
import psycopg2.extras
import psycopg2.pool
from dotenv import load_dotenv

load_dotenv()

# ── Pool de conexiones ────────────────────────────────────────────────
# minconn=1: siempre hay una lista. maxconn=10: máximo simultáneo en uvicorn.

_pool: psycopg2.pool.SimpleConnectionPool | None = None
_pool_lock = threading.Lock()


def _get_pool() -> psycopg2.pool.SimpleConnectionPool:
    global _pool
    if _pool is None or _pool.closed:
        url = os.getenv("DATABASE_URL")
        if not url:
            raise EnvironmentError("DATABASE_URL no definida.")
        _pool = psycopg2.pool.SimpleConnectionPool(
            1, 10, dsn=url, sslmode="require"
        )
    return _pool


# ── Helper interno robusto para obtener conexión ──────────────────────────

def _execute_with_retry(func, sql: str, params: tuple | dict = ()):
    """Ejecuta una consulta. Si hay OperationalError (Neon suspendió o cerró la conexión), reintenta una vez."""
    max_retries = 1
    for attempt in range(max_retries + 1):
        with _pool_lock:
            pool = _get_pool()
            conn = pool.getconn()
            
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                return func(cur, sql, params)
        except psycopg2.OperationalError as e:
            # La conexión de Neon probablemente se cerró por inactividad
            with _pool_lock:
                pool.putconn(conn, close=True) # Descartar esta conexión
                
            if attempt < max_retries:
                continue
            raise e
        except Exception as e:
            # Otro error, la conexión se devuelve pero quizás con rollback
            with _pool_lock:
                conn.rollback()
                pool.putconn(conn)
            raise e
        finally:
            with _pool_lock:
                try:
                    pool.putconn(conn)
                except Exception:
                    pass

# ── Helpers de consulta ───────────────────────────────────────────────

def fetchall(sql: str, params: tuple | dict = ()) -> list[dict]:
    """Ejecuta una query y devuelve todas las filas como lista de dicts."""
    def _run(cur, query, p):
        cur.execute(query, p)
        return [dict(row) for row in cur.fetchall()]
    return _execute_with_retry(_run, sql, params)


def fetchone(sql: str, params: tuple | dict = ()) -> dict | None:
    """Ejecuta una query y devuelve la primera fila como dict, o None."""
    def _run(cur, query, p):
        cur.execute(query, p)
        row = cur.fetchone()
        return dict(row) if row else None
    return _execute_with_retry(_run, sql, params)


def fetchval(sql: str, params: tuple | dict = ()) -> Any:
    """Devuelve el valor de la primera columna de la primera fila."""
    def _run(cur, query, p):
        cur.execute(query, p)
        row = cur.fetchone()
        return list(row.values())[0] if row else None
    return _execute_with_retry(_run, sql, params)
