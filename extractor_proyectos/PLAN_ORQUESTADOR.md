# Plan: Orquestador Secuencial de 3 Fases — Scraper

> Estado: **Pendiente de implementación** (Fase 1 ya modificada ✅)

---

## Objetivo

Implementar un orquestador en el contenedor scraper donde **solo una fase corre a la vez**.
El árbol de decisión evalúa hora y día para despachar la fase correcta.

---

## Árbol de decisión

```
Cada vez que el orquestador termina una fase (o al arrancar):

  ¿Hora CR entre 1am y 2am?
  └── SÍ → ¿Es sábado?
            ├── SÍ  → EJECUTAR FASE 2
            └── NO  → EJECUTAR FASE 1
  └── NO → EJECUTAR FASE 3
```

| Condición | Fase |
|---|---|
| `1am ≤ hora < 2am` **Y** `hoy == sábado` | **Fase 2** — backfill profundo |
| `1am ≤ hora < 2am` **Y** `hoy ≠ sábado` | **Fase 1** — scan diario (págs 1-25) |
| Cualquier otro momento del día | **Fase 3** — monitor continuo |

---

## Fase 1 — Scan diario ✅ (ya implementado)

- **Cuándo:** 1am CR, lunes a domingo excepto sábado
- **Páginas:** 1 → 25 (250 expedientes más recientes)
- **Workers:** 1
- **Archivo:** `fase1_scraper.py`
- **Cambio aplicado:** `PAGINAS_A_EXTRAER = 25` (antes era 10) + `run_fase1()` exportado

---

## Fase 2 — Backfill semanal ⏳ (pendiente)

- **Cuándo:** Sábados a la 1am CR
- **Páginas:** Desde página **26** (o checkpoint) hacia adelante
- **Workers:** 2 en paralelo (`asyncio.gather`)
- **Lote:** 10 páginas por lote (5 páginas por worker)
- **Descanso:** 10 segundos entre lotes (`asyncio.sleep(10)`)
- **Condición de parada:** Cuando la `fecha_inicio` del primer expediente de cualquier página sea `<= hoy − 4 años` (expediente cuatrienalmente vencido)
  - Al detectarlo, ese worker activa un `asyncio.Event`
  - El otro worker lo consulta y también se detiene
  - Ambos terminan antes de continuar al siguiente lote
- **Checkpoint:** `scraper_estado` con `fase='fase2'`, arranca desde donde quedó
- **Archivo a crear:** `fase2_backfill.py`

### Flujo de un lote:
```
Leer checkpoint (ej: pág 300)
┌──────────────────────────────────────────┐
│ Worker A: págs 300-304 (5 páginas)      │
│ Worker B: págs 305-309 (5 páginas)      │  ← asyncio.gather()
└──────────────────────────────────────────┘
Si algún worker detecta fecha_inicio <= hoy-4años:
  → activa asyncio.Event (fin_evento)
  → el otro worker lo consulta y para también
  → se guarda checkpoint y se termina la Fase 2
Si no:
  → guardar checkpoint en 310
  → asyncio.sleep(10)
  → siguiente lote
```

---

## Fase 3 — Monitor continuo ⏳ (pendiente)

- **Cuándo:** Todo el tiempo excepto ventana 1am-2am (donde entra F1 o F2)
- **Páginas:** Desde **pág 25** hasta el final del dataset
- **Workers:** 2 en paralelo (igual que `fase2_paralelo.py` actual)
- **Al llegar al wrap:** Reinicia desde pág 25 automáticamente
- **Propósito:** Detectar expedientes viejos que hayan sido actualizados (nueva tramitación, cambio de estado)
- **Checkpoint:** `scraper_estado` con `fase='fase3'` (separado del de Fase 2)
- **Archivo a crear:** `fase3_monitor.py`
- **Base:** Prácticamente copia de `fase2_paralelo.py` con:
  - `PAGINA_INICIO = 25`
  - Checkpoint `fase='fase3'`
  - Sin lógica de Fase 1 integrada (la maneja el orquestador)

---

## Orquestador ⏳ (pendiente)

- **Archivo a crear:** `orquestador.py`
- **Reemplaza el CMD del contenedor** (actualmente `fase2_paralelo.py`)
- Pausa de 30s entre fases para re-evaluar condiciones

```python
CR_TZ = timezone(timedelta(hours=-6))

async def main():
    while True:
        ahora      = datetime.now(CR_TZ)
        en_ventana = (ahora.hour == 1)
        es_sabado  = (ahora.weekday() == 5)

        if en_ventana and es_sabado:
            await run_fase2_backfill()
        elif en_ventana and not es_sabado:
            await run_fase1()
        else:
            await run_fase3_ciclo()

        await asyncio.sleep(30)  # re-evaluar
```

---

## Cambios en sync_engine.py ✅ (ya aplicado)

Las funciones de checkpoint son ahora genéricas:

```python
# Antes (hardcoded fase2):
leer_checkpoint_db() -> int
guardar_checkpoint_db(pagina: int)

# Después (genérico):
leer_checkpoint_db(fase: str = 'fase2') -> int
guardar_checkpoint_db(pagina: int, fase: str = 'fase2')
```

Constantes añadidas:
```python
PAGINA_INICIO_FASE2 = 26  # Fase 1 cubre págs 1-25
PAGINA_INICIO_FASE3 = 25  # Monitor continuo desde pág 25
```

---

## Archivos a crear (pendiente)

| Archivo | Descripción |
|---|---|
| `orquestador.py` | CMD del contenedor. Árbol de decisión hora/día → despacha fase |
| `fase2_backfill.py` | Backfill semanal: 2 workers, 10 págs/lote, 10s descanso, para en 4 años |
| `fase3_monitor.py` | Monitor continuo: 2 workers desde pág 25, reinicia al wrap |

## Archivos a modificar (pendiente)

| Archivo | Cambio |
|---|---|
| `Dockerfile` | `CMD ["python", "orquestador.py"]` |
| `docker-compose.yml` | `command: python orquestador.py` |

---

## Lo que ya está implementado ✅

| Cambio | Archivo |
|---|---|
| `PAGINAS_A_EXTRAER = 25` | `fase1_scraper.py` |
| `run_fase1()` exportado | `fase1_scraper.py` |
| `leer_checkpoint_db(fase)` genérico | `sync_engine.py` |
| `guardar_checkpoint_db(pagina, fase)` genérico | `sync_engine.py` |
| Constantes `PAGINA_INICIO_FASE2=26`, `PAGINA_INICIO_FASE3=25` | `sync_engine.py` |
