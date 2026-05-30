#!/usr/bin/env python3
"""
Seed completo para cocina shawarma:
- Ingredientes con stock mínimo y costo actual
- Precios por proveedor (cotizador)
- 6 productos en la carta
- 6 recetas con sus ingredientes
"""
import os, requests, sys

BASE = os.environ.get("API_BASE", "http://localhost:8000/api")
PIN  = os.environ.get("API_PIN", "")
if not PIN:
    print("ERROR: define API_PIN en el entorno antes de ejecutar (nunca uses el PIN real en código)")
    sys.exit(1)

r = requests.post(f"{BASE}/auth/login", json={"pin": PIN})
if not r.ok:
    print("Login fallido"); sys.exit(1)
token = r.json()["token"]
H = {"Authorization": f"Bearer {token}"}
print(f"✓ Login como {r.json()['role']}\n")

# ─── 1. INGREDIENTES ────────────────────────────────────────────────────────
INGREDIENTES = [
    # Carnes
    {"nombre": "Carne de pollo",        "unidad": "kg",  "stock": 10, "stock_minimo": 5,  "costo_unitario": 4200, "categoria": "Carnes"},
    {"nombre": "Carne de vacuno",        "unidad": "kg",  "stock": 5,  "stock_minimo": 3,  "costo_unitario": 7200, "categoria": "Carnes"},
    {"nombre": "Carne de cordero",       "unidad": "kg",  "stock": 3,  "stock_minimo": 2,  "costo_unitario": 12000,"categoria": "Carnes"},
    {"nombre": "Carne mixta shawarma",   "unidad": "kg",  "stock": 8,  "stock_minimo": 4,  "costo_unitario": 5500, "categoria": "Carnes"},
    # Panes
    {"nombre": "Pan pita",               "unidad": "unidad","stock":100,"stock_minimo": 40, "costo_unitario": 380,  "categoria": "Panadería"},
    {"nombre": "Pan árabe grande",       "unidad": "unidad","stock": 50,"stock_minimo": 20, "costo_unitario": 450,  "categoria": "Panadería"},
    # Vegetales
    {"nombre": "Cebolla",               "unidad": "kg",  "stock": 8,  "stock_minimo": 3,  "costo_unitario": 800,  "categoria": "Verduras"},
    {"nombre": "Tomate",                "unidad": "kg",  "stock": 6,  "stock_minimo": 3,  "costo_unitario": 1200, "categoria": "Verduras"},
    {"nombre": "Lechuga",               "unidad": "kg",  "stock": 3,  "stock_minimo": 1,  "costo_unitario": 900,  "categoria": "Verduras"},
    {"nombre": "Pepino",                "unidad": "kg",  "stock": 4,  "stock_minimo": 2,  "costo_unitario": 1500, "categoria": "Verduras"},
    {"nombre": "Repollo",               "unidad": "kg",  "stock": 5,  "stock_minimo": 2,  "costo_unitario": 700,  "categoria": "Verduras"},
    {"nombre": "Perejil",               "unidad": "kg",  "stock": 1,  "stock_minimo": 0.5,"costo_unitario": 2000, "categoria": "Verduras"},
    {"nombre": "Limón",                 "unidad": "kg",  "stock": 3,  "stock_minimo": 1,  "costo_unitario": 1600, "categoria": "Verduras"},
    {"nombre": "Ajo",                   "unidad": "kg",  "stock": 2,  "stock_minimo": 0.5,"costo_unitario": 4000, "categoria": "Verduras"},
    {"nombre": "Papas",                 "unidad": "kg",  "stock": 10, "stock_minimo": 5,  "costo_unitario": 1000, "categoria": "Verduras"},
    {"nombre": "Berenjenas",            "unidad": "kg",  "stock": 2,  "stock_minimo": 1,  "costo_unitario": 1800, "categoria": "Verduras"},
    # Salsas y lácteos
    {"nombre": "Tahini",                "unidad": "kg",  "stock": 3,  "stock_minimo": 1,  "costo_unitario": 8000, "categoria": "Salsas"},
    {"nombre": "Yogur natural",         "unidad": "lt",  "stock": 4,  "stock_minimo": 2,  "costo_unitario": 2600, "categoria": "Lácteos"},
    {"nombre": "Mayonesa",              "unidad": "kg",  "stock": 3,  "stock_minimo": 1,  "costo_unitario": 3200, "categoria": "Salsas"},
    {"nombre": "Queso blanco",          "unidad": "kg",  "stock": 2,  "stock_minimo": 1,  "costo_unitario": 8500, "categoria": "Lácteos"},
    {"nombre": "Crema de leche",        "unidad": "lt",  "stock": 2,  "stock_minimo": 1,  "costo_unitario": 2800, "categoria": "Lácteos"},
    # Aceites
    {"nombre": "Aceite vegetal",        "unidad": "lt",  "stock": 5,  "stock_minimo": 2,  "costo_unitario": 2700, "categoria": "Aceites"},
    {"nombre": "Aceite de oliva",       "unidad": "lt",  "stock": 2,  "stock_minimo": 0.5,"costo_unitario": 8200, "categoria": "Aceites"},
    # Especias
    {"nombre": "Comino molido",         "unidad": "kg",  "stock": 0.5,"stock_minimo": 0.2,"costo_unitario": 5000, "categoria": "Especias"},
    {"nombre": "Paprika",               "unidad": "kg",  "stock": 0.5,"stock_minimo": 0.2,"costo_unitario": 5500, "categoria": "Especias"},
    {"nombre": "Cúrcuma",               "unidad": "kg",  "stock": 0.3,"stock_minimo": 0.1,"costo_unitario": 7000, "categoria": "Especias"},
    {"nombre": "Canela molida",         "unidad": "kg",  "stock": 0.3,"stock_minimo": 0.1,"costo_unitario": 6000, "categoria": "Especias"},
    {"nombre": "Pimienta negra",        "unidad": "kg",  "stock": 0.3,"stock_minimo": 0.1,"costo_unitario": 7500, "categoria": "Especias"},
    {"nombre": "Cardamomo molido",      "unidad": "kg",  "stock": 0.2,"stock_minimo": 0.1,"costo_unitario": 19000,"categoria": "Especias"},
    {"nombre": "Mezcla especias shawarma","unidad":"kg", "stock": 0.5,"stock_minimo": 0.2,"costo_unitario": 6500, "categoria": "Especias"},
    {"nombre": "Sal",                   "unidad": "kg",  "stock": 3,  "stock_minimo": 1,  "costo_unitario": 500,  "categoria": "Especias"},
    # Otros
    {"nombre": "Arroz",                 "unidad": "kg",  "stock": 5,  "stock_minimo": 2,  "costo_unitario": 1150, "categoria": "Granos"},
    {"nombre": "Garbanzos secos",       "unidad": "kg",  "stock": 3,  "stock_minimo": 1,  "costo_unitario": 2200, "categoria": "Granos"},
    {"nombre": "Aceitunas negras",      "unidad": "kg",  "stock": 1,  "stock_minimo": 0.5,"costo_unitario": 6500, "categoria": "Conservas"},
    {"nombre": "Pepinillos encurtidos", "unidad": "kg",  "stock": 1,  "stock_minimo": 0.5,"costo_unitario": 4500, "categoria": "Conservas"},
    {"nombre": "Vinagre blanco",        "unidad": "lt",  "stock": 1,  "stock_minimo": 0.5,"costo_unitario": 900,  "categoria": "Condimentos"},
    {"nombre": "Azúcar",               "unidad": "kg",  "stock": 2,  "stock_minimo": 0.5,"costo_unitario": 900,  "categoria": "Condimentos"},
    # Bebidas
    {"nombre": "Agua mineral 500ml",    "unidad": "unidad","stock":24, "stock_minimo": 12, "costo_unitario": 450,  "categoria": "Bebidas"},
    {"nombre": "Bebida lata 350ml",     "unidad": "unidad","stock":24, "stock_minimo": 12, "costo_unitario": 700,  "categoria": "Bebidas"},
    {"nombre": "Jugo natural (naranja)","unidad": "lt",  "stock": 3,  "stock_minimo": 1,  "costo_unitario": 2500, "categoria": "Bebidas"},
]

