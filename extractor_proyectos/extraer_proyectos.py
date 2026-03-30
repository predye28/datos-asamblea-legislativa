"""
extraer_proyectos.py
══════════════════════════════════════════════════════════════════════
Scraper de proyectos de ley de la Asamblea Legislativa de Costa Rica.

Fixes aplicados:
  - Re-lee las filas de la grilla en cada iteración (evita "not attached to DOM")
  - Identifica el panel inferior por índice/posición para no confundir
    sus tablas con la grilla superior
  - Extrae Tramitación y Proponentes del contenedor correcto
"""

import asyncio
import json
import os
import re
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from datetime import datetime
from playwright.async_api import async_playwright, Page

from sync_engine import crear_tablas, sync_proyectos

# ══════════════════════════════════════════════════════════════════════
# CONFIGURACIÓN
# ══════════════════════════════════════════════════════════════════════

URL_BASE = (
    "https://www.asamblea.go.cr/Centro_de_informacion/"
    "Consultas_SIL/SitePages/SIL.aspx"
)

CARPETA_DOCS        = "documentos"
_mp                 = os.getenv("MAX_PAGINAS", "1")
MAX_PAGINAS         = int(_mp) if _mp.strip() else None   # None = todas
DESCARGAR_DOCS      = False
TEXTO_BOTON_ENTRADA = "Expedientes Legislativos - Consulta"

ESPERA_CARGA_GRILLA = 4_000
ESPERA_CLIC_FILA    = 2_500
ESPERA_CLIC_TAB     = 1_800
ESPERA_CLIC_PAGINA  = 3_000


# ══════════════════════════════════════════════════════════════════════
# UTILIDADES
# ══════════════════════════════════════════════════════════════════════

def limpiar(v):
    if not isinstance(v, str):
        return v
    v = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', v)
    v = re.sub(r'[\u2400-\u243F]', '-', v)
    return v.strip()


# ══════════════════════════════════════════════════════════════════════
# NAVEGACIÓN INICIAL
# ══════════════════════════════════════════════════════════════════════

async def navegar_a_expedientes(page: Page) -> bool:
    print(f"\n🔍 Buscando botón '{TEXTO_BOTON_ENTRADA}'...")
    for ctx in [page] + list(page.frames):
        try:
            for boton in await ctx.query_selector_all("a[role='button'], button, a"):
                texto = (await boton.inner_text()).strip()
                if TEXTO_BOTON_ENTRADA.lower() in texto.lower():
                    print("   ✅ Botón encontrado")
                    await boton.click()
                    await page.wait_for_load_state("domcontentloaded")
                    await page.wait_for_timeout(ESPERA_CARGA_GRILLA)
                    return True
        except Exception:
            continue
    print("   ❌ No se encontró el botón.")
    await page.screenshot(path="debug_boton_no_encontrado.png", full_page=True)
    return False


async def encontrar_frame_con_grilla(page: Page):
    selectores = ["div[role='grid']", ".jqx-grid", "div.jqx-grid-cell"]
    for ctx in [page] + list(page.frames):
        try:
            for sel in selectores:
                if await ctx.query_selector(sel):
                    print("   ✅ Grilla encontrada")
                    return ctx
        except Exception:
            continue
    return None

