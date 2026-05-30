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
from models import Ingrediente, Proveedor, PrecioProveedor, MovimientoStock
from routers.auth import require_admin, require_heavy_ratelimit

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
    fecha_map  = {k: v.fecha  for k, v in pp_map.items()}
    notas_map  = {k: v.notas  for k, v in pp_map.items()}

    ahora = datetime.now(timezone.utc)
    stale_cutoff = ahora - timedelta(days=STALE_DAYS)

    rows = []
    for ing in ingredientes:
        precios_ing: dict[int, float | None] = {}
        fechas_ing:  dict[int, str | None]   = {}
        notas_ing:   dict[int, str | None]   = {}
        valores = []
        for prov in proveedores:
            p = precio_map.get((ing.id, prov.id))
            f = fecha_map.get((ing.id, prov.id))
            n = notas_map.get((ing.id, prov.id))
            precios_ing[prov.id] = p
            fechas_ing[prov.id]  = f.isoformat() if f else None
            notas_ing[prov.id]   = n or None
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
            "fechas":  fechas_ing,
            "notas":   notas_ing,
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


# ─── Scrapers supermercados ───────────────────────────────────────────────────

SCRAPER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    "Accept": "application/json, text/html, */*",
}

# Cadenas que usan plataforma VTEX  → keyword en nombre del proveedor: URL base de búsqueda
VTEX_STORES: dict[str, str] = {
    "jumbo":         "https://www.jumbo.cl/api/catalog_system/pub/products/search",
    "santa isabel":  "https://www.santaisabel.cl/api/catalog_system/pub/products/search",
    "unimarc":       "https://www.unimarc.cl/api/catalog_system/pub/products/search",
    "acuenta":       "https://www.acuenta.cl/api/catalog_system/pub/products/search",
}

# Lider / Walmart Chile: plataforma propia (Next.js + Algolia)
LIDER_KEYWORDS = {"lider", "líder", "walmart"}


def _vtex_search(base_url: str, query: str) -> dict | None:
    """Retorna {"precio": X, "producto": "nombre encontrado"} con el precio más bajo en VTEX."""
    try:
        resp = http_requests.get(
            base_url,
            params={"ft": query, "_from": 0, "_to": 4},
            headers=SCRAPER_HEADERS,
            timeout=10,
        )
        if not resp.ok:
            return None
        best_precio: float | None = None
        best_nombre = ""
        for prod in resp.json():
            nombre_prod = prod.get("productName", "")
            for sku in prod.get("items", []):
                for seller in sku.get("sellers", []):
                    p = seller.get("commertialOffer", {}).get("Price", 0)
                    if p and p > 0:
                        if best_precio is None or p < best_precio:
                            best_precio = p
                            best_nombre = nombre_prod or sku.get("name", "")
        if best_precio is None:
            return None
        return {"precio": best_precio, "producto": best_nombre[:80]}
    except Exception:
        return None


