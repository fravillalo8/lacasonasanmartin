#!/usr/bin/env python3
"""Seed completo con re-autenticación automática."""
import requests, sys, time

BASE = "https://observant-smile-production-dc50.up.railway.app/api"
PIN = "1234"

_token = None

def login():
    global _token
    r = requests.post(f"{BASE}/auth/login", json={"pin": PIN})
    if not r.ok:
        print(f"Login fallido: {r.text}"); sys.exit(1)
    _token = r.json()["token"]
    return _token

def headers():
    return {"Authorization": f"Bearer {_token}"}

def post(path, data, retries=2):
    for i in range(retries + 1):
        r = requests.post(f"{BASE}{path}", json=data, headers=headers())
        if r.status_code == 401:
            login()
            continue
        return r
    return r

def get(path, retries=2):
    for i in range(retries + 1):
        r = requests.get(f"{BASE}{path}", headers=headers())
        if r.status_code == 401:
            login()
            continue
        return r
    return r

def delete(path, retries=2):
    for i in range(retries + 1):
        r = requests.delete(f"{BASE}{path}", headers=headers())
        if r.status_code == 401:
            login()
            continue
        return r
    return r

login()
print(f"✓ Login OK\n")

# ─── PROVEEDORES ─────────────────────────────────────────────────────────────
print("── Proveedores ──")
PROVEEDORES = [
    {"nombre":"Jumbo Los Andes",          "tipo":"supermercado","telefono":"+56 34 2442 100","contacto":"","direccion":"Av. Freire 850, Los Andes","notas":"Mejor precio en lácteos, aceites y condimentos."},
    {"nombre":"Unimarc Los Andes",        "tipo":"supermercado","telefono":"","contacto":"","direccion":"Los Andes","notas":"Comparar ofertas semanales."},
    {"nombre":"Mercado Municipal Los Andes","tipo":"feria",     "telefono":"","contacto":"","direccion":"Av. Independencia s/n, Los Andes","notas":"Mejor precio en verduras. Martes y viernes."},
    {"nombre":"Distribuidora Árabe Santiago","tipo":"distribuidor","telefono":"+56 9 0000 0000","contacto":"","direccion":"Santiago","notas":"Especialista árabe: pan pita, especias, tahini. Despacho a Los Andes."},
]

existing = get("/proveedores").json()
if isinstance(existing, list):
    existing_names = {p["nombre"] for p in existing}
else:
    existing_names = set()
prov_map = {p["nombre"]: p["id"] for p in (existing if isinstance(existing, list) else [])}

for p in PROVEEDORES:
    if p["nombre"] in existing_names:
        print(f"  — ya existe: {p['nombre']}")
    else:
        r = post("/proveedores", p)
        if r.ok:
            prov_map[p["nombre"]] = r.json()["id"]
            print(f"  ✓ {p['nombre']}")
        else:
            print(f"  ✗ {p['nombre']}: {r.text[:80]}")

print(f"  Mapa proveedores: {list(prov_map.keys())}\n")

