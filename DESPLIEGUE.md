# Guía de despliegue en producción

Tutorial completo para desplegar este proyecto desde cero, sin experiencia previa. Escrito para quien nunca ha desplegado nada.

**Stack de producción:** Hostinger VPS + Cloudflare + Docker Compose + Neon PostgreSQL

---

## Lo que vas a tener al final

```
Tú (browser) → tudominio.com → Cloudflare (HTTPS gratis) → Servidor Hostinger
                                                                     │
                                                          ┌──────────▼──────────┐
                                                          │  Docker Compose      │
                                                          │  ├── nginx           │
                                                          │  ├── frontend        │
                                                          │  ├── api             │
                                                          │  └── scraper         │
                                                          └──────────┬──────────┘
                                                                     │
                                                             Neon PostgreSQL
                                                             (cloud gestionado)
```

---

## PASO 0 — Antes de empezar (en tu computadora)

### 0.1 — Asegúrate de tener el repo en GitHub

El servidor va a clonar el código desde GitHub.

```bash
git push origin main
```

### 0.2 — Genera una SSH key

Una SSH key es como una llave digital: la privada se queda en tu compu, la pública la das al servidor. Así te conectas sin contraseña.

**¿Ya tienes una? Verifica:**
```bash
# Windows (PowerShell)
ls ~/.ssh
```
Si ves `id_ed25519` y `id_ed25519.pub`, ya tienes. Si no:

**Crear una nueva:**
```bash
ssh-keygen -t ed25519 -C "tu-email@gmail.com"
# Presiona Enter tres veces
```

**Ver tu clave pública** (la necesitas en el Paso 1):
```bash
cat ~/.ssh/id_ed25519.pub
# Copia todo ese texto: ssh-ed25519 AAAA... tu@email.com
```

---

## PASO 1 — Comprar el servidor en Hostinger

### ¿Qué plan comprar?

Ve a **hostinger.com → VPS Hosting → KVM 2** (2 vCPU, 8 GB RAM, 100 GB NVMe).

El scraper con Playwright + Chromium consume ~1.2 GB de RAM con 2 workers. Sumando API, frontend, nginx y el SO, el total es ~3 GB. Con KVM 2 (8 GB) tienes margen cómodo para crecer.

### Configuración durante la compra

| Campo | Valor |
|---|---|
| Sistema operativo | Ubuntu 24.04 LTS |
| Región | US East (más cercano a Costa Rica) |
| SSH key | Pega la clave pública del Paso 0.2 |

Hostinger te dará una **IP pública** al crear el servidor (ej: `195.123.45.67`). **Anótala.**

### Conectarte por primera vez

```bash
# Desde tu computadora
ssh root@195.123.45.67
```

Si pregunta `Are you sure you want to continue connecting?` → escribe `yes`.

Si ves `root@ubuntu:~#` → estás adentro.

---

## PASO 2 — Configurar el servidor (solo una vez)

Todo lo siguiente lo corres **dentro del servidor** (después del SSH).

### 2.1 — Actualizar el sistema

```bash
apt update && apt upgrade -y
```

### 2.2 — Instalar Docker

```bash
curl -fsSL https://get.docker.com | sh
docker --version   # Debe mostrar Docker version 27.x.x
```

### 2.3 — Instalar Git

```bash
apt install -y git
```

### 2.4 — Crear usuario deploy (nunca trabajes como root en producción)

```bash
adduser deploy
# Ponle una contraseña y anótala. El resto de preguntas → Enter.

usermod -aG docker,sudo deploy
```

### 2.5 — Configurar el firewall

```bash
ufw allow OpenSSH   # Puerto 22 — para seguir conectándote
ufw allow 80        # Puerto 80 — HTTP
ufw allow 443       # Puerto 443 — HTTPS (por si acaso)
ufw enable          # Activar (confirma con 'y')
```

### 2.6 — Cambiar al usuario deploy

```bash
su - deploy
# Ahora ves: deploy@ubuntu:~$
```

A partir de aquí, trabaja siempre como `deploy`.

---

## PASO 3 — Subir el código

### Si el repositorio es PÚBLICO

```bash
cd ~
git clone https://github.com/TU_USUARIO/datos-asamblea-legislativa.git
cd datos-asamblea-legislativa
```

