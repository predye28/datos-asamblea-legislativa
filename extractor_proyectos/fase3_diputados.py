import asyncio
import re
import urllib.parse
import requests
from bs4 import BeautifulSoup
from datetime import datetime
from playwright.async_api import async_playwright
from sync_engine import crear_tablas, sync_partidos_y_diputados

URL_BASE = "https://www.asamblea.go.cr/Centro_de_informacion/Consultas_SIL/Pginas/Hist%C3%B3rico%20de%20diputadas%20y%20diputados%20por%20administraci%C3%B3n.aspx"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0"
    ),
}


# ---------------------------------------------------------------------------
# Helpers: leer ConfigurationField y generar encoded
# ---------------------------------------------------------------------------

def encoded_desde_config(config_value: str, label: str) -> str:
    """Valor doble-codificado para el campo Selection a partir del ConfigurationField."""
    for entry in config_value.split("&"):
        if "=" not in entry:
            continue
        _, raw_label = entry.split("=", 1)
        if urllib.parse.unquote(raw_label) == label:
            return urllib.parse.quote(entry, safe="")
    return ""


def leer_config_desde_html(html: str) -> str:
    """Extrae el ConfigurationField del HTML (tiene todos los códigos y labels)."""
    soup = BeautifulSoup(html, "html.parser")
    cfg = soup.find("input", id=re.compile(r"_ConfigurationField$"))
    return cfg.get("value", "") if cfg else ""


# ---------------------------------------------------------------------------
# Extracción de links de diputados de un HTML
# ---------------------------------------------------------------------------

def extraer_links_diputados(html: str) -> list:
    soup = BeautifulSoup(html, "html.parser")
    links, seen = [], set()
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if "ActionRedirect.aspx" in href and (
            "EntityName=Diputado" in href or "EntityName%3DDiputado" in href
        ):
            if href.startswith("/"):
                href = "https://www.asamblea.go.cr" + href
            if href not in seen:
                seen.add(href)
                links.append(href)
    return links


# ---------------------------------------------------------------------------
# Aplicar filtro desde Playwright — sin popup, llamada directa a JS de la página
# ---------------------------------------------------------------------------

async def aplicar_filtro_playwright(main_page, admin_label: str, config_value: str) -> bool:
    """
    Llama PickerDialogCallback_..._ChoicePicker(rv) directamente en el contexto
    de la página padre. Esto evita el problema de cross-window que tiene el popup.
    La función ya hace PickerDialogCallbackHelper + __doPostBack en el mismo contexto.
    """
    encoded = encoded_desde_config(config_value, admin_label)
    if not encoded:
        print(f"  No se encontró encoded para '{admin_label}'.")
        return False

    # Buscar el nombre de la función PickerDialogCallback en el contexto de la página
    fn_name = await main_page.evaluate("""() => {
        for (var name in window) {
            if (name.startsWith('PickerDialogCallback_') && name.includes('ChoicePicker')) {
                return name;
            }
        }
        return '';
    }""")

    if not fn_name:
        print("  No se encontró PickerDialogCallback en la página.")
        return False

    print(f"  Llamando {fn_name}('{encoded[:40]}...')")

    try:
        async with main_page.expect_navigation(timeout=20000):
            await main_page.evaluate(f"window['{fn_name}']('{encoded}')")
    except Exception as e:
        print(f"  Aviso en navegación: {e}")

    await main_page.wait_for_load_state("domcontentloaded", timeout=20000)
    return True


# ---------------------------------------------------------------------------
# Esperar y extraer diputados de la página actual en Playwright
# ---------------------------------------------------------------------------

async def esperar_y_extraer_links(main_page, max_espera_s: int = 12) -> list:
    """Espera a que el WebPart de diputados cargue (es asíncrono) y extrae los links."""
    for _ in range(max_espera_s):
        html = await main_page.content()
        links = extraer_links_diputados(html)
        if links:
            return links
        await main_page.wait_for_timeout(1000)
    return []


# ---------------------------------------------------------------------------
# Extracción de perfil individual
# ---------------------------------------------------------------------------

