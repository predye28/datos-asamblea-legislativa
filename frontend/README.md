# Frontend — La Asamblea al Día

Interfaz ciudadana de la plataforma de transparencia legislativa de Costa Rica. Construida con **Next.js 16** y **React 19**, con soporte para español e inglés.

---

## Stack

| Pieza | Tecnología |
|---|---|
| Framework | Next.js 16.2 (App Router) |
| UI | React 19.2 + TypeScript |
| Estilos | CSS Modules + variables CSS (sin Tailwind) |
| Gráficas | Recharts 3 |
| i18n | Solución propia con contexto y diccionarios |
| Build | Next.js standalone (optimizado para Docker) |

---

## Estructura

```
frontend/
├── src/
│   ├── app/                          # Páginas (Next.js App Router)
│   │   ├── page.tsx                  # Home
│   │   ├── proyectos/page.tsx        # Listado de proyectos
│   │   ├── proyecto/[expediente]/    # Detalle de un proyecto
│   │   ├── diputados/page.tsx        # Listado de diputados
│   │   ├── diputados/[apellidos]/    # Perfil de un diputado
│   │   ├── partidos/page.tsx         # Listado de partidos
│   │   ├── partidos/[codigo]/        # Perfil de un partido
│   │   ├── estadisticas/page.tsx     # Panel de estadísticas
│   │   ├── acerca/page.tsx           # Información del proyecto
│   │   └── layout.tsx                # Layout raíz (navbar, footer, i18n)
│   │
│   ├── components/
│   │   ├── layout/                   # Navbar, Footer, ScrollToTop
│   │   ├── sections/                 # Hero, AboutSection, FeatureBlocks, CreatorSection
│   │   ├── charts/                   # MonthlyBarsChart, PartidosPieChart, Sparkline, TimelineAreaChart
│   │   ├── ui/                       # Button, Avatar, Chip, EmptyState, Skeleton, FilterPill
│   │   └── shared/                   # CountUp (con soporte para prefers-reduced-motion)
│   │
│   ├── i18n/
│   │   ├── LanguageProvider.tsx      # Contexto y hook useT()
│   │   └── dictionaries/
│   │       ├── es.ts                 # Fuente de verdad — todos los textos en español
│   │       └── en.ts                 # Traducción al inglés (mismo shape que es.ts)
│   │
│   └── lib/
│       ├── api.ts                    # Cliente de la REST API
│       ├── partidos.ts               # Paleta de colores por partido político
│       ├── estados.ts                # Estados posibles de un proyecto de ley
│       ├── periodos.ts               # Períodos legislativos
│       ├── diputados.ts              # Helpers para perfiles de diputados
│       └── utils.ts                  # Utilidades compartidas
│
├── public/                           # Assets estáticos (fotos de diputados, íconos)
├── Dockerfile                        # Multi-stage: builder (Node 20) + runner
├── next.config.ts
├── tsconfig.json
└── package.json
```

---

## Correr localmente

```bash
npm install

# Apuntar a la API local (asegúrate de tener la API corriendo en :8000)
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" > .env.local

npm run dev
# → http://localhost:3000
```

O con la API en Docker:
```bash
echo "NEXT_PUBLIC_API_URL=http://localhost/api/v1" > .env.local
npm run dev
```

---

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL de la API — se hornea en el bundle al compilar | `http://localhost:8000/api/v1` |
| `INTERNAL_API_URL` | URL interna para SSR dentro de Docker (no cambiar) | `http://nginx/api/v1` |

> `NEXT_PUBLIC_API_URL` queda embebida en el JavaScript que se envía al browser. Cambiarla en producción requiere reconstruir el container (`docker compose build frontend`).

---

## Decisiones de diseño

### CSS Modules, no Tailwind

Cada componente tiene su propio archivo `*.module.css`. Los colores y tamaños globales están como variables CSS en el layout raíz. Esto evita dependencias extra y mantiene el CSS predecible.

### i18n propio

El sistema de traducciones usa un `LanguageProvider` con `localStorage` para persistir el idioma. El hook `useT()` devuelve el diccionario activo. Todas las cadenas de texto de la UI viven en `i18n/dictionaries/es.ts` (fuente de verdad en español) con su contraparte en `en.ts`.

**Si añades texto nuevo:**
1. Agrégalo en `es.ts` primero
2. Agrega la traducción equivalente en `en.ts`
3. TypeScript verifica que ambos archivos tengan el mismo shape

### Build standalone

El Dockerfile usa `output: 'standalone'` de Next.js para producir una imagen Docker compacta (~200 MB en vez de ~1 GB). Solo incluye los archivos necesarios para correr la app.

---

## Agregar una nueva página

1. Crear carpeta en `src/app/nueva-ruta/`
2. Agregar `page.tsx` con el componente de página
3. Si tiene estado de carga, agregar `loading.tsx`
4. Agregar el texto de la UI en `i18n/dictionaries/es.ts` y `en.ts`
5. Si aplica, agregar el link al navbar en `components/layout/Navbar.tsx`

---

## Build de producción

```bash
npm run build
npm start
```

O con Docker (desde la raíz del repo):
```bash
docker compose build frontend
docker compose up -d frontend
```

---

## Deploy

El frontend corre como un servicio de Docker Compose. Ver [`DESPLIEGUE.md`](../DESPLIEGUE.md) para el tutorial completo de producción.