### Si el repositorio es PRIVADO

Genera una SSH key en el servidor y dásela a GitHub:

```bash
ssh-keygen -t ed25519 -C "servidor-hostinger"
# Enter tres veces
cat ~/.ssh/id_ed25519.pub
# Copia la clave
```

Ve a **GitHub → Settings → SSH and GPG keys → New SSH key** → pégala.

```bash
git clone git@github.com:TU_USUARIO/datos-asamblea-legislativa.git
cd datos-asamblea-legislativa
```

---

## PASO 4 — Configurar las variables de entorno

```bash
cp .env.example .env
nano .env
```

En nano: flechas para moverte, `Ctrl+O` → Enter para guardar, `Ctrl+X` para salir.

```env
# URL de conexión de Neon → neon.tech → tu proyecto → Connection Details
DATABASE_URL=postgresql://usuario:pass@ep-algo.us-east-2.aws.neon.tech/dbname?sslmode=require

# Tu dominio real
CORS_ORIGINS=https://tudominio.com

# La URL que el frontend usa para llamar a la API
NEXT_PUBLIC_API_URL=https://tudominio.com/api/v1

# Obligatorio para Chromium en Docker
CI=true

# Páginas por ronda del scraper (20 es un buen valor para producción)
MAX_PAGINAS=20
```

> **Importante:** `NEXT_PUBLIC_API_URL` se "hornea" dentro del bundle de Next.js al construir. Si lo cambias después, debes reconstruir el frontend (`docker compose build frontend`).

Protege el archivo:
```bash
chmod 600 .env
```

---

## PASO 5 — Construir y levantar con Docker

```bash
docker compose up -d --build
```

**La primera vez tarda 15-20 minutos** — descarga imágenes base, instala dependencias y Chromium, compila Next.js. Es normal ver mucho texto.

### Verificar que todo está corriendo

```bash
docker compose ps
```

Debes ver los 4 servicios en estado `Up`:
```
NAME                STATUS    PORTS
...-nginx-1         Up        0.0.0.0:80->80/tcp
...-api-1           Up        8000/tcp
...-frontend-1      Up        3000/tcp
...-scraper-1       Up
```

Si alguno dice `Exited`, mira sus logs:
```bash
docker compose logs api
docker compose logs frontend
docker compose logs scraper
```

### Prueba rápida

Abre `http://TU_IP_DEL_SERVIDOR` en el browser. Si ves el sitio → perfecto.

---

## PASO 6 — Configurar el dominio en Cloudflare

Como compraste el dominio en Cloudflare, los nameservers ya apuntan a Cloudflare. Solo necesitas agregar registros DNS.

### 6.1 — Agregar registros A

Ve a **Cloudflare dashboard → tu dominio → DNS → Records → Add record**.

**Registro 1 (dominio raíz):**
```
Tipo:   A
Nombre: @
Valor:  195.123.45.67   ← IP real de tu servidor
Proxy:  Activado (nube naranja)
TTL:    Auto
```

**Registro 2 (www):**
```
Tipo:   A
Nombre: www
Valor:  195.123.45.67
Proxy:  Activado (nube naranja)
TTL:    Auto
```

### 6.2 — ¿Qué hace la "nube naranja"?

Con proxy **activado**:
- Cloudflare pone su IP en el DNS (tu IP real queda oculta) → protección DDoS gratis
- Cloudflare maneja HTTPS automáticamente → tu sitio funciona con `https://` sin configurar nada en el servidor
- Cache de assets estáticos gratis

Con proxy **desactivado**: el DNS apunta directo a tu IP, sin HTTPS ni protección.

**Usa nube naranja.**

### 6.3 — Configurar modo SSL

Ve a **SSL/TLS → Overview** y pon el modo en **"Flexible"**.

Flexible significa: el usuario se conecta a Cloudflare por HTTPS, y Cloudflare se conecta a tu servidor por HTTP. Como tu nginx solo escucha en el puerto 80, esto funciona perfectamente.

### 6.4 — Esperar propagación

Con Cloudflare tarda 1-5 minutos. Prueba `https://tudominio.com` en el browser.

---

## PASO 7 — Script de actualización

Para futuras actualizaciones, crea este script en el servidor:

```bash
nano ~/datos-asamblea-legislativa/deploy.sh
```

