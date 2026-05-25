import os
import base64
import json
import re
from datetime import datetime, timedelta, timezone

import requests as http_requests
from bs4 import BeautifulSoup
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Ingrediente, Proveedor, PrecioProveedor
from routers.auth import require_admin

router = APIRouter(prefix="/api/cotizador", tags=["cotizador"])

# ─── Helpers ──────────────────────────────────────────────────────────────────

STALE_DAYS = 7


def _build_precio_map(db: Session) -> dict[tuple, "PrecioProveedor"]:
    return {(pp.ingrediente_id, pp.proveedor_id): pp for pp in db.query(PrecioProveedor).all()}


# ─── Comparar ─────────────────────────────────────────────────────────────────

@router.get("/comparar")
def comparar(db: Session = Depends(get_db), _=Depends(require_admin)):
    ingredientes = db.query(Ingrediente).filter(Ingrediente.activo == True).order_by(Ingrediente.nombre).all()
    proveedores = db.query(Proveedor).filter(Proveedor.activo == True).order_by(Proveedor.nombre).all()

    pp_map = _build_precio_map(db)
    precio_map = {k: v.precio for k, v in pp_map.items()}
    fecha_map = {k: v.fecha for k, v in pp_map.items()}

    ahora = datetime.now(timezone.utc)
    stale_cutoff = ahora - timedelta(days=STALE_DAYS)

    rows = []
    for ing in ingredientes:
        precios_ing: dict[int, float | None] = {}
        fechas_ing: dict[int, str | None] = {}
        valores = []
        for prov in proveedores:
            p = precio_map.get((ing.id, prov.id))
            f = fecha_map.get((ing.id, prov.id))
            precios_ing[prov.id] = p
            fechas_ing[prov.id] = f.isoformat() if f else None
            if p is not None and p > 0:
                valores.append(p)

        min_precio = min(valores) if valores else None
        rows.append({
            "ingrediente_id": ing.id,
            "ingrediente": ing.nombre,
            "unidad": ing.unidad,
            "stock_actual": ing.stock,
            "costo_actual": ing.costo_unitario,
            "precios": precios_ing,
            "fechas": fechas_ing,
            "min_precio": min_precio,
            "mejor_proveedor_id": (
                next((prov.id for prov in proveedores if precio_map.get((ing.id, prov.id)) == min_precio), None)
                if min_precio is not None else None
            ),
        })

    return {
        "proveedores": [{"id": p.id, "nombre": p.nombre, "tipo": p.tipo} for p in proveedores],
        "filas": rows,
        "stale_cutoff": stale_cutoff.isoformat(),
    }


# ─── Alertas precios viejos ────────────────────────────────────────────────────

@router.get("/alertas-precios")
def alertas_precios(db: Session = Depends(get_db), _=Depends(require_admin)):
    """Retorna precios con más de STALE_DAYS días sin actualizar."""
    ahora = datetime.now(timezone.utc)
    stale_cutoff = ahora - timedelta(days=STALE_DAYS)

    precios = db.query(PrecioProveedor).all()
    alertas = []
    sin_precio_count = 0

    ingredientes = db.query(Ingrediente).filter(Ingrediente.activo == True).all()
    proveedores = db.query(Proveedor).filter(Proveedor.activo == True).all()
    pp_set = {(pp.ingrediente_id, pp.proveedor_id) for pp in precios}

    for pp in precios:
        fecha = pp.fecha
        if fecha is None or (fecha.tzinfo is None and fecha < stale_cutoff.replace(tzinfo=None)) or \
           (fecha.tzinfo is not None and fecha < stale_cutoff):
            alertas.append({
                "ingrediente_id": pp.ingrediente_id,
                "ingrediente": pp.ingrediente.nombre if pp.ingrediente else str(pp.ingrediente_id),
                "proveedor_id": pp.proveedor_id,
                "proveedor": pp.proveedor.nombre if pp.proveedor else str(pp.proveedor_id),
                "dias_sin_actualizar": (ahora.replace(tzinfo=None) - (pp.fecha or datetime(2000,1,1))).days,
                "ultimo_precio": pp.precio,
            })

    # Contar ingredientes sin ningún precio
    for ing in ingredientes:
        tiene = any((ing.id, prov.id) in pp_set for prov in proveedores)
        if not tiene:
            sin_precio_count += 1

    return {
        "precios_viejos": sorted(alertas, key=lambda x: -x["dias_sin_actualizar"]),
        "total_viejos": len(alertas),
        "sin_precio_count": sin_precio_count,
        "stale_days": STALE_DAYS,
    }