async def cambiar_mostrar_registros(frame, page: Page, cantidad: str = "10"):
    """
    Localiza el dropdown de 'Mostrar registros' usando clases estables 
    y selecciona la cantidad deseada.
    """
    print(f"⚙️ Intentando cambiar visualización a {cantidad} registros...")
    try:
        # 1. Buscamos el contenedor del dropdown que tiene la clase de jqx-dropdownlist
        # Usamos un selector que busque el div que contiene el texto actual (ej. '30')
        # y que esté cerca de la etiqueta 'registros'
        selector_dropdown = ".jqx-dropdownlist-content"
        
        # Esperamos a que el elemento sea visible en el frame
        dropdowns = await frame.query_selector_all(selector_dropdown)
        
        target_dropdown = None
        for d in dropdowns:
            texto = await d.inner_text()
            # Buscamos el que tiene un número (30, 10, 50, etc.)
            if texto.strip().isdigit():
                target_dropdown = d
                break
        
        if target_dropdown:
            print(f"   ✨ Dropdown encontrado (valor actual: {await target_dropdown.inner_text()})")
            await target_dropdown.click()
            await page.wait_for_timeout(1000) # Tiempo para que despliegue las opciones

            # 2. Las opciones de jqx a veces se renderizan en un div flotante 
            # al final del body del documento principal (page), no necesariamente en el frame.
            opcion_selector = f".jqx-listitem-element:has-text('{cantidad}')"
            
            # Intentamos buscar la opción en el frame y si no, en la página principal
            opcion = await frame.query_selector(opcion_selector)
            if not opcion:
                opcion = await page.query_selector(opcion_selector)
            
            if opcion:
                await opcion.click()
                print(f"   ✅ Seleccionado: {cantidad}")
                # Espera crucial para que la grilla se refresque con los nuevos datos
                await page.wait_for_timeout(ESPERA_CARGA_GRILLA)
                return True
            else:
                print(f"   ⚠️ No se encontró la opción '{cantidad}' en el menú desplegado.")
        else:
            print("   ⚠️ No se localizó el control de 'Mostrar registros'.")
            
    except Exception as e:
        print(f"   ❌ Error al cambiar registros: {e}")
    return False


# ══════════════════════════════════════════════════════════════════════
# LEER FILAS — se llama FRESCO en cada iteración
# ══════════════════════════════════════════════════════════════════════

async def obtener_info_filas(frame) -> list:
    """
    Devuelve lista de {expediente, titulo, row_index}.
    Usa el ÍNDICE de fila, no el handle, para poder re-seleccionar
    después de que jqxGrid regenere el DOM.
    """
    info = []
    try:
        rows = await frame.query_selector_all("div[role='row']")
        for idx, row in enumerate(rows):
            try:
                celdas = await row.query_selector_all("div[role='gridcell']")
                if len(celdas) < 2:
                    continue
                num    = (await celdas[0].inner_text()).strip()
                titulo = (await celdas[1].inner_text()).strip()
                if num and re.match(r'^\d+$', num.replace(" ", "")):
                    info.append({
                        "expediente": num,
                        "titulo":     titulo,
                        "row_index":  idx,
                    })
            except Exception:
                continue
    except Exception as exc:
        print(f"   ⚠️  Error leyendo grilla: {exc}")
    return info


async def clicar_fila_por_indice(frame, page: Page, row_index: int) -> bool:
    """
    Re-lee el DOM y hace clic en la fila por índice.
    Evita el error 'Element is not attached to the DOM'.
    """
    try:
        rows = await frame.query_selector_all("div[role='row']")
        if row_index >= len(rows):
            print(f"    ⚠️  Índice {row_index} fuera de rango ({len(rows)} filas).")
            return False
        await rows[row_index].click()
        await page.wait_for_timeout(ESPERA_CLIC_FILA)
        return True
    except Exception as exc:
        print(f"    ⚠️  Error al clicar fila {row_index}: {exc}")
        return False


# ══════════════════════════════════════════════════════════════════════
# CLIC EN TAB
# ══════════════════════════════════════════════════════════════════════

async def clic_tab(frame, page: Page, texto_tab: str) -> bool:
    selectores = [
        f"td:has-text('{texto_tab}')",
        f"li[role='tab']:has-text('{texto_tab}')",
        f"div[role='tab']:has-text('{texto_tab}')",
        f"a:has-text('{texto_tab}')",
        f"span:has-text('{texto_tab}')",
    ]
    for sel in selectores:
        try:
            els = await frame.query_selector_all(sel)
            for el in els:
                if await el.is_visible():
                    await el.click()
                    await page.wait_for_timeout(ESPERA_CLIC_TAB)
                    return True
        except Exception:
            continue
    print(f"    ⚠️  Tab '{texto_tab}' no encontrada")
    return False


# ══════════════════════════════════════════════════════════════════════
# TAB GENERAL
# ══════════════════════════════════════════════════════════════════════