def _lider_search(query: str) -> dict | None:
    """Busca en Líder.cl (Walmart Chile). Intenta JSON API, luego __NEXT_DATA__, luego regex HTML."""
    encoded = http_requests.utils.quote(query)

    # 1) Intentar endpoint REST de Algolia que usa lider.cl
    try:
        resp = http_requests.get(
            "https://www.lider.cl/supermercado/api/search",
            params={"q": query, "hitsPerPage": 5, "page": 0},
            headers=SCRAPER_HEADERS,
            timeout=10,
        )
        if resp.ok:
            data = resp.json()
            hits = data.get("hits") or data.get("results", [{}])[0].get("hits", [])
            best = None
            for h in hits:
                p = h.get("price") or h.get("offerPrice") or h.get("priceRange", {}).get("offerPrice", 0)
                if isinstance(p, (int, float)) and p > 0:
                    if best is None or p < best["precio"]:
                        best = {"precio": float(p), "producto": (h.get("name") or h.get("title") or "")[:80]}
            if best:
                return best
    except Exception:
        pass

    # 2) Intentar VTEX (Líder tenía VTEX en el pasado)
    vtex = _vtex_search("https://www.lider.cl/api/catalog_system/pub/products/search", query)
    if vtex:
        return vtex

    # 3) HTML scraping con __NEXT_DATA__ y regex de respaldo
    try:
        resp = http_requests.get(
            f"https://www.lider.cl/supermercado/search?q={encoded}",
            headers={**SCRAPER_HEADERS, "Accept": "text/html"},
            timeout=12,
        )
        if not resp.ok:
            return None
        html = resp.text

        # Buscar en __NEXT_DATA__
        match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(\{.*?\})</script>', html, re.DOTALL)
        if match:
            try:
                ndata = json.loads(match.group(1))
                text_ndata = json.dumps(ndata)
                price_matches = re.findall(r'"(?:price|offerPrice|listPrice)"\s*:\s*(\d+(?:\.\d+)?)', text_ndata)
                precios = [float(p) for p in price_matches if float(p) > 100]
                if precios:
                    return {"precio": min(precios), "producto": ""}
            except Exception:
                pass

        # Regex de último recurso
        soup = BeautifulSoup(html, "lxml")
        prices = []
        for el in soup.select("[class*='price'], [class*='Price'], [class*='precio'], [data-testid*='price']"):
            text = re.sub(r"[^\d]", "", el.get_text())
            if text and 3 <= len(text) <= 6:
                prices.append(int(text))
        return {"precio": min(prices), "producto": ""} if prices else None
    except Exception:
        return None


# Mapa ingrediente → término de búsqueda optimizado por supermercado chileno
SEARCH_TERMS: dict[str, str] = {
    "Carne de pollo":         "pechuga pollo kg",
    "Carne de vacuno":        "carne molida vacuno kg",
    "Carne de cordero":       "pierna cordero kg",
    "Carne mixta shawarma":   "pollo entero kg",
    "Pan pita":               "pan pita",
    "Pan árabe grande":       "pan arabe",
    "Cebolla":                "cebolla kg",
    "Tomate":                 "tomate kg",
    "Lechuga":                "lechuga",
    "Pepino":                 "pepino",
    "Repollo":                "repollo",
    "Perejil":                "perejil",
    "Limón":                  "limon kg",
    "Ajo":                    "ajo cabeza",
    "Papas":                  "papas kg",
    "Berenjenas":             "berenjena",
    "Tahini":                 "tahini pasta sesamo",
    "Yogur natural":          "yogur natural sin azucar",
    "Mayonesa":               "mayonesa 1kg",
    "Queso blanco":           "queso mantecoso",
    "Crema de leche":         "crema leche 200ml",
    "Aceite vegetal":         "aceite vegetal 1 litro",
    "Aceite de oliva":        "aceite oliva",
    "Comino molido":          "comino molido",
    "Paprika":                "paprika molida",
    "Cúrcuma":                "curcuma molida",
    "Canela molida":          "canela molida",
    "Pimienta negra":         "pimienta negra molida",
    "Cardamomo molido":       "cardamomo",
    "Mezcla especias shawarma": "mezcla especias",
    "Sal":                    "sal 1kg",
    "Arroz":                  "arroz largo 1kg",
    "Garbanzos secos":        "garbanzos secos",
    "Aceitunas negras":       "aceitunas negras",
    "Pepinillos encurtidos":  "pepinillos encurtidos",
    "Vinagre blanco":         "vinagre blanco",
    "Azúcar":                 "azucar 1kg",
    "Agua mineral 500ml":     "agua mineral 500ml",
    "Bebida lata 350ml":      "coca cola lata",
    "Jugo natural (naranja)": "naranja malla",
}


def _get_search_fn(nombre_proveedor: str):
    """Retorna la función de búsqueda apropiada para el proveedor, o None si no tiene scraper."""
    nombre_lower = nombre_proveedor.lower()
    # VTEX stores
    for keyword, vtex_url in VTEX_STORES.items():
        if keyword in nombre_lower:
            return lambda q, u=vtex_url: _vtex_search(u, q)
    # Líder / Walmart Chile
    if any(k in nombre_lower for k in LIDER_KEYWORDS):
        return _lider_search
    return None


