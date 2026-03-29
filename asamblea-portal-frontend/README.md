# Portal Ciudadano — Asamblea Legislativa CR

Frontend del portal de transparencia legislativa de Costa Rica.
Construido con Next.js 14, conectado a la API FastAPI.

---

## Estructura

```
src/
├── app/
│   ├── page.tsx                      ← Página de inicio
│   ├── proyectos/page.tsx            ← Listado con filtros
│   ├── proyecto/[expediente]/page.tsx ← Detalle de proyecto
│   ├── diputados/page.tsx            ← Ranking de diputados
│   ├── estadisticas/page.tsx         ← Dashboard de métricas
│   └── acerca/page.tsx               ← Acerca del proyecto
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   ├── sections/                     ← Componentes de secciones del home
│   └── ui/                           ← Componentes reutilizables
└── lib/
    └── api.ts                        ← Cliente de la API + tipos TypeScript
```

---

## Instalación y desarrollo

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar la URL de la API
cp .env.local.example .env.local
# Editá .env.local con tu URL de API

# 3. Correr en modo desarrollo
npm run dev
# → http://localhost:3000
```

La API debe estar corriendo en `http://localhost:8000` antes de arrancar el frontend.
Para correr la API: ver `../api/README.md`

---

## Variables de entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | URL base de la API | `http://localhost:8000/api/v1` |

---

## Deploy en Vercel

1. Push el repositorio a GitHub
2. Conectar en [vercel.com](https://vercel.com)
3. Agregar variable de entorno `NEXT_PUBLIC_API_URL` apuntando a tu API en Railway
4. Deploy automático en cada push a `main`

---

## Páginas

| Ruta | Descripción |
|------|-------------|
| `/` | Inicio con métricas, ranking y buscador |
| `/proyectos` | Listado con filtros por tipo, año, solo leyes, búsqueda |
| `/proyecto/[expediente]` | Detalle completo con línea de tiempo de tramitación |
| `/diputados` | Ranking de diputados por actividad |
| `/estadisticas` | Dashboard con gráficas de datos agregados |
| `/acerca` | Descripción del proyecto, arquitectura, propósito |
