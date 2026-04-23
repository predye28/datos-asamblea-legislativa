# Docker — Guía de aprendizaje personal

## ¿Qué es Docker?

Docker es una herramienta que empaqueta tu aplicación **junto con todo lo que necesita para correr** (Python, Node.js, librerías, configuración) dentro de un "contenedor".

Piénsalo así:

```
Sin Docker:
  Tu compu tiene Python 3.9 → funciona
  El servidor tiene Python 3.8 → puede fallar
  
Con Docker:
  El contenedor lleva su propio Python 3.11 → funciona igual en todos lados
```

---

## ¿Por qué usarlo en este proyecto?

### Antes (sin Docker)
- API en Render (un servicio)
- Frontend en Vercel (otro servicio)
- Scraper en GitHub Actions (otro servicio)
- Cada uno tiene su propia configuración, sus propias variables, sus propios logs
- Para ver qué está pasando hay que ir a 3 dashboards distintos

### Ahora (con Docker)
- Todo en un solo servidor
- Un solo comando para levantar todo: `docker compose up`
- Un solo lugar para ver logs: `docker compose logs`
- Mismo entorno local que en el servidor — si funciona aquí, funciona allá
- Costo: ~€4/mes en lugar de pagar 3 servicios

### Ventajas concretas para tu proyecto

| Problema antes | Cómo lo resuelve Docker |
|---|---|
| El scraper se caía en GitHub Actions por límite de tiempo | Corre en tu servidor sin límites |
| "Funciona en mi compu pero no en Render" | El contenedor es idéntico en todos lados |
| Hay que ir a 3 dashboards para ver errores | `docker compose logs -f` muestra todo junto |
| Fase1 dependía de GitHub Actions | Corre un cron dentro del contenedor |
| Desplegar un cambio requería push + esperar CI | `docker compose build api && docker compose up -d` |

---

## Conceptos clave

### Imagen
Una "foto" del sistema con todo instalado. Es como una plantilla. No corre sola.

```bash
docker images          # ver imágenes que tienes
docker image ls        # igual
docker image rm <id>   # borrar una imagen
```

### Contenedor
Una instancia **corriendo** de una imagen. Puedes tener 5 contenedores del mismo tipo si quieres.

```bash
docker ps              # contenedores corriendo ahora
docker ps -a           # todos, incluyendo los parados
docker stop <id>       # parar uno
docker rm <id>         # borrar uno (parado)
```

### Dockerfile
El script que le dice a Docker cómo construir una imagen. Ejemplo del API de este proyecto:

```dockerfile
FROM python:3.11-slim          # parte de esta imagen base
WORKDIR /app                   # carpeta de trabajo dentro del contenedor
COPY requirements.txt .        # copia el archivo
RUN pip install -r requirements.txt  # ejecuta esto al construir
COPY . .                       # copia todo el código
CMD ["uvicorn", "main:app"]    # comando que corre al iniciar
```

### docker-compose.yml
Orquesta **varios contenedores a la vez**. Este proyecto tiene 5 servicios definidos ahí:
- `nginx` — recibe todo el tráfico en puerto 80
- `api` — FastAPI
- `frontend` — Next.js
- `scraper-fase2` — bucle infinito de scraping
- `scraper-fase1` — cron diario a las 2am CR

### Volumen
Carpeta compartida entre el contenedor y tu máquina (o entre contenedores). Los datos en volúmenes **sobreviven** cuando el contenedor se borra. En este proyecto no usamos volúmenes de datos porque la BD está en Neon (cloud).

### Red (network)
Docker Compose crea automáticamente una red privada entre todos los servicios. Por eso `api` puede hablar con `nginx` usando el nombre `api:8000` sin exponer ese puerto al exterior.

---

## Comandos esenciales

### Construir imágenes

```bash
# Construir todos los servicios
docker compose build

# Construir solo uno (más rápido al hacer cambios)
docker compose build api
docker compose build frontend
docker compose build scraper-fase2

# Forzar reconstrucción sin caché (si algo quedó raro)
docker compose build --no-cache api
```

### Levantar y apagar

```bash
# Levantar todo y ver logs en tiempo real
docker compose up

# Levantar en fondo (background) — para producción
docker compose up -d

# Apagar todo (los contenedores se borran, las imágenes quedan)
docker compose down

# Apagar y borrar también los volúmenes (cuidado: borra datos locales)
docker compose down -v

# Reiniciar un servicio sin tocar los otros
docker compose restart scraper-fase2
```

### Ver logs

```bash
# Logs de todos los servicios (últimas 50 líneas)
docker compose logs --tail=50

# Logs en tiempo real de un servicio específico
docker compose logs -f scraper-fase2
docker compose logs -f api

# Logs de los últimos 100 mensajes + seguir en tiempo real
docker compose logs -f --tail=100 api
```

### Estado y diagnóstico

```bash
# Ver qué servicios están corriendo y su estado
docker compose ps

# Ver cuánta CPU/RAM está usando cada contenedor
docker stats

# Ver cuánto espacio usan imágenes, contenedores, volúmenes
docker system df
```

### Ejecutar comandos dentro de un contenedor

```bash
# Abrir una terminal bash dentro del contenedor del API
docker compose exec api bash

# Correr un comando puntual (sin abrir terminal)
docker compose exec api python -c "from main import app; print('ok')"

# Ver el heartbeat del scraper
docker compose exec scraper-fase2 cat /tmp/scraper_heartbeat
```

### Limpieza

