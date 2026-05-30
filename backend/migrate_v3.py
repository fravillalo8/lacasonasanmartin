"""
Migración v3: vincula Productos existentes con sus Recetas (receta_id FK).
Matching manual por nombre de negocio shawarma.
"""
import os, requests, sys

BASE = os.environ.get("API_BASE", "http://localhost:8000")
PIN  = os.environ.get("API_PIN", "")
if not PIN:
    print("ERROR: define API_PIN en el entorno antes de ejecutar")
    sys.exit(1)
_token = ""


def login():
    global _token
    r = requests.post(f"{BASE}/api/auth/login", json={"pin": PIN})
    _token = r.json()["token"]
    print("✓ Login OK")


def H():
    return {"Authorization": f"Bearer {_token}"}


def get(path):
    r = requests.get(f"{BASE}{path}", headers=H())
    if r.status_code == 401:
        login()
        r = requests.get(f"{BASE}{path}", headers=H())
    return r


def put(path, data):
    r = requests.put(f"{BASE}{path}", json=data, headers=H())
    if r.status_code == 401:
        login()
        r = requests.put(f"{BASE}{path}", json=data, headers=H())
    return r


login()

# ── Obtener recetas y productos actuales ─────────────────────────────────────
recetas = get("/api/recetas").json()
productos = get("/api/productos").json()

print(f"\n── Recetas ({len(recetas)}): {[r['nombre'] for r in recetas]}")
print(f"── Productos ({len(productos)}): {[p['nombre'] for p in productos]}")

# Mapa manual: nombre_producto → nombre_receta
# (ajustar según seed actual)
VINCULO = {
    "Shawarma Pollo":         "Shawarma de Pollo",
    "Shawarma Vacuno":        "Shawarma de Vacuno",
    "Shawarma Mixto":         "Shawarma Mixto",
    "Shawarma Cordero":       "Shawarma de Cordero",
    "Bandeja Shawarma Pollo": "Bandeja Shawarma Pollo",
    "Hummus con Pan Pita":    "Hummus con Pan Pita",
}

receta_por_nombre = {r["nombre"]: r for r in recetas}
prod_por_nombre   = {p["nombre"]: p for p in productos}

print("\n── Vinculando productos con recetas ──")
ok = err = 0
for prod_nombre, rec_nombre in VINCULO.items():
    prod = prod_por_nombre.get(prod_nombre)
    rec  = receta_por_nombre.get(rec_nombre)
    if not prod:
        print(f"  ✗ Producto no encontrado: {prod_nombre}")
        err += 1
        continue
    if not rec:
        print(f"  ✗ Receta no encontrada: {rec_nombre}")
        err += 1
        continue
    r = put(f"/api/productos/{prod['id']}", {
        "nombre":      prod["nombre"],
        "descripcion": prod.get("descripcion", ""),
        "precio":      prod["precio"],
        "categoria":   prod.get("categoria", ""),
        "foto":        prod.get("foto", ""),
        "activo":      prod.get("activo", True),
        "receta_id":   rec["id"],
    })
    if r.ok:
        print(f"  ✓ {prod_nombre} → receta [{rec['id']}] {rec_nombre}")
        ok += 1
    else:
        print(f"  ✗ {prod_nombre}: {r.text[:80]}")
        err += 1

print(f"\n✅ Migración v3 completada: {ok} OK, {err} errores.")
