"""
main.py — API principal del portal ciudadano de la Asamblea Legislativa CR
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import proyectos, metricas, categorias

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(proyectos.router,  prefix="/api/v1", tags=["Proyectos"])
app.include_router(metricas.router,   prefix="/api/v1", tags=["Métricas"])
app.include_router(categorias.router, prefix="/api/v1", tags=["Categorías"])


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