```bash
# Borrar contenedores parados, imágenes sin usar, caché de builds
docker system prune

# Borrar TODO incluyendo imágenes que sí se usan (cuidado)
docker system prune -a

# Solo borrar caché de builds (libera espacio sin borrar imágenes)
docker builder prune
```

---

## Flujo de trabajo diario

### Cuando cambias código del API

```bash
docker compose build api        # reconstruye solo el API (~30 seg)
docker compose up -d api        # reinicia solo el API
docker compose logs -f api      # verifica que arrancó bien
```

### Cuando cambias el frontend

```bash
docker compose build frontend   # tarda más (~2 min, hace npm build)
docker compose up -d frontend
docker compose logs -f frontend
```

### Cuando cambias el scraper

```bash
docker compose build scraper-fase2
docker compose up -d scraper-fase2
docker compose logs -f scraper-fase2
```

### Ver si todo está bien de un vistazo

```bash
docker compose ps
```

La columna "Status" debe decir `running` para todos. Si alguno dice `exited`, hay un error — revisa sus logs.

---

## Buenas prácticas

### 1. Nunca subir el `.env` a git
Las credenciales (DATABASE_URL, API keys) van en `.env`. Ese archivo está en `.gitignore`. El `.env.example` sí va a git pero sin valores reales.

### 2. Una responsabilidad por contenedor
Cada servicio hace una sola cosa: el API solo responde requests, el scraper solo scrapea, el frontend solo sirve páginas. Esto hace fácil reiniciar uno sin tocar los demás.

### 3. Usar `restart: unless-stopped`
Todos los servicios en el `docker-compose.yml` tienen esto. Significa que si el contenedor se cae por error, Docker lo reinicia automáticamente. Solo no reinicia si tú lo paras manualmente con `docker compose down`.

### 4. Healthchecks para detectar zombies
El scraper-fase2 tiene un healthcheck que falla si el heartbeat tiene más de 10 minutos sin actualizarse. Esto detecta si el scraper está "vivo" pero congelado sin hacer nada.

### 5. Imágenes pequeñas
- Usar `python:3.11-slim` en lugar de `python:3.11` (la slim pesa ~50 MB, la normal ~350 MB)
- Usar `node:20-alpine` para Next.js (Alpine es una versión muy pequeña de Linux)
- El scraper pesa ~1.5 GB porque Playwright necesita Chromium completo — eso es normal y no hay forma de evitarlo

### 6. Build en dos etapas (multi-stage) para el frontend
El `frontend/Dockerfile` tiene dos etapas: `builder` (compila) y `runner` (solo corre). La imagen final solo incluye lo compilado, no las 500 MB de node_modules del build. Resultado: la imagen de producción pesa ~200 MB en lugar de ~700 MB.

### 7. Variables de entorno vs build args
- **Variables de entorno** (`env_file: .env`): se inyectan cuando el contenedor arranca, pueden cambiar sin reconstruir
- **Build args** (`ARG` en Dockerfile): se usan solo al construir la imagen — `NEXT_PUBLIC_API_URL` es así porque Next.js la embebe en el JavaScript compilado

### 8. No exponer puertos innecesarios
El API (`8000`) y el frontend (`3000`) usan `expose` en lugar de `ports` — eso significa que solo son accesibles dentro de la red de Docker. Solo nginx expone el puerto `80` al exterior. Más seguro.

---

## Arquitectura de este proyecto

```
Tu navegador (o internet)
        |
        | puerto 80
        |
    [ nginx ]
    /        \
   /api/*    /*
   |          |
[api:8000]  [frontend:3000]
   |
   | DATABASE_URL
   |
[Neon PostgreSQL - cloud]
        ^
        |
[scraper-fase2]  ← bucle infinito, escribe proyectos
[scraper-fase1]  ← cron diario, actualiza estado
```

nginx es el portero: todo entra por él, él decide a quién mandarlo.

---

## Errores comunes y cómo resolverlos

### "port is already allocated"
El puerto 80 ya lo está usando algo en tu compu (otro servidor, otro Docker).

```bash
# Ver qué está usando el puerto 80
netstat -ano | findstr :80

# O simplemente parar todos los contenedores
docker compose down
```

### El contenedor arranca y se apaga de inmediato
Hay un error en el startup. Revisa los logs:

```bash
docker compose logs api
```

Generalmente es un error de Python/Node al arrancar, o que la DATABASE_URL está mal.

### "no such file or directory" en el build
El `COPY` en el Dockerfile no encuentra un archivo. Verifica que el archivo existe y que el path es correcto.

### El scraper dice "no sandbox"
Falta la variable `CI=true`. Está en el `docker-compose.yml` pero si la borraste por accidente, el scraper no puede abrir Chromium dentro del contenedor.

### Build muy lento la primera vez
Normal. Playwright descarga Chromium (~150 MB) y todas sus dependencias del sistema. Las siguientes veces usa caché y tarda ~30 segundos.

---

## Diferencia entre local y servidor

El único archivo que cambia entre correr esto en tu compu y en el servidor es `.env`:

| Variable | Local | Servidor |
|---|---|---|
| `DATABASE_URL` | Tu Neon URL (igual) | Tu Neon URL (igual) |
| `CORS_ORIGINS` | `*` | `https://tudominio.com` |
| `NEXT_PUBLIC_API_URL` | `http://localhost/api` | `https://tudominio.com/api` |

Y el comando también cambia levemente: en el servidor usas `docker compose up -d` (background) porque no quieres que se pare cuando cierras la terminal.
