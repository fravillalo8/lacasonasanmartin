#!/usr/bin/env python3
"""
Seed de DEMO para 'El Luchador' (restaurant mexicano, San Felipe).
Se ejecuta SOLO en la instancia demo de El Luchador (env SEED_DEMO=luchador),
al arrancar si la base está vacía (idempotente). NUNCA toca La Casona.

Datos tomados de hub-elluchador/gastro-config.js (la carta que ya teníamos).
Cada producto lleva un insumo con su costo + una receta de 1 ítem → Margen Vivo
calcula precio-costo correcto sin inventar recetas realistas.
"""
from datetime import datetime, timedelta


# (emoji, nombre, precio, costo, categoria, etiquetas)
CARTA = [
    ("🌮", "Tacos al pastor (3u)", 6900,  2350, "Tacos",    "picante"),
    ("🌯", "Burrito El Luchador",  8500,  3400, "Burritos", ""),
    ("🔥", "Fajitas de carne",     11900, 5600, "Fuertes",  "picante"),
    ("🧀", "Quesadilla campeona",  6500,  2100, "Fuertes",  "vegetariano"),
    ("🍟", "Papas Luchadoras",     5900,  1500, "Entradas", "vegetariano"),
    ("🥑", "Flautas & guacamole",  6200,  2600, "Entradas", "vegetariano,sin_gluten"),
    ("🍺", "Michelada de la casa", 4500,  1350, "Bebidas",  ""),
    ("🧉", "Jarritos",             2500,  900,  "Bebidas",  "vegetariano"),
]

MESAS = [
    (1, "", 2), (2, "", 4), (3, "", 4), (4, "", 6),
    (5, "", 2), (6, "", 4), (7, "Terraza", 4), (8, "Terraza", 6),
]

# (nombre, telefono, visitas, gasto_total, dias_sin_venir)
CLIENTES = [
    ("Fernanda Silva",  "56 9 6789 0123", 19, 271000, 33),
    ("Rodrigo Tapia",   "56 9 5544 3322", 24, 348000, 8),
    ("Carla Muñoz",     "56 9 8123 4567", 12, 184000, 41),
    ("Valentina Díaz",  "56 9 4433 2211", 9,  112000, 12),
    ("Diego Rojas",     "56 9 7654 3210", 7,  96000,  58),
    ("Ignacio Pérez",   "56 9 5566 7788", 5,  58000,  37),
]


def seed_if_empty():
    """Siembra la demo de El Luchador si la tabla de productos está vacía."""
    from database import SessionLocal
    from models import Ingrediente, Receta, ItemReceta, Producto, Mesa, ClienteFrecuente

    db = SessionLocal()
    try:
        if db.query(Producto).first():
            return  # ya sembrado
        print("🌮 Sembrando demo El Luchador…")

        for emoji, nombre, precio, costo, cat, etiquetas in CARTA:
            ing = Ingrediente(
                nombre=f"Insumos {nombre}", unidad="porción",
                stock=100, stock_minimo=10, costo_unitario=float(costo),
                categoria="Insumos",
            )
            db.add(ing); db.flush()

            rec = Receta(
                nombre=nombre, descripcion="", precio_venta=float(precio),
                porciones=1, categoria=cat,
            )
            db.add(rec); db.flush()
            db.add(ItemReceta(receta_id=rec.id, ingrediente_id=ing.id, cantidad=1))

            db.add(Producto(
                nombre=f"{emoji} {nombre}", descripcion="", precio=float(precio),
                categoria=cat, etiquetas=etiquetas, receta_id=rec.id,
            ))

        for numero, nombre, cap in MESAS:
            db.add(Mesa(numero=numero, nombre=nombre, capacidad=cap, estado="libre"))

        ahora = datetime.utcnow()
        for nombre, tel, visitas, gasto, dias in CLIENTES:
            db.add(ClienteFrecuente(
                nombre=nombre, telefono=tel, visitas=visitas,
                gasto_total=float(gasto), ultima_visita=ahora - timedelta(days=dias),
            ))

        db.commit()
        print(f"✓ Demo El Luchador: {len(CARTA)} platos, {len(MESAS)} mesas, {len(CLIENTES)} clientes")
    except Exception as e:
        db.rollback()
        print(f"✗ seed_luchador falló: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_if_empty()
