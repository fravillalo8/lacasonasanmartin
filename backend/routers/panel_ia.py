"""Panel IA / Fase 1 de Zentral Gastro para La Casona San Martín (MesaControl).

Endpoints que envuelven lo que YA existe (recetas, ventas, merma, clientes,
auditoría) con una capa de decisión para el dueño:

  GET  /api/panel/margen-vivo        margen real por plato + ingeniería de menú
  GET  /api/panel/coach              3-5 acciones del día (IA si hay key, si no reglas)
  GET  /api/panel/sostenibilidad     "Comé sin culpa": merma valorizada + huella
  GET  /api/panel/anulaciones        "Ojo con las anulaciones" (admin)
  GET  /api/panel/clientes-dormidos  quiénes no vuelven (admin)
  POST /api/panel/winback-mensaje    mensaje de "Te extrañamos" (IA o plantilla)
  GET  /api/panel/fidelizacion       "Puntos que vuelven" (admin)

Todo degrada sin IA: si no está ANTHROPIC_API_KEY, el Coach y el win-back
usan reglas/plantillas en vez de romper.
"""
from datetime import datetime, timedelta
import re
import statistics
import unicodedata

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from database import get_db
from models import (
    Producto, Receta, ItemReceta, Ingrediente,
    Comanda, ItemComanda, Venta, Merma, ClienteFrecuente, AuditLog,
)
from routers.auth import require_auth, require_admin
import ia

router = APIRouter(prefix="/api/panel", tags=["panel-ia"])


# ---------------------------------------------------------------- helpers
def _hoy_bounds():
    now = datetime.utcnow()
    hoy0 = datetime(now.year, now.month, now.day)
    return hoy0, hoy0 + timedelta(days=1)


_STOP = {"de", "del", "la", "el", "los", "las", "con", "y", "a", "en", "al"}


def _norm(s: str) -> str:
    """Normaliza un nombre para emparejar producto<->receta (sin tildes/conectores)."""
    s = (s or "").lower().strip()
    s = "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^a-z0-9]+", " ", s)
    s = " ".join(w for w in s.split() if w not in _STOP)
    return s.strip()


def _recetas_index(db: Session):
    """Costo por porción de cada receta, indexado por id y por nombre normalizado.
    Evita N+1 y permite emparejar productos que no tienen receta_id seteado."""
    costo_by_id, id_by_norm = {}, {}
    for r in db.query(Receta).filter(Receta.activo == True).all():  # noqa: E712
        total = 0.0
        for it in db.query(ItemReceta).filter(ItemReceta.receta_id == r.id).all():
            ing = db.query(Ingrediente).filter(Ingrediente.id == it.ingrediente_id).first()
            if ing:
                total += (it.cantidad or 0) * (ing.costo_unitario or 0)
        porciones = r.porciones or 1
        costo_by_id[r.id] = total / porciones if porciones else total
        n = _norm(r.nombre)
        if n and n not in id_by_norm:
            id_by_norm[n] = r.id
    return costo_by_id, id_by_norm


def _popularidad(db: Session, dias: int):
    desde = datetime.utcnow() - timedelta(days=dias)
    rows = (
        db.query(ItemComanda.producto_id, func.sum(ItemComanda.cantidad))
        .join(Comanda, ItemComanda.comanda_id == Comanda.id)
        .filter(Comanda.estado == "cerrada", Comanda.created_at >= desde)
        .group_by(ItemComanda.producto_id)
        .all()
    )
    return {pid: int(qty or 0) for pid, qty in rows if pid is not None}


