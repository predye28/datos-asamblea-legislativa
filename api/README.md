# API Ciudadana — Asamblea Legislativa CR

Backend de la plataforma de transparencia legislativa de Costa Rica.  
Expone los proyectos de ley de forma accesible para cualquier ciudadano.

---

## Stack

| Pieza       | Tecnología             |
|-------------|------------------------|
| Framework   | FastAPI 0.115          |
| Base de datos | PostgreSQL (Neon)    |
| Deploy      | Railway / Render       |
| ORM         | psycopg2 (SQL directo) |

---

## Estructura

```
api/
├── main.py              ← app FastAPI + CORS
├── database.py          ← conexión y helpers de consulta
├── models.py            ← schemas Pydantic de respuesta
├── routers/
│   ├── proyectos.py     ← listar, buscar, detalle
│   └── metricas.py      ← estadísticas ciudadanas
├── requirements.txt
├── railway.toml         ← config de deploy en Railway
└── render.yaml          ← config de deploy en Render
```

---

## Correr localmente

```bash
# 1. Crear entorno virtual
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# 2. Instalar dependencias
pip install -r requirements.txt

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tu DATABASE_URL de Neon

# 4. Levantar el servidor
uvicorn main:app --reload --port 8000
```

Documentación interactiva disponible en: http://localhost:8000/docs

---

## Endpoints principales

### Proyectos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/proyectos` | Listado paginado con filtros |
| GET | `/api/v1/proyectos/{numero_expediente}` | Detalle completo |
| GET | `/api/v1/proyectos/buscar?q=texto` | Búsqueda por texto o diputado |
| GET | `/api/v1/proyectos-tipos` | Tipos de expediente disponibles |

#### Filtros disponibles para listado

| Parámetro   | Tipo    | Ejemplo | Descripción |
|-------------|---------|---------|-------------|
| `pagina`    | int     | `2` | Página actual |
| `por_pagina`| int     | `20` | Resultados por página (máx. 100) |
| `tipo`      | string  | `"Proyecto de Ley"` | Tipo de expediente |
| `anio`      | int     | `2024` | Año de inicio |
| `solo_leyes`| bool    | `true` | Solo proyectos convertidos en ley |
| `orden`     | string  | `reciente` | `reciente`, `antiguo`, `expediente` |

---

### Métricas

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/metricas` | Resumen completo ciudadano |
| GET | `/api/v1/metricas/actividad-semanal` | Movimientos de esta semana |
| GET | `/api/v1/metricas/proximos-vencer` | Proyectos por vencer en 90 días |
| GET | `/api/v1/metricas/linea-tiempo` | Leyes aprobadas por año |

---

## Deploy en Railway

1. Crear cuenta en [railway.app](https://railway.app)
2. "New Project" → "Deploy from GitHub repo"
3. Seleccionar este repositorio (o la carpeta `api/`)
4. Agregar variable de entorno `DATABASE_URL` en Settings → Variables
5. Railway detecta `railway.toml` y lanza automáticamente

## Deploy en Render

1. Crear cuenta en [render.com](https://render.com)
2. "New" → "Web Service" → conectar repositorio
3. Render detecta `render.yaml` automáticamente
4. Agregar `DATABASE_URL` en Environment Variables

---

## CORS

En desarrollo está abierto a todos los orígenes (`*`).  
En producción, editar `main.py` y restringir a tu dominio:

```python
allow_origins=["https://tu-portal-ciudadano.cr"]
```
