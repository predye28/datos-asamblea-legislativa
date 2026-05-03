# Datos Asamblea Legislativa CR

> Portal de transparencia legislativa de Costa Rica — datos públicos, presentados de forma que cualquier ciudadano pueda entenderlos.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?logo=postgresql)](https://neon.tech)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## ¿Qué es esto?

La Asamblea Legislativa publica sus datos, pero de una forma que solo un abogado o un politólogo puede navegar. El ciudadano promedio no sabe que existe el SIL, y si lo visita, se va sin entender nada.

**El problema no es falta de transparencia, es falta de traducción.**

Este portal extrae los datos del Sistema de Información Legislativa (SIL), los almacena en una base de datos relacional y los presenta en una interfaz clara y accesible para cualquier persona.

---

## Funcionalidades

| Sección | Descripción |
|---------|-------------|
| **Proyectos** | Listado completo con búsqueda, filtros por año, tipo y estado |
| **Diputados** | Ranking de actividad legislativa por período |
| **Estadísticas** | Tasa de aprobación, proyectos por vencer, actividad mensual |
| **Detalle** | Expediente completo con historial de trámites y proponentes |

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │    Nginx    │  Reverse proxy / SSL
                    └──────┬──────┘
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼──────┐  ┌──▼──────┐  ┌──▼──────────────┐
       │  Frontend   │  │   API   │  │    Extractor    │
       │  Next.js 16 │  │ FastAPI │  │   Playwright    │
       │  React 19   │  │         │  │  (cron / manual)│
       └─────────────┘  └────┬────┘  └────────┬────────┘
                             │               │
                      ┌──────▼───────────────▼──────┐
                      │     PostgreSQL (Neon)        │
                      │       ~21 000 proyectos      │
                      └─────────────────────────────┘
```

**Flujo de datos:**
1. El **extractor** scrapeea el SIL con Playwright y sincroniza los proyectos en PostgreSQL.
2. La **API** expone esos datos vía REST.
3. El **frontend** consume la API y renderiza la interfaz ciudadana.

---

## Stack tecnológico

| Capa | Tecnología | Por qué |
|------|-----------|---------|
| Frontend | Next.js 16 + React 19 | App Router, SSR, TypeScript nativo |
| Estilos | CSS Modules + variables CSS | Sin dependencias extra, fácil de mantener |
| Gráficas | Recharts 3 | Integración React nativa |
| Backend | FastAPI 0.115 | Documentación `/docs` automática, stack Python |
| Base de datos | PostgreSQL via Neon | Cloud managed, tier gratuito generoso |
| Scraper | Playwright + psycopg2 | Headless Chromium, robusto para páginas con JS |
| Deploy | Docker Compose | Un solo `docker compose up` en cualquier VPS |
| Proxy | Nginx | Enrutamiento interno, SSL termination |

---

## Inicio rápido

### Con Docker (recomendado)

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/datos-asamblea-legislativa.git
cd datos-asamblea-legislativa

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tu DATABASE_URL y el dominio (ver sección Variables de entorno)

# 3. Levantar todos los servicios
docker compose up -d

# La app queda disponible en http://localhost
```

### Manual (desarrollo local)

**Requisitos previos:** Node.js 20+, Python 3.11+, PostgreSQL (o cuenta en [Neon](https://neon.tech))

#### 1. Base de datos

Crea una base de datos PostgreSQL y habilita la extensión para búsqueda sin acentos:

```sql
CREATE EXTENSION IF NOT EXISTS unaccent;
```

#### 2. Extractor (poblar la BD)

```bash
cd extractor_proyectos
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

pip install -r requirements.txt
playwright install chromium

cp .env.example .env             # Agregar DATABASE_URL

python fase1_scraper.py          # Extrae el listado de proyectos
python fase2_paralelo.py         # Extrae el detalle de cada uno (paralelo)
```

> La primera corrida completa tarda varias horas. Para pruebas locales, usa `MAX_PAGINAS=2` en el `.env`.

#### 3. API

```bash
cd api
python -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env             # Agregar DATABASE_URL y CORS_ORIGINS

uvicorn main:app --reload --port 8000
# Documentación interactiva: http://localhost:8000/docs
```

#### 4. Frontend

```bash
cd frontend
npm install

echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" > .env.local

npm run dev
# App en http://localhost:3000
```

---

## Variables de entorno

Copia `.env.example` → `.env` en la raíz y completa los valores:

| Variable | Descripción | Valor en desarrollo |
|----------|-------------|---------------------|
| `DATABASE_URL` | Cadena de conexión PostgreSQL | `postgresql://user:pass@host/db?sslmode=require` |
| `CORS_ORIGINS` | Orígenes permitidos para la API | `*` |
| `NEXT_PUBLIC_API_URL` | URL de la API desde el browser | `http://localhost:8000/api/v1` |
| `CI` | Activa modo headless del scraper | `true` (obligatorio en Docker) |
| `MAX_PAGINAS` | Páginas a scrapear por corrida | `2` (dev) / omitir para correr todo |

> **Nunca subas el archivo `.env` real a git.** El `.gitignore` ya lo excluye.

---

## Estructura del repositorio

```
datos-asamblea-legislativa/
├── api/                        # Backend FastAPI
│   ├── main.py                 # Entrada, CORS, registro de routers
│   ├── database.py             # Conexión y helpers SQL
│   ├── models.py               # Schemas Pydantic de respuesta
│   ├── routers/
│   │   ├── proyectos.py        # GET /proyectos, /proyectos/:id
│   │   ├── metricas.py         # Estadísticas ciudadanas
│   │   ├── categorias.py       # Tipos de expediente disponibles
│   │   └── periodos.py         # Períodos legislativos
│   ├── Dockerfile
│   └── requirements.txt
│
├── extractor_proyectos/        # Scraper y sincronización de datos
│   ├── fase1_scraper.py        # Extrae el listado paginado del SIL
│   ├── fase2_paralelo.py       # Extrae el detalle de cada proyecto (paralelo)
│   ├── sync_engine.py          # Lógica de upsert en PostgreSQL
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/                   # Aplicación Next.js
│   ├── src/
│   │   ├── app/                # Páginas (App Router)
│   │   ├── components/         # Componentes reutilizables
│   │   ├── i18n/               # Textos de la UI
│   │   └── lib/                # Utils y cliente de API
│   ├── Dockerfile
│   └── package.json
│
├── nginx/
│   └── nginx.conf              # Reverse proxy
│
├── docker-compose.yml          # Orquestación completa
├── .env.example                # Plantilla de variables
├── CONTRIBUTING.md             # Cómo contribuir al proyecto
└── DESPLIEGUE.md               # Guía completa de despliegue en producción
```

---

## API — Endpoints principales

La documentación interactiva completa está disponible en `/docs` (Swagger UI de FastAPI).

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/proyectos` | Listado paginado con filtros |
| GET | `/api/v1/proyectos/:expediente` | Detalle completo de un proyecto |
| GET | `/api/v1/metricas` | Resumen ciudadano completo |
| GET | `/api/v1/metricas/proximos-vencer` | Proyectos por vencer en 90 días |
| GET | `/api/v1/metricas/diputados` | Ranking de actividad por diputado |
| GET | `/api/v1/metricas/linea-tiempo` | Leyes aprobadas por año |

---

## Fuente de datos

Los datos provienen del **[Sistema de Información Legislativa (SIL)](https://www.asamblea.go.cr/SIL)** de la Asamblea Legislativa de Costa Rica, que es de acceso público. Este proyecto no modifica ni redistribuye los datos originales — los transforma en una forma más accesible para el ciudadano.

---

## Despliegue en producción

Ver [`DESPLIEGUE.md`](DESPLIEGUE.md) para la guía completa que cubre:
- Configuración de VPS (Hetzner / DigitalOcean)
- SSL con Let's Encrypt
- Actualizaciones manuales y automáticas (GitHub Actions)
- Backups y seguridad

---

## Contribuir

¡Las contribuciones son bienvenidas! Lee [`CONTRIBUTING.md`](CONTRIBUTING.md) para conocer el flujo de trabajo con ramas, convenciones de commits y cómo levantar el entorno local.

---

## Licencia

MIT © Omar Madrigal — ver [`LICENSE`](LICENSE) para detalles.