# Crear o encontrar ingredientes
print("── Ingredientes ──")
existing_ings = requests.get(f"{BASE}/ingredientes", headers=H).json()
existing_map = {i["nombre"]: i for i in existing_ings}
ing_map = {}  # nombre -> id

for ing in INGREDIENTES:
    if ing["nombre"] in existing_map:
        ing_map[ing["nombre"]] = existing_map[ing["nombre"]]["id"]
        print(f"  — ya existe: {ing['nombre']}")
    else:
        r2 = requests.post(f"{BASE}/ingredientes", json=ing, headers=H)
        if r2.ok:
            ing_map[ing["nombre"]] = r2.json()["id"]
            print(f"  ✓ {ing['nombre']}")
        else:
            print(f"  ✗ {ing['nombre']}: {r2.text}")

print(f"\n  Total ingredientes: {len(ing_map)}\n")

# ─── 2. PRECIOS POR PROVEEDOR ────────────────────────────────────────────────
provs = requests.get(f"{BASE}/proveedores", headers=H).json()
prov_map = {p["nombre"]: p["id"] for p in provs}

# ID helpers
def PI(nombre): return ing_map.get(nombre)
def PV(nombre): return prov_map.get(nombre)

JUMBO  = PV("Jumbo Los Andes")
UNIMARC= PV("Unimarc Los Andes")
MERCADO= PV("Mercado Municipal Los Andes")
ARABE  = PV("Distribuidora Árabe Santiago")

