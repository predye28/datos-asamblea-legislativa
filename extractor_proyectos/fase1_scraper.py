"""
fase1_scraper.py
──────────────────────────────────────────────────────────────────────
Fase 1 — Sincronización diaria completa.

Recorre el SIL desde la página 1 hasta encontrar un expediente cuyo
vencimiento cuatrienal ya expiró: a partir de ese punto, ningún cambio
legislativo puede ocurrir, por lo que el resto de la lista es estable.

Corre en paralelo con N_WORKERS instancias de Chromium para reducir
el tiempo total. Se programa a medianoche hora Costa Rica (06:00 UTC)
mediante GitHub Actions.

Flujo por worker:
  1. Lanzar browser propio → navegar al portal → encontrar grilla
  2. Tomar un número de página de la cola compartida
  3. Saltar a esa página con el input de paginación
  4. Extraer General, Tramitación, Proponentes de cada fila
  5. Si algún expediente tiene vencimiento cuatrienal expirado → señalar
     parada global y terminar
  6. Repetir hasta que la cola se vacíe o la señal de parada esté activa
"""

import asyncio
import os
import re
import sys
from datetime import date, datetime
from playwright.async_api import async_playwright, Page

from sync_engine import crear_tablas, sync_proyectos, parsear_fecha

# ──────────────────────────────────────────────────────────────────────
# CONFIGURACIÓN
# ──────────────────────────────────────────────────────────────────────

URL_BASE = (
    "https://www.asamblea.go.cr/Centro_de_informacion/"
    "Consultas_SIL/SitePages/SIL.aspx"
)

TEXTO_BOTON_ENTRADA = "Expedientes Legislativos - Consulta"
REGISTROS_POR_PAG   = "10"
N_WORKERS           = 4     # Browsers en paralelo
MAX_PAGINAS         = 300   # Límite de seguridad (3 000 expedientes máx.)

# Tiempos de espera (ms) — ajustados para ser conservadores
ESPERA_CARGA_GRILLA = 5_000
ESPERA_CLIC_FILA    = 2_500
ESPERA_CLIC_TAB     = 1_500
ESPERA_CLIC_PAGINA  = 4_000

IS_CI = os.getenv("CI", "false").lower() == "true"


# ──────────────────────────────────────────────────────────────────────
# UTILIDADES
# ──────────────────────────────────────────────────────────────────────

def limpiar(v):
    """Elimina caracteres de control de una cadena."""
    if not isinstance(v, str):
        return v
    v = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', v)
    v = re.sub(r'[␀-␿]', '-', v)
    return v.strip()


def log(msg: str):
    """Print con timestamp."""
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {msg}", flush=True)


def cuatrienal_vencido(general: dict) -> bool:
    """
    Retorna True si el vencimiento cuatrienal del expediente ya pasó.
    Cuando esto ocurre, el expediente no puede recibir más cambios
    legislativos, así que podemos dejar de raspar.
    """
    raw = (
        general.get("Fecha de vencimiento cuatrienal")
        or general.get("Vencimiento Cuatrienal")
        or ""
    )
    venc = parsear_fecha(raw)
    if venc is None:
        return False
    return venc < date.today()


# ──────────────────────────────────────────────────────────────────────
# NAVEGACIÓN INICIAL
# ──────────────────────────────────────────────────────────────────────

async def esperar_frame_webpart(page: Page, timeout_ms: int = 60_000) -> bool:
    """Espera a que el frame del WebPart de SharePoint tenga contenido."""
    inicio = asyncio.get_event_loop().time()
    while (asyncio.get_event_loop().time() - inicio) * 1000 < timeout_ms:
        for frame in page.frames:
            nombre = getattr(frame, 'name', '')
            if 'MSOPageViewer' in nombre or 'WebPartWPQ' in nombre:
                try:
                    count = await frame.evaluate(
                        "document.querySelectorAll('a, button').length"
                    )
                    if count > 0:
                        log(f"Frame '{nombre}' listo ({count} elementos).")
                        return True
                except Exception:
                    pass
        await page.wait_for_timeout(1_000)
    return False