async def extraer_tab_general(frame, page: Page) -> dict:
    """
    Extrae campos de la tab General del panel inferior (CNSPROYECTOS-2).

    El sistema usa el patrón:
        <td>Label</td><td><input value="valor"/></td>
    dentro de tablas que NO son la grilla superior.
    """
    await clic_tab(frame, page, "General")
    await page.wait_for_timeout(500)

    datos = {}
    try:
        datos = await frame.evaluate("""() => {
            const resultado = {};

            for (const tabla of document.querySelectorAll('table')) {
                // Excluir tablas dentro de la grilla superior
                if (tabla.closest("[role='grid']") || tabla.closest('.jqx-grid')) continue;

                for (const tr of tabla.querySelectorAll('tr')) {
                    const tds = [...tr.querySelectorAll('td')];
                    for (let i = 0; i < tds.length - 1; i++) {
                        const labelTd = tds[i];
                        const valorTd = tds[i + 1];

                        // El td de label no debe contener inputs
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

            // Fallback: inputs con aria-label
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
        print(f"    ⚠️  extraer_tab_general: {exc}")

    return {k: limpiar(v) for k, v in datos.items()}

async def _leer_grilla_panel_inferior(frame, page, columnas_esperadas: int,
                                       skip_first: bool = True,
                                       timeout_ms: int = 5000) -> list:
    intervalo = 300
    intentos = timeout_ms // intervalo
    slice_js = "celdas.slice(1)" if skip_first else "celdas"

    for _ in range(intentos):
        resultado = await frame.evaluate(f"""() => {{
            const contenedor = document.querySelector('.marco-subcontenedor.alto-completo');
            if (!contenedor) return null;

            const panelVisible = [...contenedor.querySelectorAll(
                '.jqx-tabs-content-element'
            )].find(p => p.offsetParent !== null);
            if (!panelVisible) return null;

            const grilla = panelVisible.querySelector("div[role='grid']");
            if (!grilla) return null;

            const rows = [...grilla.querySelectorAll("div[role='row']")];
            if (!rows.length) return null;

            // Verificar que hay suficientes celdas con datos
            let ok = false;
            for (const row of rows) {{
                const celdas = [...row.querySelectorAll("div[role='gridcell']")]
                    .map(c => (c.innerText || c.textContent || '').trim());
                if (celdas.filter(c => c.length > 0).length >= {columnas_esperadas}) {{
                    ok = true;
                    break;
                }}
            }}
            if (!ok) return null;

            const filas = [];
            for (const row of rows) {{
                const celdas = [...row.querySelectorAll("div[role='gridcell']")]
                    .map(c => (c.innerText || c.textContent || '').trim());
                if (celdas.filter(c => c.length > 0).length < 2) continue;
                filas.push({slice_js});
            }}
            return filas;
        }}""")

        if resultado is not None:
            return resultado
        await page.wait_for_timeout(intervalo)

    print(f"    ⚠️  Timeout esperando grilla con {columnas_esperadas} columnas")
    return []
# ══════════════════════════════════════════════════════════════════════
# TAB TRAMITACIÓN
# ══════════════════════════════════════════════════════════════════════

async def extraer_tab_tramitacion(frame, page) -> list:
    await clic_tab(frame, page, "Tramitación")
    # skip_first=True: la primera celda está vacía (checkbox jqx)
    # columnas reales: Órgano | Descripción | Fecha Inicio | Fecha Término
    filas = await _leer_grilla_panel_inferior(
        frame, page, columnas_esperadas=4, skip_first=True
    )
    tramitacion = []
    for fila in filas:
        tramitacion.append({
            "Órgano":        limpiar(fila[0] if len(fila) > 0 else ""),
            "Descripción":   limpiar(fila[1] if len(fila) > 1 else ""),
            "Fecha Inicio":  limpiar(fila[2] if len(fila) > 2 else ""),
            "Fecha Término": limpiar(fila[3] if len(fila) > 3 else ""),
        })
    return tramitacion

# ══════════════════════════════════════════════════════════════════════
# TAB PROPONENTES
# ══════════════════════════════════════════════════════════════════════

async def extraer_tab_proponentes(frame, page) -> list:
    await clic_tab(frame, page, "Proponentes")
    # skip_first=False: la primera celda ES el número de firma (dato real)
    # columnas reales: Firma(número) | Nombre | Administración
    filas = await _leer_grilla_panel_inferior(
        frame, page, columnas_esperadas=3, skip_first=False
    )
    proponentes = []
    for fila in filas:
        proponentes.append({
            "Firma":          limpiar(fila[0] if len(fila) > 0 else ""),
            "Nombre":         limpiar(fila[1] if len(fila) > 1 else ""),
            "Administración": limpiar(fila[2] if len(fila) > 2 else ""),
        })
    return proponentes

async def volver_tab_general(frame, page: Page):
    await clic_tab(frame, page, "General")


# ══════════════════════════════════════════════════════════════════════
# PROCESAR UNA PÁGINA COMPLETA
# ══════════════════════════════════════════════════════════════════════

async def procesar_pagina_grilla(page: Page, frame, num_pagina: int, acumulado: list):
    """
    Procesa los expedientes de la página actual.

    FIX CLAVE: guarda solo los metadatos (expediente, titulo, row_index)
    de cada fila, NO los handles. Antes de cada clic re-busca el handle
    fresco por índice, evitando 'Element is not attached to the DOM'.
    """
    filas_info = await obtener_info_filas(frame)

    if not filas_info:
        print(f"  ⚠️  Sin filas en página {num_pagina}.")
        return

    total = len(filas_info)
    print(f"\n{'═'*62}")
    print(f"  PÁGINA {num_pagina}  —  {total} expediente(s)")
    print(f"{'═'*62}")

    for i, info in enumerate(filas_info):
        num_exp      = info["expediente"]
        titulo       = info["titulo"]
        row_index    = info["row_index"]
        titulo_corto = limpiar(titulo)[:65] + ("…" if len(titulo) > 65 else "")

        print(f"\n  [{i+1:>2}/{total}] Exp. {num_exp} — {titulo_corto}")

        # Clic fresco por índice (re-busca el handle en el DOM actual)
        ok = await clicar_fila_por_indice(frame, page, row_index)
        if not ok:
            continue

        general     = await extraer_tab_general(frame, page)
        tramitacion = await extraer_tab_tramitacion(frame, page)
        proponentes = await extraer_tab_proponentes(frame, page)

        await volver_tab_general(frame, page)

        acumulado.append({
            "pagina":            num_pagina,
            "numero_expediente": num_exp,
            "titulo":            limpiar(titulo),
            "general":           general,
            "tramitacion":       tramitacion,
            "proponentes":       proponentes,
        })

        print(
            f"    ✓  General: {len(general)} campo(s) | "
            f"Tramitación: {len(tramitacion)} fila(s) | "
            f"Proponentes: {len(proponentes)} fila(s)"
        )

        if (i + 1) % 10 == 0:
            await page.screenshot(
                path=f"debug_p{num_pagina}_exp{i+1}.png",
                full_page=False
            )


# ══════════════════════════════════════════════════════════════════════
# PAGINACIÓN
# ══════════════════════════════════════════════════════════════════════

async def ir_siguiente_pagina(frame, page: Page, pagina_actual: int) -> bool:
    selectores = [
        "div[title='Siguiente página']",
        "input[title='Siguiente página']",
        "div[title='Next Page']",
        "input[title='Next Page']",
        ".jqx-icon-arrow-right:not(.jqx-icon-arrow-right-selected)",
    ]
    for sel in selectores:
        try:
            btns = await frame.query_selector_all(sel)
            for btn in btns:
                if not await btn.is_visible():
                    continue
                clase    = (await btn.get_attribute("class") or "").lower()
                disabled = await btn.get_attribute("disabled")
                title    = (await btn.get_attribute("title") or "").lower()
                if disabled or "disabled" in clase:
                    continue
                if "ltima" in title or "last" in title:
                    continue
                await btn.click()
                await page.wait_for_timeout(ESPERA_CLIC_PAGINA)
                print(f"   ✓ Avanzado a página {pagina_actual + 1}")
                return True
        except Exception:
            continue

    try:
        for btn in await frame.query_selector_all("div, button, a, input[type='button']"):
            try:
                texto = (await btn.inner_text()).strip()
                title = (await btn.get_attribute("title") or "").lower()
                clase = (await btn.get_attribute("class") or "").lower()
                if (texto in [">", "»", "›"] or "siguiente" in title or "next" in title):
                    if "disabled" not in clase and not await btn.get_attribute("disabled"):
                        await btn.click()
                        await page.wait_for_timeout(ESPERA_CLIC_PAGINA)
                        return True
            except Exception:
                continue
    except Exception:
        pass

    print("   ✗ No se encontró botón de siguiente (última página).")
    return False


# ══════════════════════════════════════════════════════════════════════
# EXPORTACIÓN EXCEL
# ══════════════════════════════════════════════════════════════════════

def exportar_excel(proyectos: list, nombre: str):
    h_fill = PatternFill("solid", fgColor="1F4E79")
    h_font = Font(bold=True, color="FFFFFF")
    centro = Alignment(horizontal="center")

    def enc(ws, cols):
        for c, txt in enumerate(cols, 1):
            cell = ws.cell(row=1, column=c, value=txt)
            cell.font = h_font; cell.fill = h_fill; cell.alignment = centro

    def s(v):
        return limpiar(v) if isinstance(v, str) else v

    wb = openpyxl.Workbook()

    # Hoja Resumen
    ws = wb.active
    ws.title = "Resumen"
    enc(ws, ["Página", "Expediente", "Título", "Tipo expediente",
             "Fecha inicio", "Vencimiento cuatrienal", "Ley", "Acuerdo", "Veto"])
    for r, p in enumerate(proyectos, 2):
        g = p.get("general", {})
        ws.cell(r, 1, p.get("pagina"))
        ws.cell(r, 2, s(p.get("numero_expediente", "")))
        ws.cell(r, 3, s(p.get("titulo", "")))
        ws.cell(r, 4, s(g.get("Tipo expediente", "")))
        ws.cell(r, 5, s(g.get("Fecha inicio", "")))
        ws.cell(r, 6, s(g.get("Vencimiento cuatrienal", "")))
        ws.cell(r, 7, s(g.get("Ley", "")))
        ws.cell(r, 8, s(g.get("Acuerdo", "")))
        ws.cell(r, 9, s(g.get("Veto", "")))
    ws.column_dimensions["B"].width = 14
    ws.column_dimensions["C"].width = 70
    ws.column_dimensions["D"].width = 40

    # Hoja General (todos los campos raw)
    ws_g = wb.create_sheet("General")
    enc(ws_g, ["Expediente", "Campo", "Valor"])
    r = 2
    for p in proyectos:
        for campo, val in p.get("general", {}).items():
            ws_g.cell(r, 1, s(p.get("numero_expediente", "")))
            ws_g.cell(r, 2, s(campo))
            ws_g.cell(r, 3, s(val))
            r += 1
    ws_g.column_dimensions["B"].width = 35
    ws_g.column_dimensions["C"].width = 55

    # Hoja Tramitación
    ws_t = wb.create_sheet("Tramitación")
    enc(ws_t, ["Expediente", "Órgano", "Descripción", "Fecha Inicio", "Fecha Término"])
    r = 2
    for p in proyectos:
        for t in p.get("tramitacion", []):
            ws_t.cell(r, 1, s(p.get("numero_expediente", "")))
            ws_t.cell(r, 2, s(t.get("Órgano", "")))
            ws_t.cell(r, 3, s(t.get("Descripción", "")))
            ws_t.cell(r, 4, s(t.get("Fecha Inicio", "")))
            ws_t.cell(r, 5, s(t.get("Fecha Término", "")))
            r += 1
    ws_t.column_dimensions["C"].width = 50

    # Hoja Proponentes
    ws_p = wb.create_sheet("Proponentes")
    enc(ws_p, ["Expediente", "Firma", "Nombre", "Administración"])
    r = 2
    for p in proyectos:
        for prop in p.get("proponentes", []):
            ws_p.cell(r, 1, s(p.get("numero_expediente", "")))
            ws_p.cell(r, 2, s(prop.get("Firma", "")))
            ws_p.cell(r, 3, s(prop.get("Nombre", "")))
            ws_p.cell(r, 4, s(prop.get("Administración", "")))
            r += 1
    ws_p.column_dimensions["C"].width = 40

    wb.save(nombre)
    print(f"📊 Excel guardado: {nombre}")


# ══════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════

async def main():
    inicio = datetime.now()

    print("╔══════════════════════════════════════════════════════════╗")
    print("║   Extractor SIL — Asamblea Legislativa de Costa Rica     ║")
    print("╚══════════════════════════════════════════════════════════╝")
    print(f"  Inicio       : {inicio:%Y-%m-%d %H:%M:%S}")
    print(f"  Páginas      : {'TODAS' if not MAX_PAGINAS else f'primeras {MAX_PAGINAS}'}")
    print("=" * 60)

    os.makedirs(CARPETA_DOCS, exist_ok=True)
    proyectos = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=["--no-sandbox", "--disable-dev-shm-usage",
                  "--disable-blink-features=AutomationControlled"]
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

        print(f"\n Cargando portal SIL...")
        await page.goto(URL_BASE, wait_until="domcontentloaded", timeout=60_000)
        await page.wait_for_timeout(6_000)
        await page.screenshot(path="debug_01_inicio.png", full_page=True)

        if not await navegar_a_expedientes(page):
            print("❌ No se pudo navegar al módulo.")
            await browser.close()
            return

        await page.screenshot(path="debug_02_post_boton.png", full_page=True)

        print("\n🔍 Localizando grilla...")
        await page.wait_for_timeout(3_000)
        frame = await encontrar_frame_con_grilla(page)

        if not frame:
            await page.screenshot(path="debug_03_sin_grilla.png", full_page=True)
            print("❌ Grilla no encontrada.")
            await browser.close()
            return
        
        await cambiar_mostrar_registros(frame, page, "10")
        await page.wait_for_timeout(6_000)

        pagina_actual = 1
        ya_procesadas = set()

        while True:
            if MAX_PAGINAS and pagina_actual > MAX_PAGINAS:
                print(f"\n🛑 Límite de {MAX_PAGINAS} página(s) alcanzado.")
                break

            if pagina_actual in ya_procesadas:
                print(f"\n⚠️  Página {pagina_actual} ya procesada (posible loop).")
                break

            await procesar_pagina_grilla(page, frame, pagina_actual, proyectos)
            ya_procesadas.add(pagina_actual)

            print(f"\n🔄 Intentando avanzar a página {pagina_actual + 1}...")
            if not await ir_siguiente_pagina(frame, page, pagina_actual):
                print("\n✅ Extracción completada.")
                break

            pagina_actual += 1

        await browser.close()

    if not proyectos:
        print("\n⚠️  No se extrajo ningún proyecto.")
        return

    print("\n" + "═" * 60)
    print("  SINCRONIZANDO BASE DE DATOS")
    print("═" * 60)
    #crear_tablas()
    #stats = sync_proyectos(proyectos)

    ts         = datetime.now().strftime("%Y%m%d_%H%M%S")
    json_file  = f"proyectos_{ts}.json"
    excel_file = f"proyectos_{ts}.xlsx"

    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(proyectos, f, ensure_ascii=False, indent=2)
    print(f"💾 JSON guardado: {json_file}")

    exportar_excel(proyectos, excel_file)

    duracion = datetime.now() - inicio
    print("\n" + "╔" + "═" * 58 + "╗")
    print("║   RESUMEN FINAL                                          ║")
    print("╠" + "═" * 58 + "╣")
    print(f"║  Proyectos extraídos : {len(proyectos):<33}║")
    print(f"║  Páginas procesadas  : {len(ya_procesadas):<33}║")
    #print(f"║  DB — nuevos         : {stats.get('nuevos', 0):<33}║")
    #print(f"║  DB — duplicados     : {stats.get('duplicados', 0):<33}║")
    #print(f"║  DB — errores        : {stats.get('errores', 0):<33}║")
    print(f"║  JSON                : {json_file:<33}║")
    print(f"║  Excel               : {excel_file:<33}║")
    print(f"║  Duración total      : {str(duracion).split('.')[0]:<33}║")
    print("╚" + "═" * 58 + "╝")


if __name__ == "__main__":
    asyncio.run(main())