# ─── Pedido óptimo ────────────────────────────────────────────────────────────

@router.post("/pedido-optimo")
def pedido_optimo(body: dict, db: Session = Depends(get_db), _=Depends(require_admin)):
    items_pedido: list[dict] = body.get("items", [])
    proveedores = db.query(Proveedor).filter(Proveedor.activo == True).all()
    pp_map = _build_precio_map(db)
    precio_map = {k: v.precio for k, v in pp_map.items()}
    prov_by_id = {p.id: p for p in proveedores}

    pedido_por_proveedor: dict[int, list[dict]] = {}
    sin_precio: list[dict] = []
    ahorro_total = 0.0

    for item in items_pedido:
        ing_id = item["ingrediente_id"]
        cantidad = item.get("cantidad", 1)
        ing = db.get(Ingrediente, ing_id)
        if not ing:
            continue

        opciones_validas = [(prov.id, precio_map.get((ing_id, prov.id)))
                            for prov in proveedores
                            if precio_map.get((ing_id, prov.id))]
        opciones_validas = [(pid, p) for pid, p in opciones_validas if p and p > 0]

        if not opciones_validas:
            sin_precio.append({"ingrediente_id": ing_id, "nombre": ing.nombre, "cantidad": cantidad, "unidad": ing.unidad})
            continue

        mejor_prov_id, mejor_precio = min(opciones_validas, key=lambda x: x[1])
        subtotal = round(mejor_precio * cantidad, 0)
        ahorro_item = round((ing.costo_unitario - mejor_precio) * cantidad, 0) if ing.costo_unitario > 0 else 0
        ahorro_total += ahorro_item

        pedido_por_proveedor.setdefault(mejor_prov_id, []).append({
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


# ─── Scraper Jumbo (VTEX) ────────────────────────────────────────────────────

JUMBO_SEARCH = "https://www.jumbo.cl/api/catalog_system/pub/products/search"
UNIMARC_SEARCH = "https://www.unimarc.cl/api/catalog_system/pub/products/search"

SCRAPER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    "Accept": "application/json",
}

def _vtex_search(base_url: str, query: str) -> float | None:
    """Busca un producto en una tienda VTEX y retorna el precio más bajo encontrado."""
    try:
        resp = http_requests.get(
            base_url,
            params={"ft": query, "_from": 0, "_to": 3},
            headers=SCRAPER_HEADERS,
            timeout=8,
        )
        if not resp.ok:
            return None
        productos = resp.json()
        precios = []
        for prod in productos:
            for sku in prod.get("items", []):
                for seller in sku.get("sellers", []):
                    p = seller.get("commertialOffer", {}).get("Price", 0)
                    if p and p > 0:
                        precios.append(p)
        return min(precios) if precios else None
    except Exception:
        return None


def _unimarc_search(query: str) -> float | None:
    """Intenta VTEX primero, cae a scraping HTML si falla."""
    precio = _vtex_search(UNIMARC_SEARCH, query)
    if precio:
        return precio
    # Fallback HTML
    try:
        resp = http_requests.get(
            "https://www.unimarc.cl/search",
            params={"q": query},
            headers={**SCRAPER_HEADERS, "Accept": "text/html"},
            timeout=8,
        )
        if not resp.ok:
            return None
        soup = BeautifulSoup(resp.text, "lxml")
        prices = []
        for el in soup.select("[class*='price'], [class*='Price'], [class*='precio']"):
            text = re.sub(r"[^\d]", "", el.get_text())
            if text and len(text) >= 3:
                prices.append(int(text))
        return min(prices) if prices else None
    except Exception:
        return None


# Mapa ingrediente → término de búsqueda en supermercado
SEARCH_TERMS: dict[str, str] = {
    "Carne de pollo":         "pechuga pollo kg",
    "Carne de vacuno":        "carne molida vacuno kg",
    "Carne de cordero":       "pierna cordero kg",
    "Carne mixta shawarma":   "carne pollo kg",
    "Pan pita":               "pan pita",
    "Pan árabe grande":       "pan árabe",
    "Cebolla":                "cebolla kg",
    "Tomate":                 "tomate kg",
    "Lechuga":                "lechuga",
    "Pepino":                 "pepino",
    "Repollo":                "repollo",
    "Perejil":                "perejil",
    "Limón":                  "limón kg",
    "Ajo":                    "ajo",
    "Papas":                  "papas kg",
    "Berenjenas":             "berenjena",
    "Tahini":                 "tahini",
    "Yogur natural":          "yogur natural litro",
    "Mayonesa":               "mayonesa kg",
    "Queso blanco":           "queso blanco",
    "Crema de leche":         "crema leche",
    "Aceite vegetal":         "aceite vegetal litro",
    "Aceite de oliva":        "aceite oliva litro",
    "Comino molido":          "comino molido",
    "Paprika":                "paprika",
    "Cúrcuma":                "cúrcuma",
    "Canela molida":          "canela molida",
    "Pimienta negra":         "pimienta negra molida",
    "Sal":                    "sal gruesa kg",
    "Arroz":                  "arroz grano largo kg",
    "Garbanzos secos":        "garbanzos secos",
    "Aceitunas negras":       "aceitunas negras",
    "Pepinillos encurtidos":  "pepinillos encurtidos",
    "Vinagre blanco":         "vinagre blanco litro",
    "Azúcar":                "azúcar kg",
    "Agua mineral 500ml":     "agua mineral 500ml",
    "Bebida lata 350ml":      "coca cola lata 350ml",
    "Jugo natural (naranja)": "naranja kg",
}


@router.post("/actualizar-precios-web")
def actualizar_precios_web(body: dict, db: Session = Depends(get_db), _=Depends(require_admin)):
    """
    Consulta Jumbo.cl y Unimarc.cl en vivo y actualiza los precios en la BD.
    body: { "ingrediente_ids": [1,2,3] }  — si vacío, actualiza todos.
    """
    ing_ids: list[int] = body.get("ingrediente_ids", [])
    proveedores = db.query(Proveedor).filter(Proveedor.activo == True).all()

    jumbo = next((p for p in proveedores if "jumbo" in p.nombre.lower()), None)
    unimarc = next((p for p in proveedores if "unimarc" in p.nombre.lower()), None)

    if not jumbo and not unimarc:
        raise HTTPException(400, "No hay proveedores Jumbo ni Unimarc activos")

    query_ings = (
        db.query(Ingrediente).filter(Ingrediente.id.in_(ing_ids), Ingrediente.activo == True).all()
        if ing_ids else
        db.query(Ingrediente).filter(Ingrediente.activo == True).all()
    )

    resultados = []
    ahora = datetime.utcnow()

    for ing in query_ings:
        termino = SEARCH_TERMS.get(ing.nombre, ing.nombre)
        fila = {"ingrediente_id": ing.id, "nombre": ing.nombre, "jumbo": None, "unimarc": None}

        if jumbo:
            precio_j = _vtex_search(JUMBO_SEARCH, termino)
            if precio_j:
                fila["jumbo"] = precio_j
                _upsert_precio(db, jumbo.id, ing.id, precio_j, ahora, "Jumbo web")

        if unimarc:
            precio_u = _unimarc_search(termino)
            if precio_u:
                fila["unimarc"] = precio_u
                _upsert_precio(db, unimarc.id, ing.id, precio_u, ahora, "Unimarc web")

        resultados.append(fila)

    db.commit()

    actualizados = sum(1 for r in resultados if r["jumbo"] or r["unimarc"])
    return {
        "actualizados": actualizados,
        "total": len(resultados),
        "resultados": resultados,
    }


def _upsert_precio(db: Session, prov_id: int, ing_id: int, precio: float, fecha: datetime, notas: str):
    existing = db.query(PrecioProveedor).filter(
        PrecioProveedor.proveedor_id == prov_id,
        PrecioProveedor.ingrediente_id == ing_id,
    ).first()
    if existing:
        existing.precio = round(precio, 0)
        existing.fecha = fecha
        existing.notas = notas
    else:
        db.add(PrecioProveedor(
            proveedor_id=prov_id,
            ingrediente_id=ing_id,
            precio=round(precio, 0),
            fecha=fecha,
            notas=notas,
        ))


# ─── Lector de boleta (Claude Vision) ────────────────────────────────────────

@router.post("/leer-boleta")
async def leer_boleta(
    proveedor_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """
    Recibe imagen de boleta/ticket, usa Claude vision para extraer precios
    y los guarda en el proveedor indicado.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise HTTPException(500, "ANTHROPIC_API_KEY no configurado en Railway")

    prov = db.get(Proveedor, proveedor_id)
    if not prov:
        raise HTTPException(404, "Proveedor no encontrado")

    # Leer imagen
    img_bytes = await file.read()
    if len(img_bytes) > 10 * 1024 * 1024:
        raise HTTPException(400, "Imagen demasiado grande (máx 10MB)")

    img_b64 = base64.standard_b64encode(img_bytes).decode()
    media_type = file.content_type or "image/jpeg"

    # Obtener ingredientes activos para el prompt
    ingredientes = db.query(Ingrediente).filter(Ingrediente.activo == True).order_by(Ingrediente.nombre).all()
    lista_ings = "\n".join(f"- {i.nombre} ({i.unidad})" for i in ingredientes)

    prompt = f"""Analiza esta boleta o ticket de compra de supermercado.

Mis ingredientes son:
{lista_ings}

Extrae los precios de los productos en la boleta que correspondan a mis ingredientes.
Ajusta el precio al precio por unidad según la unidad del ingrediente (ej: si compró 2kg a $3.000 el total, el precio unitario es $1.500/kg).

Responde SOLO con JSON válido, sin texto adicional:
{{
  "proveedor_detectado": "nombre del supermercado si aparece en la boleta",
  "fecha_boleta": "YYYY-MM-DD si aparece",
  "items": [
    {{"ingrediente": "nombre exacto del ingrediente de mi lista", "precio_unitario": 1500, "unidad": "kg", "confianza": "alta|media|baja"}}
  ],
  "no_reconocidos": ["productos en la boleta que no corresponden a ningún ingrediente"]
}}"""

    # Llamar Claude API
    try:
        resp = http_requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-sonnet-4-6",
                "max_tokens": 1024,
                "messages": [{
                    "role": "user",
                    "content": [
                        {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": img_b64}},
                        {"type": "text", "text": prompt},
                    ],
                }],
            },
            timeout=30,
        )
        resp.raise_for_status()
    except Exception as e:
        raise HTTPException(502, f"Error llamando Claude API: {e}")

    raw = resp.json()["content"][0]["text"].strip()

    # Parsear JSON de respuesta
    try:
        # Extraer JSON aunque venga con markdown
        match = re.search(r"\{[\s\S]+\}", raw)
        data = json.loads(match.group() if match else raw)
    except Exception:
        raise HTTPException(502, f"Claude no retornó JSON válido: {raw[:200]}")

    # Mapear ingredientes por nombre
    ing_by_name = {i.nombre.lower(): i for i in ingredientes}
    ahora = datetime.utcnow()
    guardados = []
    no_encontrados = []

    for item in data.get("items", []):
        nombre_lower = item.get("ingrediente", "").lower()
        ing = ing_by_name.get(nombre_lower)
        if not ing:
            # Búsqueda parcial
            ing = next((i for i in ingredientes if nombre_lower in i.nombre.lower() or i.nombre.lower() in nombre_lower), None)

        if ing and item.get("precio_unitario", 0) > 0:
            _upsert_precio(db, proveedor_id, ing.id, item["precio_unitario"], ahora, f"Boleta {data.get('fecha_boleta','')}")
            guardados.append({"ingrediente": ing.nombre, "precio": item["precio_unitario"], "confianza": item.get("confianza","?")})
        else:
            no_encontrados.append(item.get("ingrediente", "?"))

    db.commit()

    return {
        "guardados": guardados,
        "no_encontrados": no_encontrados,
        "no_reconocidos_boleta": data.get("no_reconocidos", []),
        "proveedor_detectado": data.get("proveedor_detectado", ""),
        "fecha_boleta": data.get("fecha_boleta", ""),
        "total_guardados": len(guardados),
    }
