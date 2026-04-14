import csv, collections, json

# ── proyectos.csv ──
print('=== PROYECTOS ===')
with open('exports/proyectos.csv', encoding='utf-8') as f:
    rows = list(csv.DictReader(f))
print(f'Total proyectos: {len(rows)}')

tipos = collections.Counter(r['tipo_expediente'] for r in rows)
print('Tipos de expediente TOP 20:')
for t, c in tipos.most_common(20):
    print(f'  {c:5d}  {t}')

leyes = sum(1 for r in rows if r['numero_ley'] and r['numero_ley'].strip())
print(f'Con numero_ley (Leyes aprobadas): {leyes}')
print(f'Sin numero_ley:                   {len(rows)-leyes}')

# ── proponentes.csv ──
print()
print('=== PROPONENTES ===')
with open('exports/proponentes.csv', encoding='utf-8') as f:
    props = list(csv.DictReader(f))
print(f'Total filas proponentes: {len(props)}')

# top diputados
nombres = collections.Counter()
for p in props:
    nombre = (p.get('apellidos','') + ' ' + p.get('nombre','')).strip()
    if nombre:
        nombres[nombre] += 1
print('Top 10 diputados proponentes:')
for nom, c in nombres.most_common(10):
    print(f'  {c:4d}  {nom}')

# ── tramitacion.csv ──
print()
print('=== TRAMITACION ===')
with open('exports/tramitacion.csv', encoding='utf-8') as f:
    trams = list(csv.DictReader(f))
print(f'Total filas tramitacion: {len(trams)}')

organos = collections.Counter(t['organo'] for t in trams if t.get('organo'))
print('Organos TOP 15:')
for o, c in organos.most_common(15):
    print(f'  {c:5d}  {o}')

tipos_tram = collections.Counter(t['tipo_tramite'] for t in trams if t.get('tipo_tramite'))
print('Tipos de tramite TOP 15:')
for t, c in tipos_tram.most_common(15):
    print(f'  {c:5d}  {t}')

# ── categorias ──
print()
print('=== CATEGORIAS ===')
with open('exports/proyecto_categorias.csv', encoding='utf-8') as f:
    pcs = list(csv.DictReader(f))
with open('exports/categorias.csv', encoding='utf-8') as f:
    cats = {r['id']: r['nombre'] for r in csv.DictReader(f)}

cat_count = collections.Counter(cats.get(pc['categoria_id'],'?') for pc in pcs)
print('Proyectos por categoria:')
for cat, c in cat_count.most_common():
    print(f'  {c:5d}  {cat}')

# ── relaciones ──
print()
print('=== RELACIONES FK ===')
with open('exports/relaciones.json', encoding='utf-8') as f:
    rels = json.load(f)
for r in rels:
    print(f"  {r['tabla_origen']}.{r['columna_origen']} -> {r['tabla_destino']}.{r['columna_destino']} (ON DELETE {r['on_delete']})")