# (proveedor_id, ingrediente_nombre, precio)
PRECIOS = [
    # Carnes — Jumbo y Unimarc, mercado para pollo
    (JUMBO,   "Carne de pollo",         4500),
    (UNIMARC, "Carne de pollo",         4200),
    (MERCADO, "Carne de pollo",         3900),
    (JUMBO,   "Carne de vacuno",        7800),
    (UNIMARC, "Carne de vacuno",        7400),
    (MERCADO, "Carne de vacuno",        6900),
    (ARABE,   "Carne de cordero",      11500),
    (JUMBO,   "Carne de cordero",      13500),
    (ARABE,   "Carne mixta shawarma",   5200),

    # Panes — Distribuidora árabe más barata
    (ARABE,   "Pan pita",                350),
    (JUMBO,   "Pan pita",                550),
    (ARABE,   "Pan árabe grande",        420),
    (JUMBO,   "Pan árabe grande",        650),

    # Verduras — mercado siempre más barato
    (JUMBO,   "Cebolla",               1200),
    (UNIMARC, "Cebolla",               1100),
    (MERCADO, "Cebolla",                700),
    (JUMBO,   "Tomate",                1800),
    (UNIMARC, "Tomate",                1600),
    (MERCADO, "Tomate",                1100),
    (JUMBO,   "Lechuga",               1300),
    (MERCADO, "Lechuga",                850),
    (JUMBO,   "Pepino",                2100),
    (MERCADO, "Pepino",                1400),
    (JUMBO,   "Repollo",                950),
    (MERCADO, "Repollo",                600),
    (JUMBO,   "Perejil",               2500),
    (MERCADO, "Perejil",               1800),
    (JUMBO,   "Limón",                 2300),
    (MERCADO, "Limón",                 1400),
    (JUMBO,   "Ajo",                   5200),
    (MERCADO, "Ajo",                   3500),
    (JUMBO,   "Papas",                 1500),
    (UNIMARC, "Papas",                 1400),
    (MERCADO, "Papas",                  900),
    (JUMBO,   "Berenjenas",            2200),
    (MERCADO, "Berenjenas",            1500),

    # Salsas y lácteos
    (ARABE,   "Tahini",                7500),
    (JUMBO,   "Tahini",               13500),
    (JUMBO,   "Yogur natural",         2900),
    (UNIMARC, "Yogur natural",         2600),
    (JUMBO,   "Mayonesa",              3600),
    (UNIMARC, "Mayonesa",              3300),
    (JUMBO,   "Queso blanco",          9000),
    (UNIMARC, "Queso blanco",          8500),
    (ARABE,   "Queso blanco",          7500),
    (JUMBO,   "Crema de leche",        3200),
    (UNIMARC, "Crema de leche",        2900),

    # Aceites
    (JUMBO,   "Aceite vegetal",        2900),
    (UNIMARC, "Aceite vegetal",        2700),
    (JUMBO,   "Aceite de oliva",       8900),
    (UNIMARC, "Aceite de oliva",       8400),
    (ARABE,   "Aceite de oliva",       7800),

    # Especias — distribuidora árabe especialista
    (ARABE,   "Comino molido",         4200),
    (JUMBO,   "Comino molido",         8500),
    (ARABE,   "Paprika",               4800),
    (JUMBO,   "Paprika",               9500),
    (ARABE,   "Cúrcuma",               6200),
    (JUMBO,   "Cúrcuma",              12000),
    (ARABE,   "Canela molida",         5500),
    (JUMBO,   "Canela molida",        10500),
    (ARABE,   "Pimienta negra",        6500),
    (JUMBO,   "Pimienta negra",       12000),
    (ARABE,   "Cardamomo molido",     18000),
    (ARABE,   "Mezcla especias shawarma", 5800),
    (JUMBO,   "Sal",                    520),
    (UNIMARC, "Sal",                    480),

    # Granos y conservas
    (JUMBO,   "Arroz",                 1300),
    (UNIMARC, "Arroz",                 1150),
    (ARABE,   "Garbanzos secos",       2000),
    (JUMBO,   "Garbanzos secos",       2800),
    (ARABE,   "Aceitunas negras",      6000),
    (JUMBO,   "Aceitunas negras",      9800),
    (JUMBO,   "Pepinillos encurtidos", 4800),
    (UNIMARC, "Pepinillos encurtidos", 4500),
    (JUMBO,   "Vinagre blanco",        1100),
    (UNIMARC, "Vinagre blanco",         950),
    (JUMBO,   "Azúcar",               1000),
    (UNIMARC, "Azúcar",                950),

    # Bebidas
    (JUMBO,   "Agua mineral 500ml",     480),
    (UNIMARC, "Agua mineral 500ml",     450),
    (JUMBO,   "Bebida lata 350ml",      750),
    (UNIMARC, "Bebida lata 350ml",      720),
    (MERCADO, "Jugo natural (naranja)", 2200),
    (JUMBO,   "Jugo natural (naranja)", 3000),
]