# ─── INGREDIENTES ─────────────────────────────────────────────────────────────
print("── Ingredientes ──")
INGREDIENTES = [
    {"nombre":"Carne de pollo",          "unidad":"kg",     "stock":10,"stock_minimo":5,   "costo_unitario":4200,"categoria":"Carnes"},
    {"nombre":"Carne de vacuno",         "unidad":"kg",     "stock":5, "stock_minimo":3,   "costo_unitario":7200,"categoria":"Carnes"},
    {"nombre":"Carne de cordero",        "unidad":"kg",     "stock":3, "stock_minimo":2,   "costo_unitario":12000,"categoria":"Carnes"},
    {"nombre":"Carne mixta shawarma",    "unidad":"kg",     "stock":8, "stock_minimo":4,   "costo_unitario":5500,"categoria":"Carnes"},
    {"nombre":"Pan pita",                "unidad":"unidad", "stock":100,"stock_minimo":40, "costo_unitario":380, "categoria":"Panadería"},
    {"nombre":"Pan árabe grande",        "unidad":"unidad", "stock":50,"stock_minimo":20,  "costo_unitario":450, "categoria":"Panadería"},
    {"nombre":"Cebolla",                 "unidad":"kg",     "stock":8, "stock_minimo":3,   "costo_unitario":800, "categoria":"Verduras"},
    {"nombre":"Tomate",                  "unidad":"kg",     "stock":6, "stock_minimo":3,   "costo_unitario":1200,"categoria":"Verduras"},
    {"nombre":"Lechuga",                 "unidad":"kg",     "stock":3, "stock_minimo":1,   "costo_unitario":900, "categoria":"Verduras"},
    {"nombre":"Pepino",                  "unidad":"kg",     "stock":4, "stock_minimo":2,   "costo_unitario":1500,"categoria":"Verduras"},
    {"nombre":"Repollo",                 "unidad":"kg",     "stock":5, "stock_minimo":2,   "costo_unitario":700, "categoria":"Verduras"},
    {"nombre":"Perejil",                 "unidad":"kg",     "stock":1, "stock_minimo":0.5, "costo_unitario":2000,"categoria":"Verduras"},
    {"nombre":"Limón",                   "unidad":"kg",     "stock":3, "stock_minimo":1,   "costo_unitario":1600,"categoria":"Verduras"},
    {"nombre":"Ajo",                     "unidad":"kg",     "stock":2, "stock_minimo":0.5, "costo_unitario":4000,"categoria":"Verduras"},
    {"nombre":"Papas",                   "unidad":"kg",     "stock":10,"stock_minimo":5,   "costo_unitario":1000,"categoria":"Verduras"},
    {"nombre":"Berenjenas",              "unidad":"kg",     "stock":2, "stock_minimo":1,   "costo_unitario":1800,"categoria":"Verduras"},
    {"nombre":"Tahini",                  "unidad":"kg",     "stock":3, "stock_minimo":1,   "costo_unitario":8000,"categoria":"Salsas"},
    {"nombre":"Yogur natural",           "unidad":"lt",     "stock":4, "stock_minimo":2,   "costo_unitario":2600,"categoria":"Lácteos"},
    {"nombre":"Mayonesa",                "unidad":"kg",     "stock":3, "stock_minimo":1,   "costo_unitario":3200,"categoria":"Salsas"},
    {"nombre":"Queso blanco",            "unidad":"kg",     "stock":2, "stock_minimo":1,   "costo_unitario":8500,"categoria":"Lácteos"},
    {"nombre":"Crema de leche",          "unidad":"lt",     "stock":2, "stock_minimo":1,   "costo_unitario":2800,"categoria":"Lácteos"},
    {"nombre":"Aceite vegetal",          "unidad":"lt",     "stock":5, "stock_minimo":2,   "costo_unitario":2700,"categoria":"Aceites"},
    {"nombre":"Aceite de oliva",         "unidad":"lt",     "stock":2, "stock_minimo":0.5, "costo_unitario":8200,"categoria":"Aceites"},
    {"nombre":"Comino molido",           "unidad":"kg",     "stock":0.5,"stock_minimo":0.2,"costo_unitario":5000,"categoria":"Especias"},
    {"nombre":"Paprika",                 "unidad":"kg",     "stock":0.5,"stock_minimo":0.2,"costo_unitario":5500,"categoria":"Especias"},
    {"nombre":"Cúrcuma",                 "unidad":"kg",     "stock":0.3,"stock_minimo":0.1,"costo_unitario":7000,"categoria":"Especias"},
    {"nombre":"Canela molida",           "unidad":"kg",     "stock":0.3,"stock_minimo":0.1,"costo_unitario":6000,"categoria":"Especias"},
    {"nombre":"Pimienta negra",          "unidad":"kg",     "stock":0.3,"stock_minimo":0.1,"costo_unitario":7500,"categoria":"Especias"},
    {"nombre":"Cardamomo molido",        "unidad":"kg",     "stock":0.2,"stock_minimo":0.1,"costo_unitario":19000,"categoria":"Especias"},
    {"nombre":"Mezcla especias shawarma","unidad":"kg",     "stock":0.5,"stock_minimo":0.2,"costo_unitario":6500,"categoria":"Especias"},
    {"nombre":"Sal",                     "unidad":"kg",     "stock":3, "stock_minimo":1,   "costo_unitario":500, "categoria":"Especias"},
    {"nombre":"Arroz",                   "unidad":"kg",     "stock":5, "stock_minimo":2,   "costo_unitario":1150,"categoria":"Granos"},
    {"nombre":"Garbanzos secos",         "unidad":"kg",     "stock":3, "stock_minimo":1,   "costo_unitario":2200,"categoria":"Granos"},
    {"nombre":"Aceitunas negras",        "unidad":"kg",     "stock":1, "stock_minimo":0.5, "costo_unitario":6500,"categoria":"Conservas"},
    {"nombre":"Pepinillos encurtidos",   "unidad":"kg",     "stock":1, "stock_minimo":0.5, "costo_unitario":4500,"categoria":"Conservas"},
    {"nombre":"Vinagre blanco",          "unidad":"lt",     "stock":1, "stock_minimo":0.5, "costo_unitario":900, "categoria":"Condimentos"},
    {"nombre":"Azúcar",                 "unidad":"kg",     "stock":2, "stock_minimo":0.5, "costo_unitario":900, "categoria":"Condimentos"},
    {"nombre":"Agua mineral 500ml",      "unidad":"unidad", "stock":24,"stock_minimo":12,  "costo_unitario":450, "categoria":"Bebidas"},
    {"nombre":"Bebida lata 350ml",       "unidad":"unidad", "stock":24,"stock_minimo":12,  "costo_unitario":700, "categoria":"Bebidas"},
    {"nombre":"Jugo natural (naranja)",  "unidad":"lt",     "stock":3, "stock_minimo":1,   "costo_unitario":2500,"categoria":"Bebidas"},
]

