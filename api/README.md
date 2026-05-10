# API — La Asamblea al Día

Backend REST de la plataforma de transparencia legislativa de Costa Rica. Expone +21 000 proyectos de ley con búsqueda full-text, caché en memoria y documentación interactiva automática.

---

## Stack

| Pieza | Tecnología |
|---|---|
| Framework | FastAPI 0.115 |
| Base de datos | PostgreSQL via Neon |
| Driver BD | psycopg2 (SQL directo, sin ORM) |
| Deploy | Docker Compose (ver raíz del repo) |

---

## Estructura

```
api/
├── routers/
│   ├── proyectos.py           # GET /proyectos, /proyectos/{id}
│   ├── metricas.py            # Estadísticas ciudadanas (caché LRU)
│   ├── categorias.py          # Tipos de expediente
│   ├── periodos.py            # Períodos legislativos
│   └── partidos.py            # Partidos políticos
├── main.py                    # App FastAPI + CORS + registro de routers
├── database.py                # Conexión a BD con reintentos (Neon auto-suspend)
├── models.py                  # Schemas Pydantic de respuesta
├── constants.py               # Constantes (meses en español, etc.)
├── add_indexes.py             # [setup] Crea índices en la BD
├── enable_unaccent.py         # [setup] Habilita extensión unaccent
├── migrate_estado.py          # [migración] Columnas estado_actual/estado_grupo
├── migrate_drop_documentos.py # [migración] Elimina tabla documentos vacía
├── migrate_fix_fechas_2079.py # [migración] Corrige typos de fechas 1979→2079
├── Dockerfile
├── requirements.txt
└── .env.example
```

---

## Correr localmente

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # Agregar DATABASE_URL

# Setup inicial de la BD (solo la primera vez)
python enable_unaccent.py   # búsqueda sin tildes
python add_indexes.py       # índices de performance

uvicorn main:app --reload --port 8000
# Documentación interactiva: http://localhost:8000/docs
```

---

## Endpoints

### Proyectos

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/v1/proyectos` | Listado paginado con filtros |
| GET | `/api/v1/proyectos/{expediente}` | Detalle completo de un proyecto |

**Parámetros de filtro disponibles:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `pagina` | int | Página actual (default: 1) |
| `por_pagina` | int | Resultados por página (máx. 100) |
| `q` | string | Búsqueda full-text (título, diputado) |
| `tipo` | string | Tipo de expediente |
| `anio` | int | Año de inicio |
| `solo_leyes` | bool | Solo proyectos convertidos en ley |
| `partido` | string | Código del partido |
| `orden` | string | `reciente`, `antiguo`, `expediente` |

### Métricas

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/v1/metricas` | Resumen ciudadano completo |
| GET | `/api/v1/metricas/proximos-vencer` | Proyectos por vencer en 90 días |
| GET | `/api/v1/metricas/diputados` | Ranking de actividad legislativa |
| GET | `/api/v1/metricas/linea-tiempo` | Leyes aprobadas por año |

### Catálogos

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/v1/categorias` | Tipos de expediente disponibles |
| GET | `/api/v1/periodos` | Períodos legislativos |
| GET | `/api/v1/partidos` | Partidos políticos activos |

---

## Scripts de setup y migraciones

Todos los scripts son **idempotentes** — correrlos más de una vez no rompe nada.

### Setup inicial (correr una sola vez al configurar el entorno)

```bash
python enable_unaccent.py   # Habilita búsqueda sin tildes — obligatorio
python add_indexes.py       # Crea índices de performance — obligatorio
```

### Migraciones históricas

Registran cambios de schema aplicados en producción. Si configuras el entorno desde cero, el scraper crea el schema completo automáticamente y no necesitas correrlas.

| Script | Qué hace |
|---|---|
| `migrate_estado.py` | Agrega columnas `estado_actual` y `estado_grupo` a `proyectos` |
| `migrate_drop_documentos.py` | Elimina la tabla `documentos` (estaba vacía, se deprecó) |
| `migrate_fix_fechas_2079.py` | Corrige dos proyectos con fechas 2079 que debían ser 1979 |

---

## Variables de entorno

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión PostgreSQL |
| `CORS_ORIGINS` | Orígenes permitidos — `*` en dev, `https://tudominio.com` en producción |

---

## Deploy

El deploy se hace con Docker Compose desde la raíz del repositorio:

```bash
docker compose up -d --build
```

Ver [`DESPLIEGUE.md`](../DESPLIEGUE.md) para el tutorial completo de producción.