print("── Precios por proveedor ──")
ok = err = 0
for prov_id, ing_nombre, precio in PRECIOS:
    ing_id = PI(ing_nombre)
    if not ing_id or not prov_id:
        print(f"  ✗ SKIP: {ing_nombre} / prov={prov_id}")
        err += 1
        continue
    r2 = requests.post(f"{BASE}/proveedores/{prov_id}/precios",
                       json={"ingrediente_id": ing_id, "precio": precio}, headers=H)
    if r2.ok:
        ok += 1
    else:
        print(f"  ✗ {ing_nombre}: {r2.text}")
        err += 1

print(f"  ✓ {ok} precios cargados, {err} errores\n")

# ─── 3. PRODUCTOS (carta) ────────────────────────────────────────────────────
PRODUCTOS = [
    {"nombre": "Shawarma Pollo",          "precio": 5500,  "categoria": "Shawarma",  "descripcion": "Shawarma de pollo marinado con especias árabes, salsa de ajo y vegetales frescos"},
    {"nombre": "Shawarma Vacuno",         "precio": 6500,  "categoria": "Shawarma",  "descripcion": "Shawarma de vacuno con cebolla caramelizada, tomate y salsa tahini"},
    {"nombre": "Shawarma Mixto",          "precio": 6500,  "categoria": "Shawarma",  "descripcion": "Mezcla de pollo y vacuno con todos los acompañamientos árabes"},
    {"nombre": "Shawarma Cordero",        "precio": 8500,  "categoria": "Shawarma",  "descripcion": "Shawarma premium de cordero con especias tradicionales y yogur"},
    {"nombre": "Bandeja Shawarma Pollo",  "precio": 7500,  "categoria": "Bandeja",   "descripcion": "Shawarma de pollo servido en plato con arroz árabe y ensaladas"},
    {"nombre": "Bandeja Shawarma Vacuno", "precio": 8500,  "categoria": "Bandeja",   "descripcion": "Shawarma de vacuno en plato con arroz, ensalada árabe y salsas"},
    {"nombre": "Combo Shawarma + Bebida", "precio": 6900,  "categoria": "Combos",    "descripcion": "Shawarma de pollo + bebida lata o agua"},
    {"nombre": "Combo Familiar (4 unit)", "precio": 20000, "categoria": "Combos",    "descripcion": "4 shawarmas de pollo con salsas y extras"},
    {"nombre": "Hummus con Pan Pita",     "precio": 3500,  "categoria": "Entradas",  "descripcion": "Hummus casero con aceite de oliva y 2 panes pita"},
    {"nombre": "Ensalada Árabe",          "precio": 3500,  "categoria": "Entradas",  "descripcion": "Tomate, pepino, perejil, limón y aceite de oliva"},
    {"nombre": "Papas Fritas",            "precio": 2500,  "categoria": "Acompañamientos", "descripcion": "Papas fritas crujientes"},
    {"nombre": "Agua Mineral 500ml",      "precio": 1200,  "categoria": "Bebidas",   "descripcion": "Agua mineral natural"},
    {"nombre": "Bebida Lata",             "precio": 1500,  "categoria": "Bebidas",   "descripcion": "Coca-Cola, Sprite o Fanta"},
    {"nombre": "Jugo Natural",            "precio": 2500,  "categoria": "Bebidas",   "descripcion": "Jugo de naranja natural"},
]