existing_ings = get("/ingredientes").json()
existing_ing_names = {i["nombre"] for i in (existing_ings if isinstance(existing_ings,list) else [])}
ing_map = {i["nombre"]: i["id"] for i in (existing_ings if isinstance(existing_ings,list) else [])}

for ing in INGREDIENTES:
    if ing["nombre"] in existing_ing_names:
        ing_map[ing["nombre"]] = next(i["id"] for i in existing_ings if i["nombre"]==ing["nombre"])
        continue
    r = post("/ingredientes", ing)
    if r.ok:
        ing_map[ing["nombre"]] = r.json()["id"]
        print(f"  ✓ {ing['nombre']}")
    else:
        print(f"  ✗ {ing['nombre']}: {r.text[:80]}")

print(f"  Total ingredientes mapeados: {len(ing_map)}\n")

# ─── PRECIOS POR PROVEEDOR ────────────────────────────────────────────────────
print("── Precios por proveedor ──")
JUMBO   = prov_map.get("Jumbo Los Andes")
UNIMARC = prov_map.get("Unimarc Los Andes")
MERCADO = prov_map.get("Mercado Municipal Los Andes")
ARABE   = prov_map.get("Distribuidora Árabe Santiago")

PRECIOS = [
    (JUMBO,"Carne de pollo",4500),(UNIMARC,"Carne de pollo",4200),(MERCADO,"Carne de pollo",3900),
    (JUMBO,"Carne de vacuno",7800),(UNIMARC,"Carne de vacuno",7400),(MERCADO,"Carne de vacuno",6900),
    (ARABE,"Carne de cordero",11500),(JUMBO,"Carne de cordero",13500),
    (ARABE,"Carne mixta shawarma",5200),
    (ARABE,"Pan pita",350),(JUMBO,"Pan pita",550),
    (ARABE,"Pan árabe grande",420),(JUMBO,"Pan árabe grande",650),
    (JUMBO,"Cebolla",1200),(UNIMARC,"Cebolla",1100),(MERCADO,"Cebolla",700),
    (JUMBO,"Tomate",1800),(UNIMARC,"Tomate",1600),(MERCADO,"Tomate",1100),
    (JUMBO,"Lechuga",1300),(MERCADO,"Lechuga",850),
    (JUMBO,"Pepino",2100),(MERCADO,"Pepino",1400),
    (JUMBO,"Repollo",950),(MERCADO,"Repollo",600),
    (JUMBO,"Perejil",2500),(MERCADO,"Perejil",1800),
    (JUMBO,"Limón",2300),(MERCADO,"Limón",1400),
    (JUMBO,"Ajo",5200),(MERCADO,"Ajo",3500),
    (JUMBO,"Papas",1500),(UNIMARC,"Papas",1400),(MERCADO,"Papas",900),
    (JUMBO,"Berenjenas",2200),(MERCADO,"Berenjenas",1500),
    (ARABE,"Tahini",7500),(JUMBO,"Tahini",13500),
    (JUMBO,"Yogur natural",2900),(UNIMARC,"Yogur natural",2600),
    (JUMBO,"Mayonesa",3600),(UNIMARC,"Mayonesa",3300),
    (JUMBO,"Queso blanco",9000),(UNIMARC,"Queso blanco",8500),(ARABE,"Queso blanco",7500),
    (JUMBO,"Crema de leche",3200),(UNIMARC,"Crema de leche",2900),
    (JUMBO,"Aceite vegetal",2900),(UNIMARC,"Aceite vegetal",2700),
    (JUMBO,"Aceite de oliva",8900),(UNIMARC,"Aceite de oliva",8400),(ARABE,"Aceite de oliva",7800),
    (ARABE,"Comino molido",4200),(JUMBO,"Comino molido",8500),
    (ARABE,"Paprika",4800),(JUMBO,"Paprika",9500),
    (ARABE,"Cúrcuma",6200),(JUMBO,"Cúrcuma",12000),
    (ARABE,"Canela molida",5500),(JUMBO,"Canela molida",10500),
    (ARABE,"Pimienta negra",6500),(JUMBO,"Pimienta negra",12000),
    (ARABE,"Cardamomo molido",18000),
    (ARABE,"Mezcla especias shawarma",5800),
    (JUMBO,"Sal",520),(UNIMARC,"Sal",480),
    (JUMBO,"Arroz",1300),(UNIMARC,"Arroz",1150),
    (ARABE,"Garbanzos secos",2000),(JUMBO,"Garbanzos secos",2800),
    (ARABE,"Aceitunas negras",6000),(JUMBO,"Aceitunas negras",9800),
    (JUMBO,"Pepinillos encurtidos",4800),(UNIMARC,"Pepinillos encurtidos",4500),
    (JUMBO,"Vinagre blanco",1100),(UNIMARC,"Vinagre blanco",950),
    (JUMBO,"Azúcar",1000),(UNIMARC,"Azúcar",950),
    (JUMBO,"Agua mineral 500ml",480),(UNIMARC,"Agua mineral 500ml",450),
    (JUMBO,"Bebida lata 350ml",750),(UNIMARC,"Bebida lata 350ml",720),
    (MERCADO,"Jugo natural (naranja)",2200),(JUMBO,"Jugo natural (naranja)",3000),
]