async def navegar_a_expedientes(page: Page) -> bool:
    """
    Intenta navegar al módulo de expedientes legislativos.
    Máximo 5 intentos con 60s de espera entre cada uno.
    Retorna True si logra hacer clic en el botón de entrada.
    """
    for intento in range(5):
        if intento > 0:
            log(f"Reintento {intento}/4 — recargando página...")
            try:
                await page.goto(URL_BASE, wait_until="networkidle", timeout=60_000)
            except Exception:
                await page.goto(URL_BASE, wait_until="domcontentloaded", timeout=30_000)

        log("Esperando frame del portal...")
        if not await esperar_frame_webpart(page, timeout_ms=60_000):
            log(f"Frame no cargó en 60s. Esperando 60s antes de reintentar...")
            await page.screenshot(path=f"debug_fase1_intento_{intento+1}.png", full_page=True)
            await page.wait_for_timeout(60_000)
            continue

        log(f"Buscando botón '{TEXTO_BOTON_ENTRADA}'...")
        contextos = [page] + list(page.frames)

        # Intento directo con Playwright
        for ctx in contextos:
            ctx_name = getattr(ctx, 'name', 'main')
            try:
                selectores = [
                    "a[role='button']", "button", "a",
                    "div[role='button']", "span[role='button']"
                ]
                for sel in selectores:
                    botones = await ctx.query_selector_all(sel)
                    for boton in botones:
                        try:
                            texto = (await boton.inner_text()).strip()
                            if not texto:
                                texto = await boton.get_attribute("title") or ""
                            if not texto:
                                texto = await boton.get_attribute("aria-label") or ""
                            if TEXTO_BOTON_ENTRADA.lower() in texto.lower():
                                log(f"Botón encontrado en frame '{ctx_name}'. Haciendo clic...")
                                await boton.scroll_into_view_if_needed()
                                await boton.click()
                                await page.wait_for_load_state("networkidle", timeout=45_000)
                                await page.wait_for_timeout(ESPERA_CARGA_GRILLA)
                                return True
                        except Exception:
                            continue
            except Exception:
                continue

        # Fallback JS por frame
        for ctx in contextos:
            ctx_name = getattr(ctx, 'name', 'main')
            try:
                clicked = await ctx.evaluate(f"""() => {{
                    const texto_buscado = "{TEXTO_BOTON_ENTRADA}".toLowerCase();
                    for (const sel of ['a','button','div[role="button"]','span[role="button"]']) {{
                        for (const el of document.querySelectorAll(sel)) {{
                            const t = (el.innerText || el.textContent ||
                                       el.getAttribute('title') ||
                                       el.getAttribute('aria-label') || '').toLowerCase().trim();
                            if (t.includes(texto_buscado)) {{ el.click(); return true; }}
                        }}
                    }}
                    return false;
                }}""")
                if clicked:
                    log(f"Botón encontrado via JS en frame '{ctx_name}'.")
                    await page.wait_for_load_state("networkidle", timeout=45_000)
                    await page.wait_for_timeout(ESPERA_CARGA_GRILLA)
                    return True
            except Exception:
                continue

        log("Botón no encontrado. Guardando debug...")
        await page.screenshot(path=f"debug_fase1_intento_{intento+1}.png", full_page=True)
        with open(f"debug_fase1_intento_{intento+1}.html", "w", encoding="utf-8") as f:
            f.write(await page.content())
        await page.wait_for_timeout(60_000)

    log("No se pudo navegar al módulo tras 5 intentos.")
    return False


async def encontrar_frame_con_grilla(page: Page):
    """Encuentra el frame que contiene el jqxGrid."""
    selectores = ["div[role='grid']", ".jqx-grid", "div.jqx-grid-cell"]
    for ctx in [page] + list(page.frames):
        try:
            for sel in selectores:
                if await ctx.query_selector(sel):
                    log("Grilla localizada.")
                    return ctx
        except Exception:
            continue
    return None


async def cambiar_registros_por_pagina(frame, page: Page, cantidad: str = "10") -> bool:
    """Selecciona la cantidad de registros por página en el dropdown."""
    log(f"Configurando {cantidad} registros por página...")
    try:
        dropdowns = await frame.query_selector_all(".jqx-dropdownlist-content")
        for d in dropdowns:
            texto = await d.inner_text()
            if texto.strip().isdigit():
                await d.click()
                await page.wait_for_timeout(800)
                for ctx in [frame, page]:
                    opcion = await ctx.query_selector(
                        f".jqx-listitem-element:has-text('{cantidad}')"
                    )
                    if opcion:
                        await opcion.click()
                        log(f"Dropdown: {cantidad} registros seleccionados.")
                        await page.wait_for_timeout(ESPERA_CARGA_GRILLA)
                        return True
    except Exception as e:
        log(f"Error configurando registros por página: {e}")
    return False


