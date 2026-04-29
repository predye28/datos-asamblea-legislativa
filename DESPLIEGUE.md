# Despliegue profesional — Guía para principiantes

Este documento explica **cómo desplegar este proyecto en un servidor real**, qué decisiones de arquitectura tomar, y sobre todo **cómo actualizar el proyecto cuando hagas cambios** (que es lo que más te preocupa porque nunca lo has hecho).

Está escrito asumiendo que **nunca antes has desplegado nada**. Si algo no se entiende, es bug del documento, no tuyo.

---

## Índice

1. [Conceptos previos: ¿qué es un servidor en producción?](#1-conceptos-previos)
2. [Análisis: ¿la base de datos en el mismo servidor?](#2-análisis-base-de-datos-en-el-mismo-servidor)
3. [Arquitectura recomendada (versión 1 vs futuro)](#3-arquitectura-recomendada)
4. [Primer despliegue paso a paso](#4-primer-despliegue-paso-a-paso)
5. [Cómo actualizar el proyecto (la parte que más te preocupa)](#5-cómo-actualizar-el-proyecto)
6. [Backups, seguridad y monitoreo](#6-backups-seguridad-y-monitoreo)
7. [Roadmap por etapas](#7-roadmap-por-etapas)
8. [Glosario](#8-glosario)

---

## 1. Conceptos previos

### ¿Qué es un "servidor" en producción?

Un servidor de producción es básicamente **una computadora encendida 24/7 con IP pública** en algún data center. No tiene pantalla ni teclado: te conectas por SSH (terminal remota) desde tu máquina.

Los proveedores más comunes para proyectos pequeños/medianos:

| Proveedor       | Precio/mes | Para quién                                     |
| --------------- | ---------- | ---------------------------------------------- |
| **Hetzner CX22**| ~€4        | Mejor relación precio/rendimiento. Recomendado.|
| **DigitalOcean**| $6         | Interfaz fácil, mucha documentación.           |
| **Contabo**     | €4         | Más recursos por precio, pero soporte malo.    |
| **AWS Lightsail**| $5        | Si ya estás en ecosistema AWS.                 |

Para tu caso (proyecto pequeño, scraper + API + frontend) un VPS de **2 vCPU + 4 GB RAM + 40 GB SSD** sobra. Eso es Hetzner CX22 o DigitalOcean $12.

### ¿Qué pasa cuando alguien entra a `tudominio.com`?

```
Usuario → DNS (apunta tudominio.com a 95.x.x.x)
       → llega al puerto 80/443 del servidor
       → nginx (reverse proxy) decide a dónde mandarlo
              ├── /api/* → contenedor api (FastAPI, puerto 8000)
              └── /*     → contenedor frontend (Next.js, puerto 3000)
```

Esto **ya está configurado** en tu `nginx/nginx.conf` y `docker-compose.yml`.

### ¿Qué es "desplegar"?

Es el proceso de **mover el código de tu compu a un servidor donde corra de forma permanente**. Tiene tres fases:

1. **Setup inicial** (lo haces una sola vez): comprar servidor, instalar Docker, comprar dominio, configurar HTTPS.
2. **Primer deploy**: subir el código y levantarlo.
3. **Updates** (lo harás muchas veces): aplicar cambios sin romper lo que ya está corriendo.

---

## 2. Análisis: base de datos en el mismo servidor

Esta es **la pregunta más importante** que tienes que decidir antes del primer despliegue. Hay tres opciones reales:

### Opción A — Base de datos en el **mismo contenedor** que el API

```
┌─────────────────────────────┐
│ Contenedor api              │
│  ├── FastAPI                │
│  └── PostgreSQL ← MAL       │
└─────────────────────────────┘
```

**No lo hagas.** Aunque suena eficiente, es un anti-patrón:

- Si reinicias el API para actualizar código, **la base se cae también** (downtime innecesario).
- Si el contenedor se borra, **se borran los datos** (a menos que uses volúmenes con cuidado).
- No puedes escalar el API sin escalar la base.
- Es difícil hacer backups limpios.

**Regla de oro de Docker**: un contenedor = un proceso = una responsabilidad.

### Opción B — Base de datos en **otro contenedor** dentro del mismo servidor

```
┌──────────────────────────────────────────┐
│ Servidor (un solo VPS)                   │
│                                          │
│  [api]  [frontend]  [scraper]  [nginx]   │
│       \      |        /                  │
│        \     |       /                   │
│         [postgres] ← contenedor aparte    │
│            │                             │
│         volumen Docker (datos persisten) │
└──────────────────────────────────────────┘
```

Esta es la opción **recomendada cuando creces más allá del free tier de Neon**.

**Ventajas:**
- Latencia mínima: API y BD se comunican por la red interna de Docker (~0.1ms).
- Sin costos de egress (transferencia de datos).
- Control total: extensiones, configuración, tunning.
- Backups bajo tu control.
- Cero dependencia externa.

**Desventajas:**
- **Tú eres responsable** de los backups (si los olvidas y el disco muere, perdiste todo).
- **Tú eres responsable** del tuning (memoria, conexiones, etc.).
- Si el servidor cae, todo cae junto (no hay separación de fallos).
- Disco lleno = aplicación rota.

### Opción C — Base de datos **gestionada externa** (Neon, Supabase, RDS)

```
[VPS con app] ──internet──→ [Neon (postgres gestionado)]
```

**Lo que tienes ahora.**

**Ventajas:**
- Backups automáticos.
- Alta disponibilidad (réplicas, failover).
- Escala sin que tú hagas nada.
- Si el servidor de la app explota, los datos están a salvo.

**Desventajas:**
- Latencia: ~30-100ms por query (depende de la región).
- Cuesta dinero cuando pasas el free tier.
- Dependes del proveedor (si Neon cae, tu app cae).
- Lock-in: migrar a otro proveedor es trabajo.

### Recomendación concreta para TU proyecto

| Etapa                                  | Recomendación        | Por qué                                                                                         |
| -------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------- |
| **Hoy** (proyecto chico, tráfico bajo) | **Quedarte con Neon**| Ya funciona, free tier alcanza, backups automáticos, no tienes que aprender admin de Postgres. |
| **Cuando pases el free tier**          | **Postgres local en otro contenedor** | Ahorras dinero, latencia mejor, control total. Pero solo cuando ya sepas hacer backups. |
| **Si el proyecto se vuelve crítico**   | **Postgres gestionado pagado** (Neon Pro, RDS) | Cuando perder datos sea catastrófico, paga por la tranquilidad. |

**No saltes a la opción B sin antes saber hacer backups y restaurarlos.** Un proyecto sin backups verificados es una bomba de tiempo.

---

## 3. Arquitectura recomendada

### Versión 1 (lo que tienes ahora — ya está bien)

```
Internet
   │
   │ :80 / :443
   ▼
┌───────────────────────────────────┐
│ VPS (Hetzner / DigitalOcean)      │
│                                   │
│  [nginx] → [api] [frontend]       │
│              │                    │
│              │ DATABASE_URL       │
└──────────────┼────────────────────┘
               │
               ▼
         [Neon Postgres]
         (cloud, gestionado)
```

Esta versión está **lista para desplegarse hoy**. Tu `docker-compose.yml` ya la implementa.

### Versión 2 (cuando crezcas — DB local)

```
┌───────────────────────────────────────────┐
│ VPS                                       │
│                                           │
│  [nginx] → [api] [frontend] [scraper]     │
│              │                            │
│              ▼                            │
│         [postgres] ←── volumen Docker     │
│                       (datos persistentes)│
│                                           │
│  + cron diario que copia backup a S3/B2   │
└───────────────────────────────────────────┘
```

Para llegar acá hay que:
1. Añadir un servicio `postgres` al `docker-compose.yml`.
2. Configurar un **volumen** Docker para persistir datos.
3. Migrar los datos de Neon (`pg_dump` + `pg_restore`).
4. Cambiar `DATABASE_URL` a `postgresql://user:pass@postgres:5432/db`.
5. Configurar backups automáticos a almacenamiento externo (S3, Backblaze B2, etc.).

**No hagas esto en el primer despliegue.** Hazlo cuando ya tengas el proyecto corriendo en producción y entiendas el flujo.

---

## 4. Primer despliegue paso a paso

### 4.1. Comprar el servidor

Crea cuenta en Hetzner / DigitalOcean / etc. Crea un VPS con:
- **OS**: Ubuntu 24.04 LTS
- **Tamaño**: 2 vCPU, 4 GB RAM, 40 GB SSD
- **Región**: la más cercana a Costa Rica (US East, generalmente)
- **SSH key**: súbela al crearlo (no uses contraseña)

Anota la **IP pública** que te dan (ej: `95.217.x.x`).

### 4.2. Conectarte al servidor

Desde tu máquina local:

```bash
ssh root@95.217.x.x
```

Si te pide contraseña, configuraste mal la SSH key. Reinstala el VPS y agrega la key correcta.

### 4.3. Setup inicial del servidor

Una sola vez, dentro del servidor:

```bash
# Actualizar el sistema
apt update && apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com | sh

# Instalar git (probablemente ya está)
apt install -y git

# Crear un usuario que NO sea root (buena práctica de seguridad)
adduser deploy
usermod -aG docker,sudo deploy

# Configurar firewall mínimo
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable
```

### 4.4. Clonar el proyecto

```bash
# Como usuario deploy (no root)
su - deploy
cd ~

# Clonar tu repo
git clone https://github.com/TU_USUARIO/datos-asamblea-legislativa.git
cd datos-asamblea-legislativa
```

### 4.5. Configurar variables de entorno

```bash
cp .env.example .env
nano .env
```

Edita los valores:

```env
DATABASE_URL=postgresql://...tu Neon URL real...
CORS_ORIGINS=https://tudominio.com
NEXT_PUBLIC_API_URL=https://tudominio.com/api/v1
CI=true
```

### 4.6. Levantar todo

```bash
docker compose up -d --build
```

La primera vez tarda **10-15 minutos** porque construye todas las imágenes desde cero (especialmente el scraper que descarga Chromium).

Verifica:

```bash
docker compose ps
```

Todos deben decir `Up`. Si alguno dice `Exited`, mira sus logs:

```bash
docker compose logs api
docker compose logs frontend
docker compose logs scraper
```

### 4.7. Configurar dominio + HTTPS

#### DNS

En tu proveedor de dominio (Namecheap, Cloudflare, etc.), crea un registro A:

```
Tipo: A
Nombre: @ (o www)
Valor: 95.217.x.x  (la IP del VPS)
```

Espera 5-30 minutos a que propague.

#### HTTPS con Let's Encrypt (gratis, automático)

La forma moderna es usar **Caddy** o **Traefik** en lugar de nginx, porque manejan HTTPS automáticamente. Pero si quieres mantener nginx, usa `certbot`:

```bash
# Instalar certbot en el host (no en Docker)
apt install -y certbot python3-certbot-nginx
```

Otra opción más limpia: **agregar un servicio `certbot` al docker-compose** que renueve automáticamente. Pero eso lo dejamos para una versión futura del documento — por ahora, hazlo manualmente la primera vez.

**Alternativa más simple**: usa **Cloudflare** como CDN. Apuntas el dominio a Cloudflare, Cloudflare maneja HTTPS automáticamente, y el tráfico llega a tu servidor por HTTP. Esto es lo que hace mucha gente para evitar el dolor de certbot.

---

## 5. Cómo actualizar el proyecto

**Esta es la parte que te preocupa.** Te explico desde lo más simple hasta lo más profesional.

### El concepto clave

El servidor **NO se actualiza solo**. Cuando haces cambios en tu compu y los subes a GitHub, el servidor todavía tiene la versión vieja. Tienes que **decirle al servidor**: "trae el código nuevo y reconstruye los contenedores".

Hay 3 formas de hacerlo, de más manual a más automática:

---

### Forma 1 — Manual por SSH (lo más simple, recomendado para empezar)

**Flujo:**

```
1. Trabajas en tu compu        →  2. git push al GitHub  →  3. SSH al servidor
                                                              │
                                                              ▼
                                                          git pull + rebuild
```

#### En tu compu (local)

```bash
# Trabajas, commiteas, pusheas
git add .
git commit -m "fix: corregir filtro de proyectos"
git push origin main
```

#### En el servidor (por SSH)

```bash
ssh deploy@95.217.x.x
cd ~/datos-asamblea-legislativa

# Traer el código nuevo
git pull

# Reconstruir SOLO el servicio que cambió
docker compose build api          # si cambiaste el API
docker compose up -d api          # reinicia el API con la imagen nueva

# Verificar que arrancó bien
docker compose logs -f api
# Ctrl+C cuando veas que arrancó OK
```

**Tiempo total**: ~30 segundos para el API, ~2 min para el frontend.

#### Casos típicos

| Cambiaste...                            | Comando                                                    | Tiempo |
| --------------------------------------- | ---------------------------------------------------------- | ------ |
| Código del API (`api/*.py`)             | `docker compose build api && docker compose up -d api`     | ~30s   |
| Código del frontend (`frontend/*.tsx`)  | `docker compose build frontend && docker compose up -d frontend` | ~2 min |
| Código del scraper                      | `docker compose build scraper && docker compose up -d scraper` | ~5 min |
| `nginx/nginx.conf`                      | `docker compose restart nginx`                             | ~2s    |
| Variables en `.env` (sin tocar código)  | `docker compose up -d` (no requiere rebuild)               | ~5s    |
| `requirements.txt` (nuevas dependencias)| `docker compose build api && docker compose up -d api`     | ~1 min |
| `package.json` (nuevas dependencias front)| `docker compose build frontend && docker compose up -d frontend` | ~3 min |
| Solo `docker-compose.yml`               | `docker compose up -d`                                     | ~5s    |

#### Atajo: script de deploy

Crea un archivo `deploy.sh` en el servidor:

```bash
#!/bin/bash
set -e
cd ~/datos-asamblea-legislativa
git pull
docker compose build
docker compose up -d
docker compose ps
```

Y dale permisos:

```bash
chmod +x deploy.sh
```

Ahora cada update es:

```bash
ssh deploy@95.217.x.x './datos-asamblea-legislativa/deploy.sh'
```

**Esta es la forma profesional cuando empiezas.** No automatices hasta que entiendas bien el flujo manual.

---

### Forma 2 — Webhook simple (semi-automático)

Cuando ya domines el flujo manual, puedes automatizarlo así:

1. En el servidor, corres un pequeño script que escucha webhooks de GitHub.
2. Cuando haces `git push`, GitHub manda un POST al servidor.
3. El servidor ejecuta `deploy.sh` automáticamente.

Esto es una forma artesanal de CI/CD. Funciona pero es frágil. Mejor saltar directo a la forma 3.

---

### Forma 3 — GitHub Actions + auto-deploy (lo que hacen los pros)

**Idea:**

```
1. git push                    →   GitHub Actions construye las imágenes Docker
                                                      │
                                                      ▼
                                            Las publica a un registry
                                            (GitHub Container Registry)
                                                      │
                                                      ▼
                                            Notifica al servidor
                                                      │
                                                      ▼
                              El servidor descarga las imágenes nuevas
                                       y reinicia los contenedores
```

**Ventajas:**
- Push y listo. No tocas el servidor.
- Si la build falla, el servidor sigue corriendo la versión vieja.
- Logs de deploys quedan en GitHub.
- Rollback fácil (vuelves a la imagen anterior).

**Desventajas:**
- Setup inicial más complejo (~2 horas la primera vez).
- Hay que aprender YAML de GitHub Actions.

**No empieces con esto.** Empieza con la Forma 1, y cuando lleves 10-20 deploys manuales y entiendas todo el flujo, migra a Forma 3.

---

### Reglas de oro para no romper producción

1. **Siempre prueba localmente primero.** `docker compose up` en tu compu antes de pushear.
2. **Cambios pequeños y frecuentes** son más seguros que un megacommit con 20 cambios.
3. **Ten un plan de rollback.** Antes de deploy, anota el commit anterior:
   ```bash
   git log -1 --format=%H  # guarda este hash por si tienes que volver
   ```
   Si algo se rompe:
   ```bash
   git checkout <hash-anterior>
   docker compose build && docker compose up -d
   ```
4. **Mira los logs después de cada deploy.**
   ```bash
   docker compose logs --tail=50 -f api
   ```
5. **Migraciones de base de datos van primero, código después.** Si añades una columna, primero corres la migración, luego deployas el código que la usa.
6. **No hagas deploy un viernes a las 5 PM.** Si rompes algo, te pasas el fin de semana arreglándolo. Los pros despliegan martes/miércoles en la mañana.

---

### Caso especial: cambios al `docker-compose.yml`

Si cambiaste `docker-compose.yml` (añadiste un servicio, cambiaste un puerto, etc.):

```bash
docker compose up -d
```

Docker compara el archivo nuevo con el estado actual y solo recrea lo que cambió. Si querías cambios drásticos:

```bash
docker compose down
docker compose up -d --build
```

Esto sí causa downtime (~30 segundos). Hazlo solo cuando sea necesario.

---

### Caso especial: cambios al `.env`

```bash
# Editas el .env en el servidor
nano .env

# Aplicas los cambios reiniciando los servicios afectados
docker compose up -d
```

Docker detecta que cambió el `.env` y reinicia los contenedores que lo usan. **No requiere rebuild** (excepto `NEXT_PUBLIC_API_URL` que está hardcoded en el bundle de Next.js — ese sí requiere `docker compose build frontend`).

---

## 6. Backups, seguridad y monitoreo

### Backups

Si te quedas con Neon → **Neon hace backups automáticos**. No tienes que hacer nada.

Si migras a Postgres local → **TÚ haces los backups**. Setup mínimo:

```bash
# Cron diario en el host
0 3 * * * docker exec postgres pg_dump -U user dbname | gzip > /backups/db-$(date +\%F).sql.gz
```

Y **copiar los backups a otro lugar** (Backblaze B2, S3, otro servidor). Un backup en el mismo servidor que la BD no es backup — si el disco muere, perdiste todo.

### Seguridad básica

- **No uses root**. Crea usuario `deploy` con sudo (ya está en el setup arriba).
- **SSH solo por key, no contraseña**. Edita `/etc/ssh/sshd_config`:
  ```
  PasswordAuthentication no
  ```
- **Firewall mínimo**: solo abre 80, 443, 22.
- **Actualiza el sistema**: `apt update && apt upgrade -y` cada par de semanas.
- **No expongas puertos innecesarios**. Tu compose usa `expose` (interno) en lugar de `ports` (público) para api, frontend, scraper. Eso ya está bien.
- **`.env` con permisos restrictivos**:
  ```bash
  chmod 600 .env
  ```

### Monitoreo (versión simple)

Para empezar:

```bash
# Ver estado rápido
docker compose ps

# Logs en vivo
docker compose logs -f --tail=100

# Uso de CPU/RAM
docker stats
```

Cuando crezcas: **Grafana + Prometheus**, o servicios gestionados como **Better Stack**, **Uptime Kuma** (self-hosted, gratis), o **Sentry** (errores de código).

---

## 7. Roadmap por etapas

### Etapa 0 — Hoy
- [x] Tienes Docker compose funcionando local
- [x] Tienes `.env.example`
- [x] La BD está en Neon

### Etapa 1 — Primer despliegue
- [ ] Comprar VPS (Hetzner CX22)
- [ ] Comprar dominio
- [ ] SSH + Docker setup
- [ ] Clonar repo, configurar `.env`
- [ ] `docker compose up -d --build`
- [ ] Configurar DNS apuntando al VPS
- [ ] Configurar HTTPS (Cloudflare es lo más fácil)
- [ ] **Practica el flujo de update manual (Forma 1)**: haz 5-10 cambios pequeños y deploya cada uno por SSH

### Etapa 2 — Operación estable (primeros 1-2 meses)
- [ ] Documentar tu propio `deploy.sh`
- [ ] Configurar logs persistentes (rotar logs viejos)
- [ ] Monitoreo simple (Uptime Kuma, gratis y self-hosted)
- [ ] Verificar que Neon hace backups (entrar a su dashboard)

### Etapa 3 — Automatización
- [ ] Setup GitHub Actions para build + deploy automático
- [ ] Pipeline de tests (cuando los escribas)
- [ ] Staging environment (segundo VPS o dominio `staging.tudominio.com`)

### Etapa 4 — Escalar (solo si el proyecto crece)
- [ ] Migrar BD a Postgres en mismo servidor (Opción B) — solo si el costo de Neon empieza a doler
- [ ] CDN para assets estáticos
- [ ] Múltiples instancias del API con balanceador
- [ ] Métricas con Grafana/Prometheus

**Tomate cada etapa con calma. La gente quema mucho tiempo en Etapa 3 sin haber consolidado Etapa 1.**

---

## 8. Glosario

| Término             | Qué es                                                                          |
| ------------------- | ------------------------------------------------------------------------------- |
| **VPS**             | Virtual Private Server. Una computadora alquilada en la nube.                   |
| **SSH**             | Forma de conectarte por terminal a un servidor remoto.                          |
| **DNS**             | Sistema que convierte `tudominio.com` → `95.217.x.x` (IP).                      |
| **Reverse proxy**   | Servidor (nginx) que recibe el tráfico y lo distribuye a contenedores internos. |
| **Container registry** | Almacén de imágenes Docker (Docker Hub, GitHub Container Registry).          |
| **CI/CD**           | Automatización de tests y deploy cuando haces push a GitHub.                    |
| **Volumen Docker**  | Carpeta que persiste cuando el contenedor se borra.                             |
| **Rollback**        | Volver a la versión anterior cuando un deploy salió mal.                        |
| **Downtime**        | Tiempo en el que el sitio está caído (durante un deploy, reinicio, etc.).       |
| **Healthcheck**     | Test automático que Docker corre para saber si un contenedor está sano.         |
| **Egress**          | Tráfico saliente del servidor. Algunos providers cobran por esto.               |

---

## TL;DR — la versión corta

1. **No pongas la BD en el mismo contenedor.** Ni se te ocurra.
2. **Quédate con Neon** hasta que el proyecto crezca. Después, Postgres en otro contenedor del mismo servidor.
3. **Hetzner CX22 (€4/mes)** te alcanza para todo este proyecto.
4. **Para actualizar**: SSH + `git pull` + `docker compose build <servicio>` + `docker compose up -d <servicio>`. Punto.
5. **Empieza manual**, automatiza con GitHub Actions cuando ya entiendas el flujo.
6. **Backups o no hay proyecto**. Si Neon lo hace por ti, perfecto. Si no, configúralos antes de migrar.
7. **Cambios pequeños, deploys frecuentes, rollback siempre listo**.