ok = err = 0
for prov_id, ing_nombre, precio in PRECIOS:
    ing_id = ing_map.get(ing_nombre)
    if not ing_id or not prov_id:
        err += 1
        continue
    r = post(f"/proveedores/{prov_id}/precios", {"ingrediente_id": ing_id, "precio": precio})
    if r.ok:
        ok += 1
    else:
        print(f"  ✗ {ing_nombre}@{prov_id}: {r.text[:60]}")
        err += 1

print(f"  ✓ {ok} precios, {err} errores\n")

# ─── PRODUCTOS ────────────────────────────────────────────────────────────────
print("── Productos (carta) ──")
PRODUCTOS = [
    {"nombre":"Shawarma Pollo",          "precio":5500, "categoria":"Shawarma",         "descripcion":"Shawarma de pollo marinado con especias árabes, salsa de ajo y vegetales frescos"},
    {"nombre":"Shawarma Vacuno",         "precio":6500, "categoria":"Shawarma",         "descripcion":"Shawarma de vacuno con cebolla caramelizada, tomate y salsa tahini"},
    {"nombre":"Shawarma Mixto",          "precio":6500, "categoria":"Shawarma",         "descripcion":"Mezcla de pollo y vacuno con todos los acompañamientos árabes"},
    {"nombre":"Shawarma Cordero",        "precio":8500, "categoria":"Shawarma",         "descripcion":"Shawarma premium de cordero con especias tradicionales y yogur"},
    {"nombre":"Bandeja Shawarma Pollo",  "precio":7500, "categoria":"Bandeja",          "descripcion":"Shawarma de pollo en plato con arroz árabe y ensaladas"},
    {"nombre":"Bandeja Shawarma Vacuno", "precio":8500, "categoria":"Bandeja",          "descripcion":"Shawarma de vacuno en plato con arroz, ensalada árabe y salsas"},
    {"nombre":"Combo Shawarma + Bebida", "precio":6900, "categoria":"Combos",           "descripcion":"Shawarma de pollo + bebida lata o agua"},
    {"nombre":"Combo Familiar (4 unit)", "precio":20000,"categoria":"Combos",           "descripcion":"4 shawarmas de pollo con salsas y extras"},
    {"nombre":"Hummus con Pan Pita",     "precio":3500, "categoria":"Entradas",         "descripcion":"Hummus casero con aceite de oliva y 2 panes pita"},
    {"nombre":"Ensalada Árabe",          "precio":3500, "categoria":"Entradas",         "descripcion":"Tomate, pepino, perejil, limón y aceite de oliva"},
    {"nombre":"Papas Fritas",            "precio":2500, "categoria":"Acompañamientos",  "descripcion":"Papas fritas crujientes"},
    {"nombre":"Agua Mineral 500ml",      "precio":1200, "categoria":"Bebidas",          "descripcion":"Agua mineral natural"},
    {"nombre":"Bebida Lata",             "precio":1500, "categoria":"Bebidas",          "descripcion":"Coca-Cola, Sprite o Fanta"},
    {"nombre":"Jugo Natural",            "precio":2500, "categoria":"Bebidas",          "descripcion":"Jugo de naranja natural"},
]

