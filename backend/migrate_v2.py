"""
Migración v2: reemplaza proveedores locales (Mercado Municipal, Distribuidora Árabe)
por cadenas de supermercados con presencia web (Santa Isabel, Líder, Acuenta).
"""
import os, random, requests, sys

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


def post(path, data):
    r = requests.post(f"{BASE}{path}", json=data, headers=H())
    if r.status_code == 401:
        login()
        r = requests.post(f"{BASE}{path}", json=data, headers=H())
    return r


def delete(path):
    r = requests.delete(f"{BASE}{path}", headers=H())
    if r.status_code == 401:
        login()
        r = requests.delete(f"{BASE}{path}", headers=H())
    return r


# ─────────────────────────────────────────────────────────────────────────────
login()

# 1. Estado actual
proveedores = get("/api/proveedores").json()
print("\n── Proveedores actuales ──")
for p in proveedores:
    print(f"  [{p['id']}] {p['nombre']} ({p['tipo']})")

# 2. Eliminar los proveedores que no tienen web
ELIMINAR_KEYS = ["mercado municipal", "distribuidora árabe", "distribuidora arabe"]
prov_activos = {}

for p in proveedores:
    if any(k in p["nombre"].lower() for k in ELIMINAR_KEYS):
        r = delete(f"/api/proveedores/{p['id']}")
        print(f"\n  ✗ Eliminado: {p['nombre']} → HTTP {r.status_code}")
    else:
        prov_activos[p["nombre"].lower()] = p
        print(f"  ✓ Mantenido: {p['nombre']}")

# 3. Agregar nuevas cadenas con web
NUEVOS = [
    {
        "nombre": "Santa Isabel Los Andes",
        "tipo": "supermercado",
        "telefono": "",
        "contacto": "",
        "direccion": "Los Andes, Región de Valparaíso",
        "notas": "Cencosud — santaisabel.cl",
    },
    {
        "nombre": "Líder San Felipe",
        "tipo": "supermercado",
        "telefono": "",
        "contacto": "",
        "direccion": "San Felipe, Región de Valparaíso",
        "notas": "Walmart Chile — lider.cl",
    },
    {
        "nombre": "Acuenta Los Andes",
        "tipo": "supermercado",
        "telefono": "",
        "contacto": "",
        "direccion": "Los Andes, Región de Valparaíso",
        "notas": "SMU formato mayorista — acuenta.cl",
    },
]

print("\n── Creando nuevos proveedores ──")
nuevos_creados: dict[str, dict] = {}
for np in NUEVOS:
    nombre_lower = np["nombre"].lower()
    if nombre_lower in prov_activos:
        print(f"  — ya existe: {np['nombre']}")
        nuevos_creados[np["nombre"]] = prov_activos[nombre_lower]
        continue
    r = post("/api/proveedores", np)
    if r.ok:
        nuevos_creados[np["nombre"]] = r.json()
        print(f"  ✓ {np['nombre']} → id {r.json()['id']}")
    else:
        print(f"  ✗ {np['nombre']}: {r.text[:80]}")

# 4. Obtener precios de Jumbo como referencia
proveedores_actualizados = get("/api/proveedores").json()
jumbo = next((p for p in proveedores_actualizados if "jumbo" in p["nombre"].lower()), None)

if not jumbo:
    print("\n⚠ No se encontró Jumbo — saltando seeding de precios")
else:
    jumbo_precios = get(f"/api/proveedores/{jumbo['id']}/precios").json()
    print(f"\n── Seeding precios de referencia (base: {jumbo['nombre']}, {len(jumbo_precios)} items) ──")

    # Factores de precio relativos a Jumbo por cadena
    FACTORES: dict[str, tuple[float, float]] = {
        "Santa Isabel Los Andes": (0.97, 1.05),   # ±5%
        "Líder San Felipe":       (0.92, 1.02),   # 2–8% más barato en promedio
        "Acuenta Los Andes":      (0.87, 0.97),   # 3–13% más barato (formato mayorista)
    }

    for prov_nombre, (lo, hi) in FACTORES.items():
        if prov_nombre not in nuevos_creados:
            continue
        prov_id = nuevos_creados[prov_nombre]["id"]
        ok = err = 0
        for jp in jumbo_precios:
            precio_base = jp["precio"]
            factor = random.uniform(lo, hi)
            precio_nuevo = round(precio_base * factor / 10) * 10  # redondear a decenas
            precio_nuevo = max(precio_nuevo, 50)                  # mínimo $50
            r = post(f"/api/proveedores/{prov_id}/precios", {
                "ingrediente_id": jp["ingrediente_id"],
                "precio": precio_nuevo,
                "notas": f"ref Jumbo ×{factor:.2f}",
            })
            if r.ok:
                ok += 1
            else:
                err += 1
        print(f"  {prov_nombre}: {ok} precios, {err} errores")

print("\n✅ Migración v2 completada.")
