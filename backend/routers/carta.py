"""Carta pública + Auto-Pedido QR (Zentral Gastro · Fase 2).

Endpoints SIN auth para que el comensal ordene desde su mesa escaneando el QR:
  GET  /api/carta/mesa/{id}   datos mínimos de la mesa (para mostrar "Mesa 7")
  POST /api/carta/pedido      crea/append a la comanda de la mesa y avisa a cocina (SSE)

Seguridad (endpoint público que ESCRIBE):
  - rate limit por IP (real, vía X-Forwarded-For detrás del proxy de Railway)
  - precio SIEMPRE del servidor (nunca se confía en el precio del cliente)
  - se valida mesa y que el producto exista/activo/no agotado
  - topes anti-abuso (cantidad, ítems, unidades)
  - la comanda queda marcada "📱 Pedido del cliente (QR)" para que el garzón la confirme
El menú se sirve por el endpoint ya existente GET /api/productos/carta.
"""
import time
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, field_validator
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Mesa, Comanda, ItemComanda, Producto, AuditLog
from routers.events import broadcast
from routers.comandas import _asignar_ticket

router = APIRouter(prefix="/api/carta", tags=["carta-publica"])

# ── rate limit simple en memoria (máx N pedidos por IP por ventana) ──────────
_RL: dict[str, list] = defaultdict(list)
_RL_MAX = 6
_RL_WINDOW = 300  # 5 minutos


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "?"


def _rate_limit(ip: str):
    now = time.time()
    hits = [t for t in _RL.get(ip, []) if now - t < _RL_WINDOW]
    if len(hits) >= _RL_MAX:
        raise HTTPException(429, "Demasiados pedidos seguidos. Espera un momento e intenta de nuevo.")
    hits.append(now)
    _RL[ip] = hits


class PedidoItemIn(BaseModel):
    producto_id: int
    cantidad: int = 1
    notas: str = ""

    @field_validator("cantidad")
    @classmethod
    def _cant(cls, v: int) -> int:
        if not (1 <= v <= 20):
            raise ValueError("cantidad debe estar entre 1 y 20")
        return v


class PedidoIn(BaseModel):
    mesa_id: int
    items: list[PedidoItemIn]
    cliente_nombre: str = ""
    comentario: str = ""


@router.get("/mesa/{mesa_id}")
def get_mesa(mesa_id: int, db: Session = Depends(get_db)):
    m = db.query(Mesa).filter(Mesa.id == mesa_id).first()
    if not m:
        raise HTTPException(404, "Mesa no encontrada")
    return {"id": m.id, "numero": m.numero, "nombre": m.nombre or ""}


@router.post("/pedido")
def crear_pedido(data: PedidoIn, request: Request, db: Session = Depends(get_db)):
    _rate_limit(_client_ip(request))

    if not data.items:
        raise HTTPException(400, "El pedido está vacío.")
    if len(data.items) > 15 or sum(i.cantidad for i in data.items) > 40:
        raise HTTPException(400, "El pedido es demasiado grande. Llama a un garzón para ayudarte.")

    mesa = db.query(Mesa).filter(Mesa.id == data.mesa_id).first()
    if not mesa:
        raise HTTPException(404, "Mesa no encontrada.")

    # comanda abierta de la mesa, o una nueva marcada como pedido del cliente
    c = db.query(Comanda).filter(Comanda.mesa_id == mesa.id, Comanda.estado == "abierta").first()
    nueva = c is None
    if nueva:
        c = Comanda(mesa_id=mesa.id, numero_ticket=_asignar_ticket(db),
                    notas="📱 Pedido del cliente (QR)")
        db.add(c)
        db.flush()
    mesa.estado = "ocupada"

    agregados = 0
    no_disponibles = 0
    for it in data.items:
        prod = db.query(Producto).filter(
            Producto.id == it.producto_id, Producto.activo == True  # noqa: E712
        ).first()
        if not prod or prod.agotado_hoy:
            no_disponibles += 1  # se avisa al cliente en la respuesta
            continue
        nota = (it.notas or "").strip()[:200]
        existing = next(
            (x for x in c.items if x.producto_id == prod.id and (x.notas or "") == nota), None
        )
        if existing:
            existing.cantidad += it.cantidad
            existing.subtotal = existing.cantidad * existing.precio_unitario
        else:
            db.add(ItemComanda(
                comanda_id=c.id, producto_id=prod.id, cantidad=it.cantidad,
                precio_unitario=prod.precio, subtotal=prod.precio * it.cantidad, notas=nota,
            ))
        agregados += 1

    if agregados == 0:
        db.rollback()
        raise HTTPException(400, "Ninguno de los productos está disponible en este momento.")

    db.flush()
    c.total = db.query(func.sum(ItemComanda.subtotal)).filter(
        ItemComanda.comanda_id == c.id
    ).scalar() or 0.0
    if data.cliente_nombre.strip():
        c.cliente_nombre = data.cliente_nombre.strip()[:100]
    if data.comentario.strip():
        extra = data.comentario.strip()[:200]
        c.notas = (f"{c.notas} · {extra}" if c.notas else extra)[:300]

    db.add(AuditLog(
        accion="pedido_qr",
        detalle=f"Mesa {mesa.numero}: {agregados} ítem(s) pedidos por QR",
        usuario_rol="cliente", referencia_id=c.id, referencia_tipo="comanda",
    ))
    db.commit()

    broadcast("comanda_nueva" if nueva else "comanda_update",
              {"comanda_id": c.id, "numero_mesa": mesa.numero})

    return {
        "ok": True,
        "comanda_id": c.id,
        "numero_ticket": c.numero_ticket,
        "numero_mesa": mesa.numero,
        "total": c.total,
        "items_agregados": agregados,
        "no_disponibles": no_disponibles,
        "mensaje": "¡Pedido enviado a la cocina! 🔥",
    }


class LlamarIn(BaseModel):
    mesa_id: int
    motivo: str = ""   # libre: "la cuenta", "ayuda", etc.


@router.post("/llamar")
def llamar_garzon(data: LlamarIn, request: Request, db: Session = Depends(get_db)):
    _rate_limit(_client_ip(request))
    mesa = db.query(Mesa).filter(Mesa.id == data.mesa_id).first()
    if not mesa:
        raise HTTPException(404, "Mesa no encontrada.")
    motivo = (data.motivo or "").strip()[:40]
    db.add(AuditLog(
        accion="llamada_mesa",
        detalle=f"Mesa {mesa.numero} llama al garzón" + (f" ({motivo})" if motivo else ""),
        usuario_rol="cliente", referencia_id=mesa.id, referencia_tipo="mesa",
    ))
    db.commit()
    broadcast("llamada_mesa", {"numero_mesa": mesa.numero, "motivo": motivo})
    return {"ok": True, "mensaje": "Ya le avisamos al garzón 🙌"}
