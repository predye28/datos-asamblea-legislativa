# Contexto del Proyecto: Datos Asamblea Legislativa

Este documento proporciona el contexto principal y las reglas del proyecto para que cualquier asistente de IA (como Claude Code) comprenda el entorno, la arquitectura y las reglas de estilo.

## 1. Descripción General
"La Asamblea al Día" (datos-asamblea-legislativa) es un portal ciudadano, apartidista y sin fines de lucro, que extrae, organiza y presenta de manera visual y accesible la información pública del Sistema de Información Legislativa (SIL) de Costa Rica.

## 2. Arquitectura del Proyecto
El repositorio es un monorepo que contiene tanto el backend (API + Scrapers) como el frontend (Web App).

- **Backend (`/api` y `/scrapers`)**:
  - **Lenguaje**: Python
  - **Framework**: FastAPI (ejecutado con `uvicorn main:app --reload`)
  - **Extracción de Datos**: Scrapers paralelos (ej. `fase2_paralelo.py`) que leen del SIL oficial.
  - **Datos**: Se maneja procesamiento de texto, limpieza de strings (encoding) y se generan resúmenes.

- **Frontend (`/frontend`)**:
  - **Framework**: Next.js (App Router) con TypeScript y React.
  - **Estilos**: CSS Modules (`.module.css`) exclusivamente. **NO SE USA TAILWINDCSS**.
  - **Ejecución**: `npm run dev`

## 3. Reglas de Diseño y UI (Frontend)
- **CSS Vanilla Puro**: Toda la estilización se hace mediante CSS Modules. No utilices utilidades de Tailwind ni frameworks externos.
- **Variables Globales**: Utilizar siempre las variables CSS definidas en `globals.css` (ej. `var(--container-max)` para anchos máximos de 1240px, `var(--container-pad)` para padding responsivo, `var(--ink)`, `var(--paper-card)`, etc.).
- **Paleta de Colores (Teal/Cyan)**: El portal migró de un tema dorado a un tema oscuro moderno con acentos cyan/teal (`var(--accent)`). Evitar el uso de `var(--gold)` a menos que sea estrictamente necesario para pequeños detalles secundarios.
- **Diseño Premium y Limpio**: La UI debe sentirse profesional, institucional, limpia (estilo Ruby-lang u OS modernos), con buen uso de sombras (box-shadows), bordes sutiles y transiciones suaves.
- **Responsividad**: Usar Media Queries en los `.module.css` (típicamente a `1024px`, `860px` y `640px`) para adaptar grids a una sola columna en móviles.

## 4. Reglas de Desarrollo
- **Consistencia Visual**: Antes de agregar componentes nuevos, revisar cómo están estructurados los demás (ej. `<section>` con `.sectionHeader` y `.sectionContent`).
- **Nombres de Archivos**: Componentes en PascalCase (`CreatorSection.tsx`), archivos CSS Modules correspondientes (`CreatorSection.module.css`).
- **Accesibilidad**: Incluir `aria-hidden` en elementos decorativos, y usar etiquetas semánticas (`<section>`, `<h1>`, `<p>`).
- **No inventar datos**: Toda la data mostrada en los mockups o en la UI debe ser neutral y reflejar la estructura del SIL de Costa Rica.
