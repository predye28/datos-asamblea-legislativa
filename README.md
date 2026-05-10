# La Asamblea al Día

> Plataforma ciudadana independiente para dar seguimiento a la actividad legislativa de Costa Rica.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?logo=postgresql&logoColor=white)](https://neon.tech)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![License: MIT](https://img.shields.io/badge/Licencia-MIT-yellow.svg)](LICENSE)

---

## El problema que resuelve

La Asamblea Legislativa de Costa Rica publica sus datos en el [Sistema de Información Legislativa (SIL)](https://www.asamblea.go.cr/SIL). El acceso es público, pero la plataforma está pensada para uso institucional: difícil de navegar, imposible de buscar con criterios múltiples, sin visualizaciones, sin contexto.

El ciudadano promedio no sabe que existe, y si llega, se va sin entender nada.

**El problema no es falta de transparencia. Es falta de traducción.**

---

## Qué hace este proyecto

Extrae los datos del SIL de forma automatizada, los almacena en una base de datos relacional y los presenta en una interfaz clara, rápida y accesible para cualquier persona — no solo para abogados o politólogos.

| Sección | Qué encontrás |
|---|---|
| **Proyectos** | +21 000 iniciativas de ley con búsqueda full-text, filtros por año, estado, partido y tipo |
| **Diputados** | Perfiles individuales, ranking de actividad y eficacia legislativa por período |
| **Partidos** | Volumen de propuestas, leyes aprobadas y tasa de éxito por fracción política |
| **Estadísticas** | Gráficos de actividad mensual, línea de tiempo histórica, proyectos por vencer |
| **API pública** | REST API documentada en `/docs` para desarrolladores y periodistas de datos |

---

## Nuestros principios

| | |
|---|---|
| **Transparencia** | Los datos se extraen directamente del SIL, la fuente oficial. Sin editoriales, sin opiniones, sin sesgos. |
| **Independencia** | Sin agenda política ni intereses comerciales. No apoyamos ni criticamos a ninguna figura — el análisis te corresponde a vos. |
| **Participación** | Una ciudadanía informada es una ciudadanía activa. Facilitamos el acceso para que puedas dar seguimiento al trabajo de tus representantes. |
| **Accesibilidad** | Diseñado para cualquier persona. No hace falta saber de derecho ni de política para usar el sitio. |

---

## Cómo funciona

```
┌──────────────────────────────────────────────────────────────┐
│                         Internet                             │
└───────────────────────────┬──────────────────────────────────┘
                            │
                     ┌──────▼──────┐
                     │  Cloudflare │  DNS · HTTPS · CDN · DDoS
                     └──────┬──────┘
                            │
                     ┌──────▼──────┐
                     │    Nginx    │  Reverse proxy
                     └──────┬──────┘
               ┌────────────┼─────────────┐
               │            │             │
        ┌──────▼──────┐  ┌──▼──────┐  ┌──▼──────────────┐
        │  Frontend   │  │   API   │  │    Scraper      │
        │  Next.js 16 │  │ FastAPI │  │   Playwright    │
        │  React 19   │  │ Python  │  │  (daemon 24/7)  │
        └─────────────┘  └────┬────┘  └────────┬────────┘
                              │               │
                       ┌──────▼───────────────▼──────┐
                       │      PostgreSQL · Neon        │
                       │     +21 000 proyectos         │
                       └──────────────────────────────┘
```

1. El **scraper** corre en segundo plano 24/7 extrayendo y sincronizando proyectos del SIL con Playwright.
2. La **API** expone esos datos en formato REST con caché en memoria y búsqueda sin tildes.
3. El **frontend** consume la API con SSR y la presenta como interfaz ciudadana.
4. **Cloudflare** maneja HTTPS, CDN y protección sin costo adicional.

---

## Stack tecnológico

| Capa | Tecnología | Por qué |
|---|---|---|
| Frontend | Next.js 16 + React 19 | App Router, SSR, TypeScript, sin configuración extra |
| Estilos | CSS Modules + variables CSS | Sin dependencias extra, control total |
| Gráficas | Recharts 3 | Integración React nativa, liviano |
| API | FastAPI 0.115 + psycopg2 | Documentación automática, SQL directo sin ORM |
| Base de datos | PostgreSQL via Neon | Gestionado, backups automáticos, free tier |
| Scraper | Playwright + BeautifulSoup4 | Headless Chromium para páginas con JavaScript |
| Proxy / CDN | Nginx + Cloudflare | HTTPS gratis, caché, protección DDoS |
| Deploy | Docker Compose | Un solo comando en cualquier VPS |

---

## Inicio rápido

### Con Docker (recomendado)

```bash
# 1. Clonar
git clone https://github.com/omarmr14/datos-asamblea-legislativa.git
cd datos-asamblea-legislativa

# 2. Configurar variables
cp .env.example .env
# Editar .env — ver sección "Variables de entorno" más abajo

# 3. Levantar
docker compose up -d --build

# ✓ Frontend:  http://localhost
# ✓ API docs:  http://localhost/docs
```

La primera vez tarda ~15 min mientras descarga imágenes y compila el frontend.

### Manual (desarrollo)

**Requisitos:** Node.js 20+, Python 3.11+, PostgreSQL (o cuenta gratuita en [Neon](https://neon.tech))

```bash
# Base de datos — setup inicial (una sola vez)
cd api && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && cp .env.example .env
python enable_unaccent.py   # búsqueda sin tildes
python add_indexes.py       # índices de performance

# Scraper — poblar la base de datos
cd extractor_proyectos && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && playwright install chromium && cp .env.example .env
MAX_PAGINAS=2 python fase1_scraper.py    # 2 páginas para desarrollo
MAX_PAGINAS=2 python fase2_paralelo.py

# API
cd api && uvicorn main:app --reload --port 8000
# → http://localhost:8000/docs

# Frontend
cd frontend && npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" > .env.local
npm run dev
# → http://localhost:3000
```

---

## Variables de entorno

Copia `.env.example` → `.env` en la raíz y completa los valores:

| Variable | Descripción | Valor en desarrollo |
|---|---|---|
| `DATABASE_URL` | Cadena de conexión PostgreSQL | `postgresql://user:pass@host/db?sslmode=require` |
| `CORS_ORIGINS` | Orígenes permitidos para la API | `*` |
| `NEXT_PUBLIC_API_URL` | URL de la API (se hornea en el build del frontend) | `http://localhost:8000/api/v1` |
| `CI` | Activa modo headless de Chromium | `true` (obligatorio en Docker) |
| `MAX_PAGINAS` | Páginas a scrapear por corrida | `2` en dev, omitir en producción |

> `NEXT_PUBLIC_API_URL` queda embebida en el bundle de Next.js al construir. Cambiarla en producción requiere reconstruir el frontend (`docker compose build frontend`).

> **Nunca subas el archivo `.env` real a git.** El `.gitignore` ya lo excluye.

---

## Estructura del repositorio

```
datos-asamblea-legislativa/
│
├── api/                         # Backend FastAPI
│   ├── routers/                 # Endpoints por dominio
│   │   ├── proyectos.py         # Listado, búsqueda, detalle
│   │   ├── metricas.py          # Estadísticas ciudadanas
│   │   ├── categorias.py        # Tipos de expediente
│   │   ├── periodos.py          # Períodos legislativos
│   │   └── partidos.py          # Partidos políticos
│   ├── main.py                  # App FastAPI + CORS
│   ├── database.py              # Conexión con retry (Neon auto-suspend)
│   ├── models.py                # Schemas Pydantic de respuesta
│   ├── constants.py             # Meses en español y otras constantes
│   ├── add_indexes.py           # [setup] Crea índices
│   ├── enable_unaccent.py       # [setup] Extensión unaccent
│   ├── migrate_*.py             # Migraciones históricas de schema
│   └── README.md
│
├── extractor_proyectos/         # Scraper de datos del SIL
│   ├── fase1_scraper.py         # Sincroniza el listado paginado
│   ├── fase2_scraper.py         # Extrae el detalle de cada proyecto
│   ├── fase2_paralelo.py        # Versión paralela (daemon 24/7)
│   ├── fase3_diputados.py       # Actividad de diputados por período
│   ├── sync_engine.py           # Schema de BD + lógica de upsert
│   ├── exportar_csv.py          # Exporta tablas a CSV
│   ├── exports/                 # CSVs generados (datos públicos)
│   └── README.md
│
├── frontend/                    # Aplicación Next.js 16
│   ├── src/
│   │   ├── app/                 # Páginas (App Router)
│   │   ├── components/          # Componentes reutilizables
│   │   ├── i18n/                # Textos de la UI en español e inglés
│   │   └── lib/                 # Utilities y cliente de API
│   ├── Dockerfile
│   ├── package.json
│   └── README.md
│
├── nginx/
│   └── nginx.conf               # Routing: /api/* → FastAPI · /* → Next.js
│
├── docker-compose.yml           # Orquestación: nginx + api + frontend + scraper
├── .env.example                 # Plantilla de variables de entorno
├── CLAUDE.md                    # Contexto del proyecto para desarrollo con IA
├── CONTRIBUTING.md              # Guía para contribuidores
├── DESPLIEGUE.md                # Tutorial de producción paso a paso
├── DOCKER.md                    # Guía de Docker para principiantes
└── LICENSE                      # MIT
```

---

## API — Referencia rápida

Documentación interactiva completa en `/docs` (Swagger UI).

### Proyectos

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/v1/proyectos` | Listado paginado con filtros |
| `GET` | `/api/v1/proyectos/{expediente}` | Detalle completo de un proyecto |

**Parámetros de filtro:** `q` (búsqueda), `tipo`, `anio`, `solo_leyes`, `partido`, `orden`, `pagina`, `por_pagina`

### Estadísticas

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/v1/metricas` | Resumen ciudadano completo |
| `GET` | `/api/v1/metricas/proximos-vencer` | Proyectos por vencer en 90 días |
| `GET` | `/api/v1/metricas/diputados` | Ranking de actividad legislativa |
| `GET` | `/api/v1/metricas/linea-tiempo` | Leyes aprobadas por año |

### Catálogos

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/v1/categorias` | Tipos de expediente disponibles |
| `GET` | `/api/v1/periodos` | Períodos legislativos |
| `GET` | `/api/v1/partidos` | Partidos políticos activos |

---

## Fuente de datos

Los datos provienen del **[Sistema de Información Legislativa (SIL)](https://www.asamblea.go.cr/SIL)** de la Asamblea Legislativa de Costa Rica, de acceso público. Este proyecto no redistribuye datos originales — los transforma en una forma más accesible para el ciudadano, sin modificarlos.

---

## Despliegue en producción

Ver [`DESPLIEGUE.md`](DESPLIEGUE.md) — tutorial paso a paso para desplegar en **Hostinger VPS + Cloudflare + Neon**, pensado para quien lo hace por primera vez.

---

## Contribuir

¡Las contribuciones son bienvenidas! Este es un proyecto ciudadano de código abierto. Lee [`CONTRIBUTING.md`](CONTRIBUTING.md) para el flujo de trabajo, convenciones y cómo configurar el entorno local.

---

## Contacto

- Email: [contacto@la-asamblea-al-dia.org](mailto:contacto@la-asamblea-al-dia.org)
- GitHub Issues: [github.com/omarmr14/datos-asamblea-legislativa/issues](https://github.com/omarmr14/datos-asamblea-legislativa/issues)

---

## Licencia

MIT © Omar Madrigal — ver [`LICENSE`](LICENSE) para detalles.

Proyecto ciudadano independiente. Sin fines de lucro. Sin afiliación política.