print("── Productos (carta) ──")
existing_prods = requests.get(f"{BASE}/productos", headers=H).json()
existing_prod_names = {p["nombre"] for p in existing_prods}
prod_map = {p["nombre"]: p["id"] for p in existing_prods}

for prod in PRODUCTOS:
    if prod["nombre"] in existing_prod_names:
        print(f"  — ya existe: {prod['nombre']}")
    else:
        r2 = requests.post(f"{BASE}/productos", json=prod, headers=H)
        if r2.ok:
            prod_map[prod["nombre"]] = r2.json()["id"]
            print(f"  ✓ {prod['nombre']} — ${prod['precio']:,}")
        else:
            print(f"  ✗ {prod['nombre']}: {r2.text}")

print()

# ─── 4. RECETAS ─────────────────────────────────────────────────────────────
def I(nombre): return ing_map.get(nombre)

RECETAS = [
    {
        "nombre": "Shawarma de Pollo",
        "descripcion": "Receta base para 1 shawarma de pollo",
        "precio_venta": 5500,
        "porciones": 1,
        "categoria": "Shawarma",
        "items": [
            {"ingrediente_id": I("Carne de pollo"),     "cantidad": 0.18},
            {"ingrediente_id": I("Pan pita"),            "cantidad": 1},
            {"ingrediente_id": I("Cebolla"),             "cantidad": 0.04},
            {"ingrediente_id": I("Tomate"),              "cantidad": 0.05},
            {"ingrediente_id": I("Lechuga"),             "cantidad": 0.03},
            {"ingrediente_id": I("Pepino"),              "cantidad": 0.03},
            {"ingrediente_id": I("Tahini"),              "cantidad": 0.02},
            {"ingrediente_id": I("Yogur natural"),       "cantidad": 0.03},
            {"ingrediente_id": I("Ajo"),                 "cantidad": 0.005},
            {"ingrediente_id": I("Limón"),               "cantidad": 0.02},
            {"ingrediente_id": I("Mezcla especias shawarma"), "cantidad": 0.008},
            {"ingrediente_id": I("Aceite vegetal"),      "cantidad": 0.015},
            {"ingrediente_id": I("Sal"),                 "cantidad": 0.005},
        ],
    },
    {
        "nombre": "Shawarma de Vacuno",
        "descripcion": "Receta base para 1 shawarma de vacuno",
        "precio_venta": 6500,
        "porciones": 1,
        "categoria": "Shawarma",
        "items": [
            {"ingrediente_id": I("Carne de vacuno"),     "cantidad": 0.18},
            {"ingrediente_id": I("Pan pita"),            "cantidad": 1},
            {"ingrediente_id": I("Cebolla"),             "cantidad": 0.05},
            {"ingrediente_id": I("Tomate"),              "cantidad": 0.05},
            {"ingrediente_id": I("Repollo"),             "cantidad": 0.04},
            {"ingrediente_id": I("Pepinillos encurtidos"),"cantidad": 0.03},
            {"ingrediente_id": I("Tahini"),              "cantidad": 0.025},
            {"ingrediente_id": I("Mayonesa"),            "cantidad": 0.02},
            {"ingrediente_id": I("Ajo"),                 "cantidad": 0.005},
            {"ingrediente_id": I("Mezcla especias shawarma"), "cantidad": 0.008},
            {"ingrediente_id": I("Aceite vegetal"),      "cantidad": 0.015},
            {"ingrediente_id": I("Sal"),                 "cantidad": 0.005},
        ],
    },
    {
        "nombre": "Shawarma Mixto",
        "descripcion": "Mezcla pollo y vacuno en un shawarma",
        "precio_venta": 6500,
        "porciones": 1,
        "categoria": "Shawarma",
        "items": [
            {"ingrediente_id": I("Carne de pollo"),      "cantidad": 0.09},
            {"ingrediente_id": I("Carne de vacuno"),     "cantidad": 0.09},
            {"ingrediente_id": I("Pan pita"),            "cantidad": 1},
            {"ingrediente_id": I("Cebolla"),             "cantidad": 0.04},
            {"ingrediente_id": I("Tomate"),              "cantidad": 0.04},
            {"ingrediente_id": I("Lechuga"),             "cantidad": 0.03},
            {"ingrediente_id": I("Tahini"),              "cantidad": 0.02},
            {"ingrediente_id": I("Yogur natural"),       "cantidad": 0.02},
            {"ingrediente_id": I("Mayonesa"),            "cantidad": 0.015},
            {"ingrediente_id": I("Mezcla especias shawarma"), "cantidad": 0.008},
            {"ingrediente_id": I("Aceite vegetal"),      "cantidad": 0.015},
            {"ingrediente_id": I("Sal"),                 "cantidad": 0.005},
        ],
    },
    {
        "nombre": "Shawarma de Cordero",
        "descripcion": "Shawarma premium con cordero",
        "precio_venta": 8500,
        "porciones": 1,
        "categoria": "Shawarma",
        "items": [
            {"ingrediente_id": I("Carne de cordero"),    "cantidad": 0.18},
            {"ingrediente_id": I("Pan árabe grande"),    "cantidad": 1},
            {"ingrediente_id": I("Cebolla"),             "cantidad": 0.04},
            {"ingrediente_id": I("Tomate"),              "cantidad": 0.05},
            {"ingrediente_id": I("Perejil"),             "cantidad": 0.02},
            {"ingrediente_id": I("Yogur natural"),       "cantidad": 0.04},
            {"ingrediente_id": I("Tahini"),              "cantidad": 0.025},
            {"ingrediente_id": I("Limón"),               "cantidad": 0.025},
            {"ingrediente_id": I("Ajo"),                 "cantidad": 0.005},
            {"ingrediente_id": I("Comino molido"),       "cantidad": 0.005},
            {"ingrediente_id": I("Canela molida"),       "cantidad": 0.003},
            {"ingrediente_id": I("Cardamomo molido"),    "cantidad": 0.002},
            {"ingrediente_id": I("Aceite de oliva"),     "cantidad": 0.02},
            {"ingrediente_id": I("Sal"),                 "cantidad": 0.005},
        ],
    },
    {
        "nombre": "Bandeja Shawarma Pollo",
        "descripcion": "Shawarma de pollo en plato con arroz y ensalada",
        "precio_venta": 7500,
        "porciones": 1,
        "categoria": "Bandeja",
        "items": [
            {"ingrediente_id": I("Carne de pollo"),      "cantidad": 0.20},
            {"ingrediente_id": I("Pan pita"),            "cantidad": 1},
            {"ingrediente_id": I("Arroz"),               "cantidad": 0.08},
            {"ingrediente_id": I("Cebolla"),             "cantidad": 0.04},
            {"ingrediente_id": I("Tomate"),              "cantidad": 0.06},
            {"ingrediente_id": I("Perejil"),             "cantidad": 0.015},
            {"ingrediente_id": I("Limón"),               "cantidad": 0.02},
            {"ingrediente_id": I("Tahini"),              "cantidad": 0.03},
            {"ingrediente_id": I("Aceitunas negras"),    "cantidad": 0.02},
            {"ingrediente_id": I("Mezcla especias shawarma"), "cantidad": 0.008},
            {"ingrediente_id": I("Aceite de oliva"),     "cantidad": 0.015},
            {"ingrediente_id": I("Sal"),                 "cantidad": 0.005},
        ],
    },
    {
        "nombre": "Hummus con Pan Pita",
        "descripcion": "Hummus casero con 2 panes pita",
        "precio_venta": 3500,
        "porciones": 1,
        "categoria": "Entradas",
        "items": [
            {"ingrediente_id": I("Garbanzos secos"),     "cantidad": 0.08},
            {"ingrediente_id": I("Tahini"),              "cantidad": 0.03},
            {"ingrediente_id": I("Ajo"),                 "cantidad": 0.005},
            {"ingrediente_id": I("Limón"),               "cantidad": 0.04},
            {"ingrediente_id": I("Aceite de oliva"),     "cantidad": 0.02},
            {"ingrediente_id": I("Comino molido"),       "cantidad": 0.003},
            {"ingrediente_id": I("Sal"),                 "cantidad": 0.005},
            {"ingrediente_id": I("Pan pita"),            "cantidad": 2},
        ],
    },
]

print("── Recetas ──")
existing_recetas = requests.get(f"{BASE}/recetas", headers=H).json()
existing_rec_names = {r["nombre"] for r in existing_recetas}

for rec in RECETAS:
    items_ok = [it for it in rec["items"] if it["ingrediente_id"] is not None]
    if rec["nombre"] in existing_rec_names:
        print(f"  — ya existe: {rec['nombre']}")
        continue
    payload = {**rec, "items": items_ok}
    r2 = requests.post(f"{BASE}/recetas", json=payload, headers=H)
    if r2.ok:
        data = r2.json()
        margen = data.get("margen_pct", 0)
        print(f"  ✓ {rec['nombre']} — costo ${data.get('costo_porcion',0):,.0f} / venta ${rec['precio_venta']:,} / margen {margen:.0f}%")
    else:
        print(f"  ✗ {rec['nombre']}: {r2.text}")

print("\n✅ Seed shawarma completo.")
