# Scraper — Datos Asamblea Legislativa

Módulo de extracción y sincronización de datos del Sistema de Información Legislativa (SIL) de Costa Rica.

Usa **Playwright** con Chromium headless para navegar páginas con JavaScript y **psycopg2** para sincronizar los datos directamente en PostgreSQL, sin intermediarios.

---

## Qué extrae

| Dato | Fuente en el SIL | Fase |
|---|---|---|
| Listado de proyectos (expediente, título, tipo, fecha, estado) | Página paginada principal | Fase 1 |
| Detalle de cada proyecto (comisión, proponentes, historial completo) | Página individual de cada expediente | Fase 2 |
| Actividad de diputados por período (proyectos liderados, aprobados) | Páginas de administraciones | Fase 3 |

---

## Estructura

```
extractor_proyectos/
├── fase1_scraper.py      # Sincroniza el listado paginado del SIL
├── fase2_scraper.py      # Extrae el detalle de cada proyecto (secuencial)
├── fase2_paralelo.py     # Versión paralela con workers y modo daemon
├── fase3_diputados.py    # Scraper de actividad de diputados por período
├── sync_engine.py        # Schema de BD + lógica de upsert para todos los scrapers
├── exportar_csv.py       # Exporta todas las tablas a archivos CSV
├── exports/              # CSVs y JSON generados (datos públicos)
├── Dockerfile
├── requirements.txt
└── .env.example
```

---

## Setup

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

pip install -r requirements.txt
playwright install chromium

cp .env.example .env
# Editar .env: agregar DATABASE_URL
```

---

## Cómo correr cada fase

### Fase 1 — Listado de proyectos

Sincroniza el listado paginado completo del SIL. Detecta proyectos nuevos y actualiza los existentes. Se detiene automáticamente cuando encuentra proyectos vencidos de más de 4 años (la cola "vieja" del SIL es estable).

```bash
# Correr completo (puede tardar horas la primera vez)
python fase1_scraper.py

# Para desarrollo, limitar páginas
MAX_PAGINAS=2 python fase1_scraper.py
```

**Frecuencia recomendada en producción:** una vez al día (ej. 1am hora de CR).

### Fase 2 — Detalle de proyectos

Extrae la página de detalle de cada proyecto: historial de trámites, lista de proponentes, comisión asignada. Requiere que la Fase 1 haya corrido antes para tener los expedientes en la BD.

**Opción A — Secuencial** (más lento pero más estable):
```bash
python fase2_scraper.py
```

**Opción B — Paralelo con workers** (recomendado para producción):
```bash
# Modo normal: procesa N páginas y termina
python fase2_paralelo.py --workers 2

# Modo daemon: corre indefinidamente con pausa entre ciclos
python fase2_paralelo.py --daemon --workers 2
```

En Docker Compose, el scraper corre como daemon con 2 workers por defecto.

### Fase 3 — Actividad de diputados

Extrae el historial de diputados por período de administración y calcula rankings de actividad.

```bash
python fase3_diputados.py
```

---

## Variables de entorno

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión PostgreSQL |
| `CI` | `true` para activar modo headless de Chromium (obligatorio en Docker y CI) |
| `MAX_PAGINAS` | Límite de páginas por corrida (útil en desarrollo) |

---

## sync_engine.py — El núcleo

`sync_engine.py` es compartido por los tres scrapers. Contiene:

- **Definición del schema:** crea todas las tablas (`proyectos`, `tramitacion`, `proponentes`, `categorias`, `historial_diputados`, etc.) si no existen.
- **Lógica de upsert:** inserta o actualiza registros de forma idempotente — correr el scraper dos veces no duplica datos.
- **Checkpoints:** guarda en qué página quedó la Fase 2 para poder reanudar sin perder progreso.

---

## exportar_csv.py — Datos públicos

Exporta todas las tablas de la BD a archivos CSV en `exports/`. Útil para periodistas de datos o investigadores que quieran el dataset completo sin usar la API.

```bash
python exportar_csv.py
```

Genera:
- `exports/proyectos.csv` — todos los proyectos
- `exports/tramitacion.csv` — historial completo de trámites
- `exports/proponentes.csv` — firmantes de cada proyecto
- `exports/categorias.csv` — categorías temáticas
- `exports/proyecto_categorias.csv` — relación proyecto ↔ categoría
- `exports/relaciones.json` — metadatos de relaciones entre tablas

---

## Notas sobre el SIL

- El SIL renderiza sus páginas con JavaScript → Playwright es obligatorio, no se puede usar `requests` para las páginas de detalle.
- El `docker-compose.yml` tiene un `extra_hosts` que resuelve `www.asamblea.go.cr` a su IP directa, para evitar problemas de DNS en algunos entornos.
- El healthcheck de Docker verifica que el archivo `/tmp/scraper_heartbeat` se haya actualizado en los últimos 10 minutos. Si el scraper muere silenciosamente, Docker lo detecta y reinicia.

---

## Deploy

El scraper corre como un servicio de Docker Compose. No requiere configuración adicional:

```bash
# Desde la raíz del repositorio
docker compose up -d scraper
docker compose logs -f scraper
```

Ver [`DESPLIEGUE.md`](../DESPLIEGUE.md) para el tutorial completo de producción.
