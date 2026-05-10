# CLAUDE.md — La Asamblea al Día

Guía de contexto para trabajar con este proyecto. Léela antes de proponer cambios.

---

## Qué es este proyecto

**La Asamblea al Día** es una plataforma ciudadana independiente y sin fines de lucro para dar seguimiento a la actividad legislativa de Costa Rica. Extrae datos del Sistema de Información Legislativa (SIL), los almacena en PostgreSQL y los presenta en una interfaz accesible para cualquier ciudadano.

- **Sitio web:** la-asamblea-al-dia.org
- **Repositorio:** github.com/omarmr14/datos-asamblea-legislativa
- **Contacto:** contacto@la-asamblea-al-dia.org
- **Licencia:** MIT · Sin fines de lucro

---

## Arquitectura

```
Cloudflare (DNS + HTTPS + CDN)
    └── Hostinger VPS (Ubuntu 24.04)
            └── Docker Compose
                    ├── nginx          → reverse proxy en puerto 80
                    ├── api            → FastAPI en puerto 8000 (interno)
                    ├── frontend       → Next.js en puerto 3000 (interno)
                    └── scraper        → Playwright daemon (sin puerto expuesto)
                                ↓
                        Neon (PostgreSQL gestionado en la nube)
```

**Regla de routing de nginx:**
- `/api/*` → api:8000
- `/docs`, `/health` → api:8000
- `/*` → frontend:3000

---

## Stack por servicio

| Servicio | Tecnología | Directorio |
|---|---|---|
| Frontend | Next.js 16 + React 19 + TypeScript | `frontend/` |
| API | FastAPI 0.115 + psycopg2 (sin ORM) | `api/` |
| Scraper | Playwright + BeautifulSoup4 + psycopg2 | `extractor_proyectos/` |
| Proxy | Nginx Alpine | `nginx/` |
| BD | PostgreSQL 16 via Neon | externo |
| Deploy | Docker Compose | `docker-compose.yml` |

---

## Variables de entorno críticas

Todas las variables van en un único `.env` en la raíz (nunca committear):

| Variable | Quién la usa | Cuándo cambia |
|---|---|---|
| `DATABASE_URL` | api + scraper | Cuando cambias de BD |
| `CORS_ORIGINS` | api | `*` en dev, `https://dominio` en prod |
| `NEXT_PUBLIC_API_URL` | frontend (build-time) | Cuando cambia el dominio — requiere rebuild |
| `CI` | scraper | Siempre `true` en Docker (headless Chromium) |
| `MAX_PAGINAS` | scraper | `2` en dev, sin límite en producción |

**NEXT_PUBLIC_API_URL se hornea en el bundle de Next.js al construir.** Cambiarla sin reconstruir el frontend no tiene efecto.

---

## Decisiones técnicas importantes

- **SQL directo sobre ORM:** Las queries usan psycopg2 sin SQLAlchemy. No introduzcas un ORM sin discutirlo.
- **CSS Modules:** No se usa Tailwind ni styled-components. Sigue el patrón `*.module.css`.
- **Sin build tool extra en el frontend:** Solo Next.js. No agregues Vite, Webpack personalizado, ni nada similar.
- **Playwright para scraping:** El scraper usa headless Chromium porque el SIL renderiza con JavaScript. No se puede cambiar a requests/httpx para las páginas de detalle.
- **`INTERNAL_API_URL`:** En Docker, el frontend usa `http://nginx/api/v1` para SSR (server-side), no `http://localhost`. Está hardcodeado en `docker-compose.yml`. No romper esto.

---

## Reglas de desarrollo

1. **Responsive siempre.** Cada componente del frontend debe verse bien en mobile.
2. **Sin librerías innecesarias.** Propone primero, implementa después.
3. **Planes en español** para tareas con más de 3 archivos afectados.
4. **Commits en español** con tipo: `feat:`, `fix:`, `docs:`, `chore:`.
5. **Sin comentarios que explican el qué** — solo el porqué cuando no es obvio.
6. **Prueba en Docker localmente** antes de proponer un deploy.

---

## Flujo de deploy

```bash
# Local → GitHub → Servidor
git push origin main
ssh deploy@IP 'cd datos-asamblea-legislativa && ./deploy.sh'
```

Ver `DESPLIEGUE.md` para el tutorial completo.

---

## Archivos clave

| Archivo | Para qué |
|---|---|
| `docker-compose.yml` | Orquesta los 4 servicios |
| `nginx/nginx.conf` | Reglas de routing |
| `.env.example` | Plantilla de variables (copiar → `.env`) |
| `api/database.py` | Conexión a BD con lógica de retry para Neon |
| `extractor_proyectos/sync_engine.py` | Schema de BD + lógica de upsert |
| `frontend/src/i18n/dictionaries/es.ts` | Fuente de verdad de todos los textos de la UI |
| `DESPLIEGUE.md` | Tutorial de producción (Hostinger + Cloudflare) |
| `CONTRIBUTING.md` | Guía para contribuidores |
| `DOCKER.md` | Guía de Docker para principiantes |

---

## Lo que NO debes hacer

- No committear `.env` con credenciales reales
- No usar `root` en el servidor (siempre `deploy`)
- No agregar Railway, Render, Vercel ni ningún PaaS — el deploy es Docker en Hostinger
- No modificar el schema de la BD directamente — crear un script `migrate_*.py` en `api/`
- No exponer puertos extra en `docker-compose.yml` sin justificación
- No cambiar `INTERNAL_API_URL` en `docker-compose.yml` sin entender el impacto en SSR