def _compute_margen_vivo(db: Session, dias: int):
    pop = _popularidad(db, dias)
    costo_by_id, id_by_norm = _recetas_index(db)
    productos = db.query(Producto).filter(Producto.activo == True).all()  # noqa: E712
    platos = []
    for p in productos:
        costo, origen = None, None
        if p.receta_id and p.receta_id in costo_by_id:
            costo, origen = costo_by_id[p.receta_id], "receta"          # enlace explícito
        else:
            rid = id_by_norm.get(_norm(p.nombre))                        # fallback por nombre
            if rid is not None:
                costo, origen = costo_by_id.get(rid), "nombre"
        precio = p.precio or 0
        margen = fc = None
        if costo is not None and precio:
            margen = precio - costo
            fc = costo / precio if precio else None
        platos.append({
            "id": p.id, "nombre": p.nombre, "categoria": p.categoria or "",
            "precio": round(precio),
            "costo": round(costo) if costo is not None else None,
            "margen": round(margen) if margen is not None else None,
            "food_cost_pct": round(fc * 100) if fc is not None else None,
            "vendidos": pop.get(p.id, 0),
            "sin_receta": costo is None,
            "origen_costo": origen,
        })

    con_datos = [x for x in platos if x["margen"] is not None]
    if con_datos:
        med_v = statistics.median([x["vendidos"] for x in con_datos])
        med_m = statistics.median([x["margen"] for x in con_datos])
        for x in platos:
            if x["margen"] is None:
                x["clasificacion"] = "sin_receta"
                continue
            alto_v = x["vendidos"] >= med_v
            alto_m = x["margen"] >= med_m
            x["clasificacion"] = (
                "estrella" if alto_v and alto_m else
                "caballo" if alto_v and not alto_m else
                "dilema" if (not alto_v) and alto_m else
                "perro"
            )
    else:
        for x in platos:
            x["clasificacion"] = "sin_receta"

    # primero lo accionable: perros, dilemas, luego el resto
    orden = {"perro": 0, "dilema": 1, "caballo": 2, "estrella": 3, "sin_receta": 4}
    platos.sort(key=lambda x: (orden.get(x.get("clasificacion", "sin_receta"), 9), -x["vendidos"]))

    fc_vals = [x["food_cost_pct"] for x in con_datos if x["food_cost_pct"] is not None]
    resumen = {
        "food_cost_promedio": round(sum(fc_vals) / len(fc_vals)) if fc_vals else None,
        "sin_receta": sum(1 for x in platos if x["sin_receta"]),
        "total": len(platos),
    }
    return {"dias": dias, "resumen": resumen, "platos": platos}


def _clp(n):
    return f"${round(n or 0):,}".replace(",", ".")


# ---------------------------------------------------------------- endpoints
@router.get("/margen-vivo")
def margen_vivo(dias: int = Query(30, ge=1, le=365),
                db: Session = Depends(get_db), _=Depends(require_auth)):
    return _compute_margen_vivo(db, dias)