@router.post("/actualizar-precios-web")
async def actualizar_precios_web(body: dict, db: Session = Depends(get_db), _=Depends(require_heavy_ratelimit)):
    """
    Consulta las webs de supermercados en vivo y actualiza precios en la BD.
    body: { "ingrediente_ids": [1,2,3] }  — si vacío actualiza todos los ingredientes.
    Cadenas soportadas: Jumbo, Santa Isabel, Unimarc, Acuenta (VTEX), Líder (HTML).
    """
    ing_ids: list[int] = body.get("ingrediente_ids", [])
    proveedores = db.query(Proveedor).filter(Proveedor.activo == True).all()

    # Filtrar solo los que tienen scraper
    provs_con_scraper = [(p, _get_search_fn(p.nombre)) for p in proveedores]
    provs_con_scraper = [(p, fn) for p, fn in provs_con_scraper if fn is not None]

    if not provs_con_scraper:
        raise HTTPException(400, "No hay proveedores con scraper configurado (Jumbo, Santa Isabel, Unimarc, Acuenta, Líder)")

    query_ings = (
        db.query(Ingrediente).filter(Ingrediente.id.in_(ing_ids), Ingrediente.activo == True).all()
        if ing_ids else
        db.query(Ingrediente).filter(Ingrediente.activo == True).all()
    )

    # Ejecutar scrapers síncronos en thread pool para no bloquear el event loop
    import asyncio

    def _run_scrapers():
        resultados_local = []
        actualizados_local = 0
        ahora = datetime.utcnow()
        for ing in query_ings:
            termino = SEARCH_TERMS.get(ing.nombre, ing.nombre)
            fila: dict = {"ingrediente_id": ing.id, "nombre": ing.nombre}
            ing_actualizado = False
            for prov, search_fn in provs_con_scraper:
                result = search_fn(termino)
                fila[prov.nombre] = result["precio"] if result else None
                if result and result["precio"] > 0:
                    notas_prod = result.get("producto") or f"{prov.nombre} web"
                    _upsert_precio(db, prov.id, ing.id, result["precio"], ahora, notas_prod)
                    ing_actualizado = True
            if ing_actualizado:
                actualizados_local += 1
            resultados_local.append(fila)
        db.commit()
        return actualizados_local, resultados_local

    actualizados, resultados = await asyncio.to_thread(_run_scrapers)

    cadenas_usadas = [p.nombre for p, _ in provs_con_scraper]
    return {
        "actualizados": actualizados,
        "total": len(resultados),
        "cadenas": cadenas_usadas,
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
    _=Depends(require_heavy_ratelimit),
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

Extrae los datos de los productos en la boleta que correspondan a mis ingredientes.
- precio_unitario: precio por unidad del ingrediente (ej: si compró 2kg a $3.000 total → precio_unitario=$1.500/kg)
- cantidad_comprada: cantidad total comprada en la unidad del ingrediente (ej: 2 si compró 2kg)
- Si no puedes determinar la cantidad con certeza, usa 0.

Responde SOLO con JSON válido, sin texto adicional:
{{
  "proveedor_detectado": "nombre del supermercado si aparece en la boleta",
  "fecha_boleta": "YYYY-MM-DD si aparece",
  "items": [
    {{
      "ingrediente": "nombre exacto del ingrediente de mi lista",
      "precio_unitario": 1500,
      "cantidad_comprada": 2.0,
      "unidad": "kg",
      "confianza": "alta|media|baja"
    }}
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

    stock_actualizado: list[dict] = []

    for item in data.get("items", []):
        nombre_lower = item.get("ingrediente", "").lower()
        ing = ing_by_name.get(nombre_lower)
        if not ing:
            ing = next((i for i in ingredientes if nombre_lower in i.nombre.lower() or i.nombre.lower() in nombre_lower), None)

        precio = item.get("precio_unitario", 0)
        cantidad = item.get("cantidad_comprada", 0) or 0

        if ing and precio > 0:
            _upsert_precio(db, proveedor_id, ing.id, precio, ahora, f"Boleta {data.get('fecha_boleta','')}")
            entrada = {"ingrediente": ing.nombre, "precio": precio, "confianza": item.get("confianza", "?"), "cantidad_ingresada": None}

            # Actualizar stock si se indicó cantidad comprada
            if cantidad > 0:
                ing.stock = round(ing.stock + cantidad, 6)
                ing.costo_unitario = precio  # actualiza costo de referencia
                db.add(MovimientoStock(
                    ingrediente_id=ing.id,
                    tipo="ENTRADA",
                    cantidad=cantidad,
                    motivo=f"Compra boleta — {prov.nombre}",
                    referencia_id=proveedor_id,
                    referencia_tipo="boleta",
                ))
                entrada["cantidad_ingresada"] = cantidad
                stock_actualizado.append({"ingrediente": ing.nombre, "cantidad": cantidad, "unidad": ing.unidad, "stock_nuevo": ing.stock})

            guardados.append(entrada)
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
        "stock_actualizado": stock_actualizado,
    }


# ─── Predicción de compras ────────────────────────────────────────────────────

@router.get("/prediccion-compras")
def prediccion_compras(
    dias: int = 30,
    dias_objetivo: int = 14,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """
    Analiza el consumo de los últimos `dias` días (SALIDA de stock) y predice
    cuándo se agotará cada ingrediente, sugiriendo cantidades a pedir para
    cubrir `dias_objetivo` días adicionales.
    """
    desde = datetime.utcnow() - timedelta(days=dias)

    movimientos = (
        db.query(MovimientoStock)
        .filter(MovimientoStock.tipo == "SALIDA", MovimientoStock.created_at >= desde)
        .all()
    )

    # Suma de consumo por ingrediente en el período
    consumo_total: dict[int, float] = {}
    for mov in movimientos:
        consumo_total[mov.ingrediente_id] = consumo_total.get(mov.ingrediente_id, 0) + abs(mov.cantidad)

    ingredientes = db.query(Ingrediente).filter(Ingrediente.activo == True).order_by(Ingrediente.nombre).all()

    resultado = []
    for ing in ingredientes:
        total_consumido = consumo_total.get(ing.id, 0)
        consumo_diario = total_consumido / dias if dias > 0 else 0

        if consumo_diario > 0:
            dias_hasta_agotarse: float | None = ing.stock / consumo_diario
        else:
            dias_hasta_agotarse = None

        cantidad_sugerida = max(0.0, consumo_diario * dias_objetivo - ing.stock) if consumo_diario > 0 else 0.0

        if dias_hasta_agotarse is not None:
            if dias_hasta_agotarse < 3:
                urgencia = "critico"
            elif dias_hasta_agotarse < 7:
                urgencia = "alto"
            elif dias_hasta_agotarse < dias_objetivo:
                urgencia = "medio"
            else:
                urgencia = "ok"
        else:
            urgencia = "sin_datos" if total_consumido == 0 else "ok"

        resultado.append({
            "ingrediente_id": ing.id,
            "nombre": ing.nombre,
            "unidad": ing.unidad,
            "stock_actual": ing.stock,
            "stock_minimo": ing.stock_minimo,
            "consumo_diario": round(consumo_diario, 4),
            "consumo_periodo": round(total_consumido, 3),
            "dias_hasta_agotarse": round(dias_hasta_agotarse, 1) if dias_hasta_agotarse is not None else None,
            "cantidad_sugerida": round(cantidad_sugerida, 3),
            "urgencia": urgencia,
        })

    # Ordenar: críticos primero, luego por días hasta agotarse
    def _sort_key(r: dict):
        orden = {"critico": 0, "alto": 1, "medio": 2, "ok": 3, "sin_datos": 4}
        d = r["dias_hasta_agotarse"] if r["dias_hasta_agotarse"] is not None else 9999
        return (orden.get(r["urgencia"], 5), d)

    resultado.sort(key=_sort_key)

    criticos = [r for r in resultado if r["urgencia"] == "critico"]
    altos    = [r for r in resultado if r["urgencia"] == "alto"]

    return {
        "periodo_dias": dias,
        "dias_objetivo": dias_objetivo,
        "ingredientes": resultado,
        "resumen": {
            "criticos": len(criticos),
            "altos":    len(altos),
            "con_datos": sum(1 for r in resultado if r["urgencia"] != "sin_datos"),
        },
    }
