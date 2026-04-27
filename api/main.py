"""
main.py — API principal del portal ciudadano de la Asamblea Legislativa CR
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import proyectos, metricas, categorias, periodos

app = FastAPI(
    title="Asamblea Legislativa CR — API Ciudadana",
    description=(
        "API pública que expone los proyectos de ley de Costa Rica "
        "de forma accesible y comprensible para cualquier ciudadano."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ── en producción setear CORS_ORIGINS=https://midominio.com
_raw_origins = os.getenv("CORS_ORIGINS", "*")
_origins = [o.strip() for o in _raw_origins.split(",")] if _raw_origins != "*" else ["*"]

# Si se permite cualquier origen, no se pueden enviar credenciales (los
# navegadores rechazan la combinación). En prod, fija un dominio específico
# para habilitar credentials de manera segura.
_allow_credentials = "*" not in _origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=_allow_credentials,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(proyectos.router,  prefix="/api/v1", tags=["Proyectos"])
app.include_router(metricas.router,   prefix="/api/v1", tags=["Métricas"])
app.include_router(categorias.router, prefix="/api/v1", tags=["Categorías"])
app.include_router(periodos.router,   prefix="/api/v1", tags=["Períodos"])


@app.get("/", tags=["Health"])
def root():
    return {
        "servicio": "API Ciudadana — Asamblea Legislativa CR",
        "version": "1.0.0",
        "estado": "activo",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
