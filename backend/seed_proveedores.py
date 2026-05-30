#!/usr/bin/env python3
"""
Seed 4 initial suppliers for the cotizador.
Usage:  python seed_proveedores.py <admin_pin>
"""
import os, sys
import requests

BASE = os.environ.get("API_BASE", "http://localhost:8000/api")

if len(sys.argv) < 2:
    print("Usage: API_BASE=https://... python seed_proveedores.py <admin_pin>")
    sys.exit(1)

pin = sys.argv[1]

# Login
r = requests.post(f"{BASE}/auth/login", json={"pin": pin})
if not r.ok:
    print(f"Login failed: {r.text}")
    sys.exit(1)
token = r.json()["token"]
headers = {"Authorization": f"Bearer {token}"}
print(f"✓ Logged in as {r.json()['role']}")

PROVEEDORES = [
    {
        "nombre": "Jumbo Los Andes",
        "tipo": "supermercado",
        "telefono": "+56 34 2442 100",
        "contacto": "",
        "direccion": "Av. Freire 850, Los Andes",
        "notas": "Supermercado principal. Buenos precios en lácteos, aceites y condimentos.",
    },
    {
        "nombre": "Unimarc Los Andes",
        "tipo": "supermercado",
        "telefono": "",
        "contacto": "",
        "direccion": "Los Andes",
        "notas": "Segunda opción en supermercados. Comparar ofertas semanales.",
    },
    {
        "nombre": "Mercado Municipal Los Andes",
        "tipo": "feria",
        "telefono": "",
        "contacto": "",
        "direccion": "Av. Independencia s/n, Los Andes",
        "notas": "Feria local. Mejor precio en verduras, cebolla, tomate, limón. Ir martes y viernes.",
    },
    {
        "nombre": "Distribuidora Árabe Santiago",
        "tipo": "distribuidor",
        "telefono": "+56 9 0000 0000",
        "contacto": "",
        "direccion": "Santiago",
        "notas": "Especialista en productos árabes: shawarma, pita, especias, tahini, hummus. Despacho a Los Andes.",
    },
]

existing_r = requests.get(f"{BASE}/proveedores", headers=headers)
existing_names = {p["nombre"] for p in (existing_r.json() if existing_r.ok else [])}

created = 0
for prov in PROVEEDORES:
    if prov["nombre"] in existing_names:
        print(f"  — ya existe: {prov['nombre']}")
        continue
    r = requests.post(f"{BASE}/proveedores", json=prov, headers=headers)
    if r.ok:
        print(f"  ✓ creado: {prov['nombre']}")
        created += 1
    else:
        print(f"  ✗ error en {prov['nombre']}: {r.text}")

print(f"\nListo — {created} proveedores creados.")