# ──────────────────────────────────────────────────────────────────────
# MODALES DE ERROR
# ──────────────────────────────────────────────────────────────────────

async def cerrar_modal_error(frame, page: Page) -> bool:
    """
    Detecta y cierra diálogos de error jqx-window-modal.
    Retorna True si había un modal y fue cerrado.
    """
    try:
        modal = await frame.query_selector(".jqx-window-modal")
        if not modal or not await modal.is_visible():
            return False
        log("Modal de error detectado. Cerrando...")
        for sel in [
            ".jqx-window-close-button",
            "button:has-text('Cerrar')",
            "button:has-text('Aceptar')",
            "button:has-text('OK')",
        ]:
            try:
                btn = await frame.query_selector(sel)
                if btn and await btn.is_visible():
                    await btn.click()
                    await page.wait_for_timeout(600)
                    return True
            except Exception:
                continue
        await page.keyboard.press("Escape")
        await page.wait_for_timeout(600)
        return True
    except Exception:
        return False


# ──────────────────────────────────────────────────────────────────────
# LECTURA DE FILAS
# ──────────────────────────────────────────────────────────────────────

async def obtener_info_filas(frame) -> list:
    """
    Lee las filas de la grilla principal.
    Retorna lista de {expediente, titulo, row_index}.
    """
    info = []
    try:
        grilla = await frame.query_selector("div[role='grid']")
        if not grilla:
            return info
        rows = await grilla.query_selector_all("div[role='row']")
        for idx, row in enumerate(rows):
            try:
                celdas = await row.query_selector_all("div[role='gridcell']")
                if len(celdas) < 2:
                    continue
                num    = (await celdas[0].inner_text()).strip()
                titulo = (await celdas[1].inner_text()).strip()
                if num and re.match(r'^\d{4,6}$', num.replace(" ", "")):
                    info.append({
                        "expediente": num,
                        "titulo":     titulo,
                        "row_index":  idx,
                    })
            except Exception:
                continue
    except Exception as exc:
        log(f"Error leyendo grilla: {exc}")
    return info


async def clicar_fila(frame, page: Page, row_index: int) -> bool:
    """Hace clic en una fila. Maneja modales antes y después del clic."""
    await cerrar_modal_error(frame, page)
    try:
        rows = await frame.query_selector_all("div[role='row']")
        if row_index >= len(rows):
            return False
        await rows[row_index].click()
        await page.wait_for_timeout(ESPERA_CLIC_FILA)
        if await cerrar_modal_error(frame, page):
            log(f"  Fila {row_index}: modal de error del servidor. Saltando.")
            return False
        return True
    except Exception as exc:
        log(f"  Error haciendo clic en fila {row_index}: {exc}")
        await cerrar_modal_error(frame, page)
        return False


# ──────────────────────────────────────────────────────────────────────
# TABS DE DETALLE
# ──────────────────────────────────────────────────────────────────────

async def clic_tab(frame, page: Page, texto: str) -> bool:
    """Hace clic en un tab del panel de detalle."""
    for sel in [
        f"td:has-text('{texto}')",
        f"li[role='tab']:has-text('{texto}')",
        f"div[role='tab']:has-text('{texto}')",
        f"a:has-text('{texto}')",
        f"span:has-text('{texto}')",
    ]:
        try:
            els = await frame.query_selector_all(sel)
            for el in els:
                if await el.is_visible():
                    await el.click()
                    await page.wait_for_timeout(ESPERA_CLIC_TAB)
                    return True
        except Exception:
            continue
    return False


async def extraer_tab_general(frame, page: Page) -> dict:
    """Extrae los campos clave/valor del tab General."""
    await clic_tab(frame, page, "General")
    await page.wait_for_timeout(400)
    datos = {}
    try:
        datos = await frame.evaluate("""() => {
            const resultado = {};
            for (const tabla of document.querySelectorAll('table')) {
                if (tabla.closest("[role='grid']") || tabla.closest('.jqx-grid')) continue;
                for (const tr of tabla.querySelectorAll('tr')) {
                    const tds = [...tr.querySelectorAll('td')];
                    for (let i = 0; i < tds.length - 1; i++) {
                        const labelTd = tds[i];
                        const valorTd = tds[i + 1];
                        if (labelTd.querySelector('input, select')) continue;
                        const label = (labelTd.innerText || labelTd.textContent || '')
                            .trim().replace(/[:：]$/, '').trim();
                        if (!label || label.length > 60) continue;
                        const inp = valorTd.querySelector('input, select');
                        let val = '';
                        if (inp) {
                            val = (inp.value || inp.getAttribute('value') || '').trim();
                        } else {
                            val = (valorTd.innerText || valorTd.textContent || '').trim();
                        }
                        if (label && val) resultado[label] = val;
                    }
                }
            }
            if (Object.keys(resultado).length === 0) {
                for (const inp of document.querySelectorAll('input[aria-label]')) {
                    const label = (inp.getAttribute('aria-label') || '').trim();
                    const val   = (inp.value || '').trim();
                    if (label && val) resultado[label] = val;
                }
            }
            return resultado;
        }""")
    except Exception as exc:
        log(f"  Error en tab General: {exc}")
    return {k: limpiar(v) for k, v in datos.items()}