existing_prods = get("/productos").json()
existing_prod_names = {p["nombre"] for p in (existing_prods if isinstance(existing_prods,list) else [])}

for prod in PRODUCTOS:
    if prod["nombre"] in existing_prod_names:
        print(f"  — ya existe: {prod['nombre']}")
        continue
    r = post("/productos", prod)
    if r.ok:
        print(f"  ✓ {prod['nombre']} — ${prod['precio']:,}")
    else:
        print(f"  ✗ {prod['nombre']}: {r.text[:80]}")

print()

# ─── RECETAS ──────────────────────────────────────────────────────────────────
print("── Recetas ──")
def I(n): return ing_map.get(n)

RECETAS = [
    {"nombre":"Shawarma de Pollo","descripcion":"Receta base 1 shawarma pollo","precio_venta":5500,"porciones":1,"categoria":"Shawarma","items":[
        {"ingrediente_id":I("Carne de pollo"),"cantidad":0.18},
        {"ingrediente_id":I("Pan pita"),"cantidad":1},
        {"ingrediente_id":I("Cebolla"),"cantidad":0.04},
        {"ingrediente_id":I("Tomate"),"cantidad":0.05},
        {"ingrediente_id":I("Lechuga"),"cantidad":0.03},
        {"ingrediente_id":I("Pepino"),"cantidad":0.03},
        {"ingrediente_id":I("Tahini"),"cantidad":0.02},
        {"ingrediente_id":I("Yogur natural"),"cantidad":0.03},
        {"ingrediente_id":I("Ajo"),"cantidad":0.005},
        {"ingrediente_id":I("Limón"),"cantidad":0.02},
        {"ingrediente_id":I("Mezcla especias shawarma"),"cantidad":0.008},
        {"ingrediente_id":I("Aceite vegetal"),"cantidad":0.015},
        {"ingrediente_id":I("Sal"),"cantidad":0.005},
    ]},
    {"nombre":"Shawarma de Vacuno","descripcion":"Receta base 1 shawarma vacuno","precio_venta":6500,"porciones":1,"categoria":"Shawarma","items":[
        {"ingrediente_id":I("Carne de vacuno"),"cantidad":0.18},
        {"ingrediente_id":I("Pan pita"),"cantidad":1},
        {"ingrediente_id":I("Cebolla"),"cantidad":0.05},
        {"ingrediente_id":I("Tomate"),"cantidad":0.05},
        {"ingrediente_id":I("Repollo"),"cantidad":0.04},
        {"ingrediente_id":I("Pepinillos encurtidos"),"cantidad":0.03},
        {"ingrediente_id":I("Tahini"),"cantidad":0.025},
        {"ingrediente_id":I("Mayonesa"),"cantidad":0.02},
        {"ingrediente_id":I("Ajo"),"cantidad":0.005},
        {"ingrediente_id":I("Mezcla especias shawarma"),"cantidad":0.008},
        {"ingrediente_id":I("Aceite vegetal"),"cantidad":0.015},
        {"ingrediente_id":I("Sal"),"cantidad":0.005},
    ]},
    {"nombre":"Shawarma Mixto","descripcion":"Mezcla pollo y vacuno","precio_venta":6500,"porciones":1,"categoria":"Shawarma","items":[
        {"ingrediente_id":I("Carne de pollo"),"cantidad":0.09},
        {"ingrediente_id":I("Carne de vacuno"),"cantidad":0.09},
        {"ingrediente_id":I("Pan pita"),"cantidad":1},
        {"ingrediente_id":I("Cebolla"),"cantidad":0.04},
        {"ingrediente_id":I("Tomate"),"cantidad":0.04},
        {"ingrediente_id":I("Lechuga"),"cantidad":0.03},
        {"ingrediente_id":I("Tahini"),"cantidad":0.02},
        {"ingrediente_id":I("Yogur natural"),"cantidad":0.02},
        {"ingrediente_id":I("Mayonesa"),"cantidad":0.015},
        {"ingrediente_id":I("Mezcla especias shawarma"),"cantidad":0.008},
        {"ingrediente_id":I("Aceite vegetal"),"cantidad":0.015},
        {"ingrediente_id":I("Sal"),"cantidad":0.005},
    ]},
    {"nombre":"Shawarma de Cordero","descripcion":"Shawarma premium cordero","precio_venta":8500,"porciones":1,"categoria":"Shawarma","items":[
        {"ingrediente_id":I("Carne de cordero"),"cantidad":0.18},
        {"ingrediente_id":I("Pan árabe grande"),"cantidad":1},
        {"ingrediente_id":I("Cebolla"),"cantidad":0.04},
        {"ingrediente_id":I("Tomate"),"cantidad":0.05},
        {"ingrediente_id":I("Perejil"),"cantidad":0.02},
        {"ingrediente_id":I("Yogur natural"),"cantidad":0.04},
        {"ingrediente_id":I("Tahini"),"cantidad":0.025},
        {"ingrediente_id":I("Limón"),"cantidad":0.025},
        {"ingrediente_id":I("Ajo"),"cantidad":0.005},
        {"ingrediente_id":I("Comino molido"),"cantidad":0.005},
        {"ingrediente_id":I("Canela molida"),"cantidad":0.003},
        {"ingrediente_id":I("Cardamomo molido"),"cantidad":0.002},
        {"ingrediente_id":I("Aceite de oliva"),"cantidad":0.02},
        {"ingrediente_id":I("Sal"),"cantidad":0.005},
    ]},
    {"nombre":"Bandeja Shawarma Pollo","descripcion":"Pollo en plato con arroz y ensalada","precio_venta":7500,"porciones":1,"categoria":"Bandeja","items":[
        {"ingrediente_id":I("Carne de pollo"),"cantidad":0.20},
        {"ingrediente_id":I("Pan pita"),"cantidad":1},
        {"ingrediente_id":I("Arroz"),"cantidad":0.08},
        {"ingrediente_id":I("Cebolla"),"cantidad":0.04},
        {"ingrediente_id":I("Tomate"),"cantidad":0.06},
        {"ingrediente_id":I("Perejil"),"cantidad":0.015},
        {"ingrediente_id":I("Limón"),"cantidad":0.02},
        {"ingrediente_id":I("Tahini"),"cantidad":0.03},
        {"ingrediente_id":I("Aceitunas negras"),"cantidad":0.02},
        {"ingrediente_id":I("Mezcla especias shawarma"),"cantidad":0.008},
        {"ingrediente_id":I("Aceite de oliva"),"cantidad":0.015},
        {"ingrediente_id":I("Sal"),"cantidad":0.005},
    ]},
    {"nombre":"Hummus con Pan Pita","descripcion":"Hummus casero con 2 panes pita","precio_venta":3500,"porciones":1,"categoria":"Entradas","items":[
        {"ingrediente_id":I("Garbanzos secos"),"cantidad":0.08},
        {"ingrediente_id":I("Tahini"),"cantidad":0.03},
        {"ingrediente_id":I("Ajo"),"cantidad":0.005},
        {"ingrediente_id":I("Limón"),"cantidad":0.04},
        {"ingrediente_id":I("Aceite de oliva"),"cantidad":0.02},
        {"ingrediente_id":I("Comino molido"),"cantidad":0.003},
        {"ingrediente_id":I("Sal"),"cantidad":0.005},
        {"ingrediente_id":I("Pan pita"),"cantidad":2},
    ]},
]