@router.get("/coach")
def coach(db: Session = Depends(get_db), _=Depends(require_auth)):
    hoy0, hoy1 = _hoy_bounds()
    ayer0 = hoy0 - timedelta(days=1)

    v_hoy, n_hoy = (db.query(func.coalesce(func.sum(Venta.total), 0), func.count(Venta.id))
                    .filter(Venta.created_at >= hoy0, Venta.created_at < hoy1).first())
    v_ayer, _n_ayer = (db.query(func.coalesce(func.sum(Venta.total), 0), func.count(Venta.id))
                       .filter(Venta.created_at >= ayer0, Venta.created_at < hoy0).first())
    v_hoy, n_hoy, v_ayer = float(v_hoy or 0), int(n_hoy or 0), float(v_ayer or 0)
    var_pct = round((v_hoy - v_ayer) / v_ayer * 100) if v_ayer else None
    ticket = round(v_hoy / n_hoy) if n_hoy else 0

    mv = _compute_margen_vivo(db, 30)
    perros = [x for x in mv["platos"] if x.get("clasificacion") == "perro"]
    dilemas = [x for x in mv["platos"] if x.get("clasificacion") == "dilema"]

    stock_bajo = (db.query(Ingrediente)
                  .filter(Ingrediente.activo == True,  # noqa: E712
                          Ingrediente.stock <= Ingrediente.stock_minimo,
                          Ingrediente.stock_minimo > 0)
                  .order_by(Ingrediente.stock).limit(5).all())

    merma_hoy = db.query(func.coalesce(func.sum(Merma.costo_estimado), 0)).filter(
        Merma.created_at >= hoy0, Merma.created_at < hoy1).scalar() or 0

    corte = datetime.utcnow() - timedelta(days=30)
    n_dormidos = db.query(func.count(ClienteFrecuente.id)).filter(
        ClienteFrecuente.visitas >= 2, ClienteFrecuente.ultima_visita.isnot(None),
        ClienteFrecuente.ultima_visita < corte).scalar() or 0

    # --- acciones base por reglas (siempre funcionan) ---
    acciones = []
    for x in perros[:2]:
        acciones.append({"icono": "📉", "tipo": "margen",
                         "texto": f"“{x['nombre']}” casi no deja (food cost {x['food_cost_pct']}%). Súbele el precio o sácalo de la carta."})
    for ing in stock_bajo[:2]:
        acciones.append({"icono": "📦", "tipo": "stock",
                         "texto": f"Se está por acabar {ing.nombre} ({round(ing.stock, 1)} {ing.unidad}). Repón antes del próximo servicio."})
    if n_dormidos:
        acciones.append({"icono": "❤️", "tipo": "clientes",
                         "texto": f"{n_dormidos} cliente(s) frecuente(s) no vienen hace más de un mes. Mándales un “Te extrañamos”."})
    for x in dilemas[:1]:
        acciones.append({"icono": "🍽️", "tipo": "upsell",
                         "texto": f"“{x['nombre']}” deja buen margen pero se pide poco. Ponlo como sugerencia del garzón."})
    if merma_hoy > 0:
        acciones.append({"icono": "♻️", "tipo": "merma",
                         "texto": f"Hoy botaste {_clp(merma_hoy)} en merma. Revisa porciones o arma un combo con lo que va a vencer."})
    sin_receta = [x for x in mv["platos"] if x.get("sin_receta")]
    if len(sin_receta) >= 3:
        acciones.append({"icono": "📋", "tipo": "receta",
                         "texto": f"{len(sin_receta)} platos no tienen receta cargada: no puedo calcularte el margen de ellos. Cárgalas para activar Margen Vivo."})
    if not acciones:
        acciones.append({"icono": "✅", "tipo": "ok",
                         "texto": "Todo en orden hoy: sin quiebres de stock ni platos en rojo. Buen momento para empujar tus estrellas."})

    disponible_ia = ia.ia_disponible()
    if disponible_ia:
        try:
            datos = {
                "ventas_hoy": round(v_hoy), "ventas_ayer": round(v_ayer),
                "ticket_promedio": ticket, "num_ventas_hoy": n_hoy,
                "platos_en_rojo": [{"nombre": x["nombre"], "food_cost_pct": x["food_cost_pct"]} for x in perros[:3]],
                "empujar": [x["nombre"] for x in dilemas[:2]],
                "stock_bajo": [f"{i.nombre} ({round(i.stock,1)} {i.unidad})" for i in stock_bajo[:3]],
                "merma_hoy": round(merma_hoy), "clientes_dormidos": int(n_dormidos),
            }
            prompt = (
                "Eres el asesor de confianza del dueño de La Casona San Martín, una pizzería/café "
                "patrimonial en Rinconada de Los Andes, Chile. Con estos datos del día, dale de 3 a 5 "
                "acciones CONCRETAS para hoy, en lenguaje de dueño (tú), cálido y directo, cada una con "
                "una plata o número si aplica. Devuelve SOLO JSON con esta forma: "
                '{"resumen":"1 frase","acciones":[{"icono":"emoji","tipo":"margen|stock|clientes|upsell|merma","texto":"..."}]}. '
                f"Datos: {datos}"
            )
            parsed = ia.call_claude_json(prompt, max_tokens=700)
            if parsed and isinstance(parsed.get("acciones"), list) and parsed["acciones"]:
                acciones = parsed["acciones"][:5]
                resumen_ia = parsed.get("resumen")
            else:
                resumen_ia = None
        except Exception:  # noqa: BLE001
            disponible_ia = False
            resumen_ia = None
    else:
        resumen_ia = None

    return {
        "fecha": hoy0.date().isoformat(),
        "disponible_ia": disponible_ia,
        "resumen": {
            "ventas_hoy": round(v_hoy), "num_ventas_hoy": n_hoy,
            "ventas_ayer": round(v_ayer), "variacion_pct": var_pct,
            "ticket_promedio": ticket, "texto": resumen_ia,
        },
        "acciones": acciones,
    }


@router.get("/sostenibilidad")
def sostenibilidad(dias: int = Query(30, ge=1, le=365),
                   db: Session = Depends(get_db), _=Depends(require_auth)):
    desde = datetime.utcnow() - timedelta(days=dias)
    mermas = db.query(Merma).filter(Merma.created_at >= desde).all()
    costo_total = sum(m.costo_estimado or 0 for m in mermas)
    kg = 0.0
    por_motivo = {}
    for m in mermas:
        ing = db.query(Ingrediente).filter(Ingrediente.id == m.ingrediente_id).first()
        if ing:
            u = (ing.unidad or "").lower()
            if u in ("kg", "kilo", "kilos"):
                kg += (m.cantidad or 0)
            elif u in ("g", "gr", "gramo", "gramos"):
                kg += (m.cantidad or 0) / 1000
        d = por_motivo.setdefault(m.motivo or "otro", {"costo": 0, "eventos": 0})
        d["costo"] += (m.costo_estimado or 0)
        d["eventos"] += 1
    return {
        "dias": dias,
        "costo_total": round(costo_total),
        "eventos": len(mermas),
        "kg_estimados": round(kg, 1),
        "co2e_kg": round(kg * 2.5, 1),  # factor promedio aprox de alimentos
        "por_motivo": [
            {"motivo": k, "costo": round(v["costo"]), "eventos": v["eventos"]}
            for k, v in sorted(por_motivo.items(), key=lambda x: -x[1]["costo"])
        ],
    }