async def extraer_tab_tramitacion(frame, page: Page) -> list:
    """Extrae los pasos de tramitación via jqxGrid API."""
    await clic_tab(frame, page, "Tramitación")
    await page.wait_for_timeout(700)
    tramitacion = []
    try:
        resultado = await frame.evaluate("""() => {
            const contenedor = document.querySelector('.marco-subcontenedor.alto-completo');
            if (!contenedor) return null;
            const panelVisible = [...contenedor.querySelectorAll('.jqx-tabs-content-element')]
                .find(p => p.offsetParent !== null);
            if (!panelVisible) return null;
            const grilla = panelVisible.querySelector("div[role='grid']");
            if (!grilla) return null;
            const $ = window.$ || window.jQuery;
            if (!$ || !$(grilla).jqxGrid) return null;
            const rowCount = $(grilla).jqxGrid('getdatainformation').rowscount;
            if (rowCount === 0) return [];
            const filas = [];
            for (let i = 0; i < rowCount; i++) {
                const row = $(grilla).jqxGrid('getrowdata', i);
                if (!row) continue;
                filas.push({
                    organo:        String(row.Nombre_Corto        ?? ''),
                    descripcion:   String(row.Descripcion_Tramite ?? ''),
                    fecha_inicio:  String(row.Fecha_Inicio        ?? '').split(' ')[0],
                    fecha_termino: String(row.Fecha_Termino       ?? '').split(' ')[0],
                });
            }
            return filas;
        }""")
        if resultado:
            for f in resultado:
                tramitacion.append({
                    "Órgano":        limpiar(f["organo"]),
                    "Descripción":   limpiar(f["descripcion"]),
                    "Fecha Inicio":  limpiar(f["fecha_inicio"]),
                    "Fecha Término": limpiar(f["fecha_termino"]),
                })
    except Exception as e:
        log(f"  Error en tab Tramitación: {e}")
    return tramitacion


async def extraer_tab_proponentes(frame, page: Page) -> list:
    """Extrae los proponentes via jqxGrid API."""
    await clic_tab(frame, page, "Proponentes")
    await page.wait_for_timeout(700)
    proponentes = []
    try:
        resultado = await frame.evaluate("""() => {
            const contenedor = document.querySelector('.marco-subcontenedor.alto-completo');
            if (!contenedor) return null;
            const panelVisible = [...contenedor.querySelectorAll('.jqx-tabs-content-element')]
                .find(p => p.offsetParent !== null);
            if (!panelVisible) return null;
            const grilla = panelVisible.querySelector("div[role='grid']");
            if (!grilla) return null;
            const $ = window.$ || window.jQuery;
            if (!$ || !$(grilla).jqxGrid) return null;
            const rowCount = $(grilla).jqxGrid('getdatainformation').rowscount;
            if (rowCount === 0) return [];
            const filas = [];
            for (let i = 0; i < rowCount; i++) {
                const row = $(grilla).jqxGrid('getrowdata', i);
                if (!row) continue;
                filas.push({
                    firma:          String(row.Secuencia_Firma ?? ''),
                    nombre:         String(row.Nombre         ?? ''),
                    administracion: String(row.Administracion ?? ''),
                });
            }
            return filas;
        }""")
        if resultado:
            for f in resultado:
                proponentes.append({
                    "Firma":          limpiar(f["firma"]),
                    "Nombre":         limpiar(f["nombre"]),
                    "Administración": limpiar(f["administracion"]),
                })
    except Exception as e:
        log(f"  Error en tab Proponentes: {e}")
    return proponentes