existing_recs = get("/recetas").json()
existing_rec_names = {r["nombre"] for r in (existing_recs if isinstance(existing_recs,list) else [])}

for rec in RECETAS:
    if rec["nombre"] in existing_rec_names:
        print(f"  — ya existe: {rec['nombre']}")
        continue
    items_ok = [it for it in rec["items"] if it["ingrediente_id"] is not None]
    r = post("/recetas", {**rec, "items": items_ok})
    if r.ok:
        d = r.json()
        print(f"  ✓ {rec['nombre']} — costo ${d.get('costo_porcion',0):,.0f} / venta ${rec['precio_venta']:,} / margen {d.get('margen_pct',0):.0f}%")
    else:
        print(f"  ✗ {rec['nombre']}: {r.text[:80]}")

# ─── MESAS ────────────────────────────────────────────────────────────────────
print("\n── Mesas ──")
MESAS = [
    {"numero":1,"nombre":"Mesa 1","capacidad":4},
    {"numero":2,"nombre":"Mesa 2","capacidad":4},
    {"numero":3,"nombre":"Mesa 3","capacidad":2},
    {"numero":4,"nombre":"Mesa 4","capacidad":6},
    {"numero":5,"nombre":"Terraza 1","capacidad":4},
    {"numero":6,"nombre":"Terraza 2","capacidad":4},
]
existing_mesas = get("/mesas").json()
existing_mesa_nums = {m["numero"] for m in (existing_mesas if isinstance(existing_mesas,list) else [])}

for m in MESAS:
    if m["numero"] in existing_mesa_nums:
        print(f"  — ya existe: {m['nombre']}")
        continue
    r = post("/mesas", m)
    if r.ok:
        print(f"  ✓ {m['nombre']}")
    else:
        print(f"  ✗ {m['nombre']}: {r.text[:60]}")

print("\n✅ Seed completo.")