```bash
#!/bin/bash
set -e

echo "=== Trayendo cambios de GitHub ==="
git pull

echo "=== Reconstruyendo contenedores ==="
docker compose build

echo "=== Reiniciando servicios ==="
docker compose up -d

echo "=== Estado actual ==="
docker compose ps

echo "=== Deploy completado ==="
```

```bash
chmod +x ~/datos-asamblea-legislativa/deploy.sh
```

**Cómo usarlo desde tu computadora:**
```bash
ssh deploy@195.123.45.67 'cd datos-asamblea-legislativa && ./deploy.sh'
```

---

## PASO 8 — Rutina de trabajo normal

**Cuando hagas cambios en el código:**

```bash
# 1. En tu compu local: trabajar, testear, commitear
git add .
git commit -m "feat: descripción del cambio"
git push origin main

# 2. Deployar al servidor (un solo comando)
ssh deploy@195.123.45.67 'cd datos-asamblea-legislativa && ./deploy.sh'
```

### Actualizaciones rápidas (solo reconstruye lo que cambió)

| Qué cambiaste | Comando en el servidor |
|---|---|
| Código Python del API | `docker compose build api && docker compose up -d api` |
| Código TypeScript del frontend | `docker compose build frontend && docker compose up -d frontend` |
| Código del scraper | `docker compose build scraper && docker compose up -d scraper` |
| `nginx/nginx.conf` | `docker compose restart nginx` |
| Variables en `.env` (sin tocar código) | `docker compose up -d` |
| `NEXT_PUBLIC_API_URL` en `.env` | `docker compose build frontend && docker compose up -d frontend` |

---

## Comandos útiles del día a día

```bash
# Ver estado de los servicios
docker compose ps

# Ver logs en tiempo real
docker compose logs -f api
docker compose logs -f --tail=100

# Ver uso de RAM y CPU
docker stats

# Reiniciar un servicio
docker compose restart api

# Apagar todo
docker compose down

# Levantar todo
docker compose up -d
```

---

## Neon Free Tier — qué esperar

| Límite | Valor |
|---|---|
| Almacenamiento | 500 MB |
| Compute hours/mes | 191 horas |
| Auto-suspend | La BD se "duerme" tras 5 min sin queries |

**El scraper corre 24/7**, así que la BD nunca duerme mientras esté activo. Eso consume las 191 horas en ~9 días. Cuando Neon te avise que agotaste el plan, evalúa si el proyecto justifica el upgrade ($19/mes para compute ilimitado).

**Señal de alerta:** Si la API responde con errores de conexión a la BD, revisa el dashboard de Neon.

---

## Capacidad estimada del servidor

| Escenario | Usuarios concurrentes |
|---|---|
| Sin caché | 20 - 60 |
| Con caché de Cloudflare | 200 - 1,000+ |

El cuello de botella real es la latencia con Neon (~50-100ms por query), no el CPU ni la RAM.

### Activar caché de Cloudflare para la API

Ve a **Cloudflare → Rules → Page Rules → Create Page Rule**:

```
URL: tudominio.com/api/v1/metricas/*
Cache Level: Cache Everything | Edge TTL: 1 hour
```

```
URL: tudominio.com/api/v1/partidos/*
Cache Level: Cache Everything | Edge TTL: 24 hours
```

---

## Resumen de costos

| Componente | Costo |
|---|---|
| Hostinger KVM 2 | promo primer mes → ~$15-20/mes después |
| Cloudflare (proxy, DNS, CDN) | $0 |
| Dominio (Cloudflare) | ~$10/año |
| Neon Free Tier | $0 (hasta 191 h/mes de compute) |

---

## Checklist de verificación

- [ ] SSH al servidor funciona con usuario `deploy`
- [ ] `docker compose ps` muestra los 4 servicios en `Up`
- [ ] `http://IP-DEL-SERVIDOR` muestra el sitio
- [ ] Registros DNS en Cloudflare creados (nube naranja)
- [ ] `https://tudominio.com` carga con candado verde
- [ ] `https://tudominio.com/api/v1/metricas/` devuelve JSON
- [ ] `https://tudominio.com/docs` muestra la documentación de la API
- [ ] `deploy.sh` funciona con un cambio de prueba