# ──────────────────────────────────────────────────────────────────────
# PAGINACIÓN
# ──────────────────────────────────────────────────────────────────────

async def ir_a_pagina(frame, page: Page, num_pagina: int) -> bool:
    """
    Navega directamente a una página específica usando el input de paginación.
    Funciona para cualquier número de página, no solo la 1.
    """
    try:
        inp = await frame.query_selector("input.ctrl-tabla-ira") or \
              await frame.query_selector("input[title='Página actual']")
        if not inp:
            return False
        await inp.click(click_count=3)
        await inp.fill(str(num_pagina))
        await inp.press("Enter")
        await page.wait_for_timeout(ESPERA_CLIC_PAGINA)
        return True
    except Exception as e:
        log(f"Error navegando a página {num_pagina}: {e}")
        return False


# ──────────────────────────────────────────────────────────────────────
# PROCESAR UNA PÁGINA COMPLETA
# ──────────────────────────────────────────────────────────────────────

async def procesar_pagina(
    page: Page,
    frame,
    num_pagina: int,
    acumulado: list,
) -> tuple[bool, bool]:
    """
    Procesa todas las filas de una página.
    Retorna (exitoso, debe_parar).
    debe_parar=True cuando se detecta un expediente con cuatrienal vencido,
    lo que indica que no hay más cambios posibles a partir de ahí.
    """
    await clic_tab(frame, page, "General")
    await page.wait_for_timeout(400)

    filas = await obtener_info_filas(frame)
    if not filas:
        log(f"Página {num_pagina}: sin filas. El portal puede estar con problemas.")
        return False, False

    total = len(filas)
    log(f"{'─'*50}")
    log(f"PÁGINA {num_pagina} — {total} expedientes")
    log(f"{'─'*50}")

    debe_parar = False

    for i, info in enumerate(filas):
        exp       = info["expediente"]
        titulo    = info["titulo"]
        row_idx   = info["row_index"]
        titulo_c  = limpiar(titulo)[:60] + ("…" if len(titulo) > 60 else "")

        log(f"[{i+1}/{total}] Exp. {exp}: {titulo_c}")

        ok = await clicar_fila(frame, page, row_idx)
        if not ok:
            log(f"  Fila {i+1} omitida (error de clic).")
            continue

        general     = await extraer_tab_general(frame, page)
        tramitacion = await extraer_tab_tramitacion(frame, page)
        proponentes = await extraer_tab_proponentes(frame, page)

        await clic_tab(frame, page, "General")
        await page.wait_for_timeout(200)

        acumulado.append({
            "pagina":            num_pagina,
            "numero_expediente": exp,
            "titulo":            limpiar(titulo),
            "general":           general,
            "tramitacion":       tramitacion,
            "proponentes":       proponentes,
        })

        log(
            f"  ✓ General({len(general)}) "
            f"Tramitación({len(tramitacion)}) "
            f"Proponentes({len(proponentes)})"
        )

        if cuatrienal_vencido(general):
            log(f"  ⚑ Cuatrienal vencido en exp. {exp} — señalando parada global.")
            debe_parar = True
            break

    return True, debe_parar


# ──────────────────────────────────────────────────────────────────────
# WORKERS PARALELOS
# ──────────────────────────────────────────────────────────────────────