@router.get("/anulaciones")
def anulaciones(dias: int = Query(7, ge=1, le=90),
                db: Session = Depends(get_db), _=Depends(require_admin)):
    desde = datetime.utcnow() - timedelta(days=dias)
    palabras = ["anul", "cancel", "descuento", "invita", "elimin", "borr", "cortesia", "cortesía"]
    filtro = or_(*[AuditLog.accion.ilike(f"%{w}%") for w in palabras])
    logs = (db.query(AuditLog)
            .filter(AuditLog.created_at >= desde, filtro)
            .order_by(AuditLog.created_at.desc()).all())
    por_rol = {}
    for l in logs:
        por_rol[l.usuario_rol or "?"] = por_rol.get(l.usuario_rol or "?", 0) + 1
    return {
        "dias": dias,
        "total": len(logs),
        "por_rol": [{"rol": k, "cantidad": v} for k, v in sorted(por_rol.items(), key=lambda x: -x[1])],
        "recientes": [{
            "fecha": l.created_at.isoformat() if l.created_at else None,
            "accion": l.accion, "detalle": l.detalle, "rol": l.usuario_rol,
            "referencia": f"{l.referencia_tipo or ''} #{l.referencia_id}" if l.referencia_id else "",
        } for l in logs[:40]],
    }


@router.get("/clientes-dormidos")
def clientes_dormidos(dias: int = Query(30, ge=7, le=365),
                      db: Session = Depends(get_db), _=Depends(require_admin)):
    corte = datetime.utcnow() - timedelta(days=dias)
    cs = (db.query(ClienteFrecuente)
          .filter(ClienteFrecuente.visitas >= 2,
                  ClienteFrecuente.ultima_visita.isnot(None),
                  ClienteFrecuente.ultima_visita < corte)
          .order_by(ClienteFrecuente.gasto_total.desc()).all())
    out = []
    for c in cs:
        dsv = (datetime.utcnow() - c.ultima_visita).days if c.ultima_visita else None
        out.append({
            "id": c.id, "nombre": c.nombre, "telefono": c.telefono or "",
            "visitas": c.visitas, "gasto_total": round(c.gasto_total or 0),
            "dias_sin_venir": dsv,
        })
    return {"dias": dias, "total": len(out), "clientes": out}


class WinbackIn(BaseModel):
    nombre: str
    dias_sin_venir: int | None = None
    gasto_total: float | None = None


@router.post("/winback-mensaje")
def winback_mensaje(data: WinbackIn, _=Depends(require_admin)):
    nombre = (data.nombre or "").split()[0] if data.nombre else "hola"
    if not ia.ia_disponible():
        return {"disponible_ia": False,
                "mensaje": (f"¡Hola {nombre}! 👋 Te extrañamos en La Casona San Martín. "
                            f"Vuelve esta semana y te invitamos el postre 🍰 ¿Te esperamos?")}
    prompt = (
        "Escribe UN mensaje corto de WhatsApp (máximo 30 palabras, cálido, chileno, 1-2 emojis) "
        f"para invitar de vuelta a {data.nombre}, cliente de La Casona San Martín "
        "(pizzería y café patrimonial en Rinconada de Los Andes) que no viene hace "
        f"{data.dias_sin_venir or 'un tiempo'} días. Ofrece un gesto simple (postre o café de regalo). "
        "Devuelve solo el mensaje, sin comillas."
    )
    try:
        msg = ia.call_claude(prompt, max_tokens=200)
    except Exception:  # noqa: BLE001
        msg = f"¡Hola {nombre}! Te extrañamos en La Casona 🍕 Vuelve esta semana y te invitamos el postre 🍰"
    return {"disponible_ia": True, "mensaje": msg}


@router.get("/fidelizacion")
def fidelizacion(db: Session = Depends(get_db), _=Depends(require_admin)):
    cs = (db.query(ClienteFrecuente)
          .order_by(ClienteFrecuente.gasto_total.desc()).limit(50).all())
    out = [{
        "id": c.id, "nombre": c.nombre, "telefono": c.telefono or "",
        "visitas": c.visitas, "gasto_total": round(c.gasto_total or 0),
        "puntos": int((c.gasto_total or 0) // 1000),
        "ultima_visita": c.ultima_visita.isoformat() if c.ultima_visita else None,
    } for c in cs]
    return {"regla": "1 punto por cada $1.000 gastados", "clientes": out}
