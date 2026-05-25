from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Ingrediente, Proveedor, PrecioProveedor
from routers.auth import require_admin

router = APIRouter(prefix="/api/cotizador", tags=["cotizador"])


@router.get("/comparar")
def comparar(db: Session = Depends(get_db), _=Depends(require_admin)):
    """
    Returns a matrix: for each active ingredient, list price per active supplier.
    Also marks which supplier has the best (lowest) price.
    """
    ingredientes = (
        db.query(Ingrediente).filter(Ingrediente.activo == True).order_by(Ingrediente.nombre).all()
    )
    proveedores = (
        db.query(Proveedor).filter(Proveedor.activo == True).order_by(Proveedor.nombre).all()
    )

    # Build price lookup: (ingrediente_id, proveedor_id) -> PrecioProveedor
    precios_raw = db.query(PrecioProveedor).all()
    precio_map: dict[tuple, float] = {}
    for pp in precios_raw:
        precio_map[(pp.ingrediente_id, pp.proveedor_id)] = pp.precio

    rows = []
    for ing in ingredientes:
        precios_ing: dict[int, float | None] = {}
        valores = []
        for prov in proveedores:
            p = precio_map.get((ing.id, prov.id))
            precios_ing[prov.id] = p
            if p is not None and p > 0:
                valores.append(p)

        min_precio = min(valores) if valores else None

        rows.append({
            "ingrediente_id": ing.id,
            "ingrediente": ing.nombre,
            "unidad": ing.unidad,
            "stock_actual": ing.stock,
            "costo_actual": ing.costo_unitario,
            "precios": precios_ing,       # {proveedor_id: precio | null}
            "min_precio": min_precio,
            "mejor_proveedor_id": (
                next((prov.id for prov in proveedores if precio_map.get((ing.id, prov.id)) == min_precio), None)
                if min_precio is not None else None
            ),
        })

    return {
        "proveedores": [{"id": p.id, "nombre": p.nombre, "tipo": p.tipo} for p in proveedores],
        "filas": rows,
    }


@router.post("/pedido-optimo")
def pedido_optimo(body: dict, db: Session = Depends(get_db), _=Depends(require_admin)):
    """
    Given a list of {ingrediente_id, cantidad} to buy,
    returns the optimal order split by cheapest supplier, with totals and savings.
    """
    items_pedido: list[dict] = body.get("items", [])  # [{ingrediente_id, cantidad}]

    proveedores = db.query(Proveedor).filter(Proveedor.activo == True).all()
    precios_raw = db.query(PrecioProveedor).all()
    precio_map: dict[tuple, float] = {}
    for pp in precios_raw:
        precio_map[(pp.ingrediente_id, pp.proveedor_id)] = pp.precio

    prov_by_id = {p.id: p for p in proveedores}

    # Group items by cheapest supplier
    pedido_por_proveedor: dict[int, list[dict]] = {}
    sin_precio: list[dict] = []
    ahorro_total = 0.0

    for item in items_pedido:
        ing_id = item["ingrediente_id"]
        cantidad = item.get("cantidad", 1)
        ing = db.get(Ingrediente, ing_id)
        if not ing:
            continue

        opciones = [(prov.id, precio_map.get((ing_id, prov.id))) for prov in proveedores]
        opciones_validas = [(pid, p) for pid, p in opciones if p is not None and p > 0]

        if not opciones_validas:
            sin_precio.append({"ingrediente_id": ing_id, "nombre": ing.nombre, "cantidad": cantidad, "unidad": ing.unidad})
            continue

        mejor_prov_id, mejor_precio = min(opciones_validas, key=lambda x: x[1])
        subtotal = round(mejor_precio * cantidad, 0)

        # Calculate savings vs current cost
        ahorro_item = round((ing.costo_unitario - mejor_precio) * cantidad, 0) if ing.costo_unitario > 0 else 0
        ahorro_total += ahorro_item

        if mejor_prov_id not in pedido_por_proveedor:
            pedido_por_proveedor[mejor_prov_id] = []

        pedido_por_proveedor[mejor_prov_id].append({
            "ingrediente_id": ing_id,
            "nombre": ing.nombre,
            "unidad": ing.unidad,
            "cantidad": cantidad,
            "precio_unitario": mejor_precio,
            "subtotal": subtotal,
            "ahorro_vs_actual": ahorro_item,
            "precio_actual": ing.costo_unitario,
        })

    grupos = []
    total_general = 0.0
    for prov_id, items in pedido_por_proveedor.items():
        prov = prov_by_id[prov_id]
        total_prov = sum(i["subtotal"] for i in items)
        total_general += total_prov
        grupos.append({
            "proveedor_id": prov_id,
            "proveedor": prov.nombre,
            "tipo": prov.tipo,
            "telefono": prov.telefono,
            "items": items,
            "total": round(total_prov, 0),
        })

    return {
        "grupos": sorted(grupos, key=lambda g: g["proveedor"]),
        "sin_precio": sin_precio,
        "total_general": round(total_general, 0),
        "ahorro_estimado": round(ahorro_total, 0),
    }