async def setup_worker_browser(playwright, worker_id: int):
    """
    Lanza un browser independiente, navega al portal y localiza la grilla.
    Retorna (browser, page, frame) o None si falla.
    """
    log(f"[W{worker_id}] Iniciando browser...")
    browser = await playwright.chromium.launch(
        headless=IS_CI,
        args=[
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--disable-blink-features=AutomationControlled",
        ]
    )
    context = await browser.new_context(
        user_agent=(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        viewport={"width": 1440, "height": 900},
    )
    page = await context.new_page()

    log(f"[W{worker_id}] Cargando portal SIL...")
    try:
        await page.goto(URL_BASE, wait_until="networkidle", timeout=60_000)
    except Exception:
        await page.goto(URL_BASE, wait_until="domcontentloaded", timeout=30_000)

    await page.wait_for_timeout(8_000)

    if not await navegar_a_expedientes(page):
        log(f"[W{worker_id}] No pudo navegar al módulo. Cerrando.")
        await browser.close()
        return None

    await page.wait_for_timeout(3_000)

    frame = await encontrar_frame_con_grilla(page)
    if not frame:
        log(f"[W{worker_id}] Grilla no encontrada. Cerrando.")
        await browser.close()
        return None

    await cambiar_registros_por_pagina(frame, page, REGISTROS_POR_PAG)
    await page.wait_for_timeout(4_000)

    log(f"[W{worker_id}] Listo.")
    return browser, page, frame


async def run_worker(
    worker_id: int,
    page_queue: asyncio.Queue,
    all_results: list,
    results_lock: asyncio.Lock,
    stop_event: asyncio.Event,
    playwright,
):
    """
    Worker: tiene su propio browser y procesa páginas de la cola compartida
    hasta que la cola se vacíe o stop_event esté activo.
    """
    setup = await setup_worker_browser(playwright, worker_id)
    if not setup:
        return

    browser, page, frame = setup

    try:
        while not stop_event.is_set():
            try:
                num_pagina = page_queue.get_nowait()
            except asyncio.QueueEmpty:
                break

            log(f"[W{worker_id}] → Página {num_pagina}")

            if not await ir_a_pagina(frame, page, num_pagina):
                log(f"[W{worker_id}] No pudo ir a página {num_pagina}. Saltando.")
                page_queue.task_done()
                continue

            await page.wait_for_timeout(2_000)

            resultados_pagina: list = []
            exitoso, debe_parar = await procesar_pagina(
                page, frame, num_pagina, resultados_pagina
            )

            if resultados_pagina:
                async with results_lock:
                    all_results.extend(resultados_pagina)

            page_queue.task_done()

            if debe_parar:
                log(f"[W{worker_id}] Cuatrienal vencido — activando parada global.")
                stop_event.set()
                break

            if not exitoso:
                log(f"[W{worker_id}] Página {num_pagina} sin datos. Continuando.")

    except Exception as exc:
        log(f"[W{worker_id}] Error inesperado: {exc}")
    finally:
        await browser.close()
        log(f"[W{worker_id}] Browser cerrado.")


# ──────────────────────────────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────────────────────────────

async def main():
    inicio = datetime.now()

    log("=" * 55)
    log("FASE 1 — Extractor SIL · Asamblea Legislativa CR")
    log("=" * 55)
    log(f"Inicio:      {inicio:%Y-%m-%d %H:%M:%S}")
    log(f"Workers:     {N_WORKERS}")
    log(f"Máx páginas: {MAX_PAGINAS}")
    log(f"Entorno CI:  {IS_CI}")
    log("=" * 55)

    proyectos: list = []
    results_lock = asyncio.Lock()
    stop_event   = asyncio.Event()

    # Cola con todos los números de página posibles
    page_queue: asyncio.Queue = asyncio.Queue()
    for n in range(1, MAX_PAGINAS + 1):
        page_queue.put_nowait(n)

    try:
        async with async_playwright() as p:
            workers = [
                asyncio.create_task(
                    run_worker(wid + 1, page_queue, proyectos, results_lock, stop_event, p)
                )
                for wid in range(N_WORKERS)
            ]
            await asyncio.gather(*workers, return_exceptions=True)
    except Exception as e:
        log(f"Error inesperado en main: {e}")
        log("Continuando con lo que se extrajo hasta ahora...")

    # ── Sync y exportación ─────────────────────────────────────────────
    if not proyectos:
        log("No se extrajeron proyectos. El portal puede estar caído.")
        log("Fase 1 finalizada sin datos — sin errores en el workflow.")
        sys.exit(0)

    log("─" * 55)
    log("SINCRONIZACIÓN CON BASE DE DATOS")
    log("─" * 55)
    crear_tablas()
    stats = sync_proyectos(proyectos)

    duracion = datetime.now() - inicio

    log("=" * 55)
    log("RESUMEN FASE 1")
    log("=" * 55)
    log(f"Proyectos extraídos:  {len(proyectos)}")
    log(f"Workers utilizados:   {N_WORKERS}")
    log(f"DB sincronizados:     {stats.get('actualizados', 0)}")
    log(f"DB errores:           {stats.get('errores', 0)}")
    log(f"Duración total:       {str(duracion).split('.')[0]}")
    log("=" * 55)


if __name__ == "__main__":
    asyncio.run(main())


# ──────────────────────────────────────────────────────────────────────
# ENTRY POINT para el orquestador (llamada directa, no subprocess)
# ──────────────────────────────────────────────────────────────────────

async def run_fase1():
    """
    Punto de entrada para el orquestador.py.
    Equivalente a correr el script directamente pero sin sys.exit().
    """
    await main()