async def extract_deputy_data(context, url: str) -> dict:
    page = await context.new_page()
    dip_data = {}
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_timeout(3000)

        texto_pagina = await page.locator("body").inner_text()

        def extract_regex(label):
            match = re.search(rf"{label}:?[ \t]*([^\n\r]+)", texto_pagina, re.IGNORECASE)
            return match.group(1).strip() if match else ""

        dip_data["apellidos"] = extract_regex("Apellidos")
        dip_data["nombre"] = extract_regex("Nombre")
        dip_data["administracion"] = extract_regex("Administración")
        dip_data["fecha_nacimiento"] = extract_regex("Fecha de nacimiento")
        dip_data["provincia"] = extract_regex("Provincia")
        dip_data["fecha_retiro"] = extract_regex("Fecha de retiro")

        fracciones = []
        wp = page.locator(
            "xpath=//h3[contains(., 'Fracción')]/ancestor::table[1]"
            "/following-sibling::div//table[@id='BdwpRows'] | "
            "//*[contains(text(), 'Fracción')]"
            "/ancestor::div[contains(@class, 'ms-webpart-zone')]//table"
        )
        tables = wp if await wp.count() > 0 else page.locator("table#BdwpRows")

        for i in range(await tables.count()):
            table = tables.nth(i)
            rows = await table.locator("tr").all()
            for row in rows:
                cells = await row.locator("td.ms-vb").all()
                if len(cells) >= 4:
                    offset = 1 if len(cells) >= 5 else 0
                    codigo = (await cells[offset].inner_text()).strip()
                    nombre  = (await cells[offset + 1].inner_text()).strip()
                    desde   = (await cells[offset + 2].inner_text()).strip()
                    hasta   = (await cells[offset + 3].inner_text()).strip()

                    if codigo and codigo.lower() != "código" and nombre.lower() != "nombre":
                        if (
                            len(codigo) <= 6
                            and not any(c.isdigit() for c in codigo)
                            and "órgano" not in codigo.lower()
                            and "asunto" not in codigo.lower()
                            and "descripción" not in codigo.lower()
                        ):
                            fracciones.append({
                                "codigo": codigo,
                                "nombre": nombre,
                                "desde": desde.split(" ")[0] if desde else "",
                                "hasta": hasta.split(" ")[0] if hasta else "",
                            })

        dip_data["fracciones"] = fracciones

    except Exception as e:
        print(f"  Error extrayendo {url}: {e}")
    finally:
        await page.close()

    return dip_data


# ---------------------------------------------------------------------------
# Scraper principal
# ---------------------------------------------------------------------------

async def run_scraper():
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Iniciando scraper de diputados...")
    crear_tablas()

    # Leer ConfigurationField (tiene todos los códigos de administración)
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    resp = requests.get(URL_BASE, headers=HEADERS, timeout=30, verify=False)
    config_value = leer_config_desde_html(resp.text)
    if not config_value:
        print("ERROR: No se pudo leer ConfigurationField.")
        return
    print(f"ConfigurationField leído ({len(config_value.split('&'))} administraciones).")

    # Las administraciones en orden
    ADMINISTRACIONES = [
        "2022 - 2026", "2018 - 2022", "2014 - 2018", "2010 - 2014",
        "2006 - 2010", "2002 - 2006", "1998 - 2002", "1994 - 1998",
        "1990 - 1994", "1986 - 1990", "1982 - 1986", "1978 - 1982",
        "1974 - 1978", "1970 - 1974", "1966 - 1970", "1962 - 1966",
        "1958 - 1962", "1953 - 1958", "1948 - 1953",
    ]

    all_diputados = []

    async with async_playwright() as p:
        try:
            browser = await p.chromium.launch(headless=False, channel="msedge")
            print("Usando Microsoft Edge.")
        except Exception:
            browser = await p.chromium.launch(headless=False)
            print("Usando Chromium.")

        context = await browser.new_context()
        await context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined});"
        )
        main_page = await context.new_page()

        print("Navegando a la página principal...")
        await main_page.goto(URL_BASE, timeout=60000)
        await main_page.wait_for_load_state("domcontentloaded")

        for i, admin_label in enumerate(ADMINISTRACIONES):
            print(f"\n=== Administración {i+1}/{len(ADMINISTRACIONES)}: {admin_label} ===")

            if i == 0:
                # Primera admin es la default — solo esperar que cargue
                print("  (administración por defecto, esperando carga...)")
                await main_page.wait_for_timeout(2000)
            else:
                # Navegar fresco y aplicar filtro via PickerDialogCallback
                await main_page.goto(URL_BASE, timeout=60000)
                await main_page.wait_for_load_state("domcontentloaded")
                await main_page.wait_for_timeout(1500)
                ok = await aplicar_filtro_playwright(main_page, admin_label, config_value)
                if not ok:
                    print("  Falló aplicar filtro, saltando.")
                    continue
                await main_page.wait_for_timeout(2000)

            links = await esperar_y_extraer_links(main_page, max_espera_s=15)
            print(f"  Links encontrados: {len(links)}")

            for j, url in enumerate(links):
                print(f"  [{j+1}/{len(links)}] {url[:80]}...")
                dip = await extract_deputy_data(context, url)

                if dip.get("apellidos") and dip.get("nombre"):
                    all_diputados.append(dip)
                    print(f"    ✓ {dip['nombre']} {dip['apellidos']} | Fracciones: {len(dip.get('fracciones', []))}")
                else:
                    print("    x Sin datos básicos.")

            print(f"  Total acumulado: {len(all_diputados)} diputados.")

        await browser.close()

    print(f"\nTotal final: {len(all_diputados)} diputados.")

    import json
    print("\n--- RESULTADO ---")
    print(json.dumps(all_diputados, indent=2, ensure_ascii=False))

    if all_diputados:
        sync_partidos_y_diputados(all_diputados)


if __name__ == "__main__":
    asyncio.run(run_scraper())
