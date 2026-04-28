# Correcciones aplicadas a los datos

Este archivo documenta **toda corrección manual** aplicada a los datos
extraídos del SIL de la Asamblea Legislativa de Costa Rica.

## Política de transparencia

Los datos en esta base provienen del [SIL de la Asamblea Legislativa](https://www.asamblea.go.cr/Centro_de_informacion/Consultas_SIL/SitePages/SIL.aspx)
y se almacenan **tal cual los entrega el origen**, sin modificaciones, para
preservar la trazabilidad.

Cuando se detectan errores evidentes en el origen (typos, valores
imposibles), se aplica una corrección documentada aquí. Cada corrección
incluye: expediente afectado, valor original, valor corregido y razón.

Las correcciones se aplican vía scripts de migración versionados en
`api/migrate_*.py`, no a mano sobre la BD.

---

## Historial de correcciones

### 2026-04-27 — Fechas con año 2079

**Script:** [`api/migrate_fix_fechas_2079.py`](api/migrate_fix_fechas_2079.py)

Dos expedientes tenían `fecha_inicio` con año 2079 en el SIL, lo cual es
imposible. La causa más probable es un error de digitación en la página
origen donde "79" fue interpretado como 2079 en lugar de 1979.

| Expediente | Campo | Valor original (SIL) | Valor corregido | Razón |
|---|---|---|---|---|
| 7306 | `fecha_inicio` | `2079-09-01` | `1979-09-01` | Número de expediente bajo y tema (Impuesto sobre la Renta) consistentes con 1979. El título tiene además un typo evidente ("I MNPUESTOS"). |
| 7468 | `fecha_inicio` | `2079-01-26` | `1979-01-26` | Número de expediente bajo y tema (horarios laborales en área metropolitana de San José) consistentes con 1979. |

**Detección:** script de diagnóstico
[`extractor_proyectos/analisis_datos.py`](extractor_proyectos/analisis_datos.py),
sección §9.1 (Fechas futuras).
