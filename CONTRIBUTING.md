# Guía de Contribución

Gracias por tu interés en contribuir. Este documento explica cómo está organizado el flujo de trabajo para mantener el proyecto estable y fácil de colaborar.

---

## Flujo de ramas

El proyecto usa tres niveles de ramas:

```
main          ← producción — siempre estable, siempre desplegable
 └── dev      ← integración — aquí se acumula el trabajo antes de subir a main
      └── feature/nombre-de-la-tarea   ← tu trabajo nuevo
```

### Regla principal

**Nunca trabajes directamente en `main` ni en `dev`.** Siempre crea una rama desde `dev`, trabaja ahí, y abre un Pull Request hacia `dev`.

`main` solo recibe merges desde `dev` cuando el código está probado y listo para producción.

---

## Paso a paso para contribuir

### 1. Configurar el entorno local

```bash
git clone https://github.com/tu-usuario/datos-asamblea-legislativa.git
cd datos-asamblea-legislativa
git checkout dev
```

### 2. Crear tu rama de trabajo

Siempre parte desde `dev` actualizado:

```bash
git checkout dev
git pull origin dev
git checkout -b feature/descripcion-corta
```

Ejemplos de nombres de rama:
- `feature/fotos-diputados`
- `fix/margen-perfil-diputado`
- `chore/actualizar-dependencias`
- `docs/guia-despliegue`

### 3. Hacer tus cambios

Trabaja con commits pequeños y descriptivos. Sigue la convención de mensajes de commit:

```
tipo: descripción corta en presente

Ejemplos:
feat: agregar foto de perfil a la tarjeta del diputado
fix: corregir discrepancia en conteo de proyectos
style: ajustar márgenes en vista móvil
refactor: separar lógica de filtros en hook propio
docs: documentar endpoints de la API
chore: actualizar Next.js a la versión 16.3
```

### 4. Abrir un Pull Request

Cuando tu rama esté lista:

```bash
git push origin feature/descripcion-corta
```

Luego abre un Pull Request en GitHub:
- **Base:** `dev` (no `main`)
- **Compare:** tu rama `feature/...`
- Describe brevemente qué cambia y por qué

### 5. Merge a `main` (solo cuando está listo para producción)

Una vez que `dev` tiene cambios probados y estables:

```bash
git checkout main
git pull origin main
git merge dev
git push origin main
```

---

## Configuración del entorno de desarrollo

Ver el [README](README.md) para las instrucciones completas. Resumen rápido:

```bash
# API (Python)
cd api && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000

# Frontend (Node)
cd frontend && npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" > .env.local
npm run dev
```

---

## Estándares de código

### General
- Código limpio y legible por encima de código "inteligente"
- Nombres de variables descriptivos
- Comentarios solo cuando el **por qué** no es obvio

### Frontend (TypeScript / Next.js)
- CSS Modules para estilos — no clases globales
- Componentes separados para responsabilidades distintas
- Siempre pensar en responsive (mobile-first)
- No agregar librerías sin necesidad real

### Backend (Python / FastAPI)
- SQL directo con psycopg2 — sin ORM
- Schemas de respuesta en `models.py`
- Lógica de consulta en `database.py`

---

## Reporte de bugs

Abre un [Issue en GitHub](../../issues) con:
1. Descripción del problema
2. Pasos para reproducirlo
3. Comportamiento esperado vs. actual
4. Capturas de pantalla si aplica

---

## ¿Tienes una idea?

Abre un Issue con la etiqueta `enhancement` y describe:
- El problema que resuelve
- Una propuesta de cómo implementarlo (opcional)
