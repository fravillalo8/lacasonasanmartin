from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import Mesa, Comanda, ItemComanda, Producto, Venta, Receta, ItemReceta, Ingrediente, MovimientoStock
from routers.auth import require_auth

router = APIRouter(prefix="/api/comandas", tags=["comandas"])


class ItemIn(BaseModel):
    producto_id: int
    cantidad: int = 1
    notas: str = ""


class DeliveryIn(BaseModel):
    cliente_nombre: str = "Para llevar"


class PagoIn(BaseModel):
    tipo_pago: str = "efectivo"
    monto_recibido: float = 0
    descuento_pct: float = 0   # porcentaje de descuento 0-100
    descuento_monto: float = 0  # monto fijo adicional (se suma al calculado por %)
    propina: float = 0


class ItemOut(BaseModel):
    id: int
    producto_id: int
    nombre_producto: str
    cantidad: int
    precio_unitario: float
    subtotal: float
    notas: str

    class Config:
        from_attributes = True


class ComandaOut(BaseModel):
    id: int
    mesa_id: Optional[int]
    numero_mesa: int
    tipo: str
    cliente_nombre: str
    estado: str
    total: float
    notas: str
    created_at: str
    items: list[ItemOut]

    class Config:
        from_attributes = True


def _build_comanda_out(c: Comanda) -> ComandaOut:
    items = []
    for it in c.items:
        items.append(ItemOut(
            id=it.id,
            producto_id=it.producto_id,
            nombre_producto=it.producto.nombre if it.producto else "",
            cantidad=it.cantidad,
            precio_unitario=it.precio_unitario,
            subtotal=it.subtotal,
            notas=it.notas,
        ))
    return ComandaOut(
        id=c.id,
        mesa_id=c.mesa_id,
        numero_mesa=c.mesa.numero if c.mesa else 0,
        tipo=c.tipo if c.tipo else "mesa",
        cliente_nombre=c.cliente_nombre if c.cliente_nombre else "",
        estado=c.estado,
        total=c.total,
        notas=c.notas,
        created_at=c.created_at.isoformat() if c.created_at else "",
        items=items,
    )


@router.post("/abrir/{mesa_id}", response_model=ComandaOut)
def abrir_comanda(mesa_id: int, db: Session = Depends(get_db), _=Depends(require_auth)):
    mesa = db.query(Mesa).filter(Mesa.id == mesa_id).first()
    if not mesa:
        raise HTTPException(404, "Mesa no encontrada")
    existente = db.query(Comanda).filter(Comanda.mesa_id == mesa_id, Comanda.estado == "abierta").first()
    if existente:
        return _build_comanda_out(db.query(Comanda).options(
            joinedload(Comanda.mesa),
            joinedload(Comanda.items).joinedload(ItemComanda.producto)
        ).filter(Comanda.id == existente.id).first())
    c = Comanda(mesa_id=mesa_id)
    mesa.estado = "ocupada"
    db.add(c)
    db.commit()
    db.refresh(c)
    return _build_comanda_out(db.query(Comanda).options(
        joinedload(Comanda.mesa),
        joinedload(Comanda.items).joinedload(ItemComanda.producto)
    ).filter(Comanda.id == c.id).first())


@router.get("/cocina")
def vista_cocina(db: Session = Depends(get_db), _=Depends(require_auth)):
    """Retorna todas las comandas abiertas para la vista de cocina."""
    comandas = (
        db.query(Comanda)
        .options(joinedload(Comanda.mesa), joinedload(Comanda.items).joinedload(ItemComanda.producto))
        .filter(Comanda.estado == "abierta")
        .order_by(Comanda.created_at)
        .all()
    )
    return [_build_comanda_out(c) for c in comandas]


@router.post("/delivery", response_model=ComandaOut)
def abrir_delivery(data: DeliveryIn, db: Session = Depends(get_db), _=Depends(require_auth)):
    c = Comanda(tipo="delivery", cliente_nombre=data.cliente_nombre)
    db.add(c)
    db.commit()
    db.refresh(c)
    return _build_comanda_out(db.query(Comanda).options(
        joinedload(Comanda.mesa),
        joinedload(Comanda.items).joinedload(ItemComanda.producto)
    ).filter(Comanda.id == c.id).first())


@router.get("/activos")
def listar_activos(db: Session = Depends(get_db), _=Depends(require_auth)):
    """Retorna todas las comandas abiertas (mesa + delivery)."""
    comandas = (
        db.query(Comanda)
        .options(joinedload(Comanda.mesa), joinedload(Comanda.items).joinedload(ItemComanda.producto))
        .filter(Comanda.estado == "abierta")
        .order_by(Comanda.created_at)
        .all()
    )
    return [_build_comanda_out(c) for c in comandas]


@router.get("/{comanda_id}", response_model=ComandaOut)
def ver_comanda(comanda_id: int, db: Session = Depends(get_db), _=Depends(require_auth)):
    c = db.query(Comanda).options(
        joinedload(Comanda.mesa),
        joinedload(Comanda.items).joinedload(ItemComanda.producto)
    ).filter(Comanda.id == comanda_id).first()
    if not c:
        raise HTTPException(404, "Comanda no encontrada")
    return _build_comanda_out(c)


@router.post("/{comanda_id}/items", response_model=ComandaOut)
def agregar_item(comanda_id: int, data: ItemIn, db: Session = Depends(get_db), _=Depends(require_auth)):
    c = db.query(Comanda).filter(Comanda.id == comanda_id, Comanda.estado == "abierta").first()
    if not c:
        raise HTTPException(404, "Comanda no encontrada o ya cerrada")
    prod = db.query(Producto).filter(Producto.id == data.producto_id).first()
    if not prod:
        raise HTTPException(404, "Producto no encontrado")

    # If product already in comanda, increase quantity
    existing = next((it for it in c.items if it.producto_id == data.producto_id), None)
    if existing:
        existing.cantidad += data.cantidad
        existing.subtotal = existing.cantidad * existing.precio_unitario
    else:
        item = ItemComanda(
            comanda_id=comanda_id,
            producto_id=data.producto_id,
            cantidad=data.cantidad,
            precio_unitario=prod.precio,
            subtotal=prod.precio * data.cantidad,
            notas=data.notas,
        )
        db.add(item)

    db.flush()
    # Expire c so the items relationship reloads from DB (includes the newly added item)
    db.expire(c)
    c.total = sum(it.subtotal for it in c.items)
    db.commit()

    return _build_comanda_out(db.query(Comanda).options(
        joinedload(Comanda.mesa),
        joinedload(Comanda.items).joinedload(ItemComanda.producto)
    ).filter(Comanda.id == comanda_id).first())


@router.delete("/{comanda_id}/items/{item_id}", response_model=ComandaOut)
def quitar_item(comanda_id: int, item_id: int, db: Session = Depends(get_db), _=Depends(require_auth)):
    c = db.query(Comanda).filter(Comanda.id == comanda_id, Comanda.estado == "abierta").first()
    if not c:
        raise HTTPException(404, "Comanda no encontrada o ya cerrada")
    item = db.query(ItemComanda).filter(ItemComanda.id == item_id, ItemComanda.comanda_id == comanda_id).first()
    if not item:
        raise HTTPException(404, "Item no encontrado")
    db.delete(item)
    db.flush()
    db.expire(c)
    c.total = sum(it.subtotal for it in c.items)
    db.commit()

    return _build_comanda_out(db.query(Comanda).options(
        joinedload(Comanda.mesa),
        joinedload(Comanda.items).joinedload(ItemComanda.producto)
    ).filter(Comanda.id == comanda_id).first())


@router.post("/{comanda_id}/cobrar")
def cobrar(comanda_id: int, data: PagoIn, db: Session = Depends(get_db), _=Depends(require_auth)):
    c = db.query(Comanda).options(
        joinedload(Comanda.mesa),
        joinedload(Comanda.items)
    ).filter(Comanda.id == comanda_id, Comanda.estado == "abierta").first()
    if not c:
        raise HTTPException(404, "Comanda no encontrada o ya cerrada")

    subtotal = c.total
    descuento = round(subtotal * data.descuento_pct / 100, 0) + data.descuento_monto
    total_final = max(0, subtotal - descuento + data.propina)
    vuelto = max(0, data.monto_recibido - total_final)

    venta = Venta(
        comanda_id=comanda_id,
        subtotal=subtotal,
        descuento=descuento,
        propina=data.propina,
        total=total_final,
        tipo_pago=data.tipo_pago,
        monto_recibido=data.monto_recibido,
        vuelto=vuelto,
        numero_mesa=c.mesa.numero if c.mesa else 0,
    )
    db.add(venta)
    c.estado = "cerrada"
    c.closed_at = datetime.utcnow()
    if c.mesa:
        c.mesa.estado = "libre"

    # ── Descontar ingredientes de inventario según receta vinculada ──────────
    ingredientes_descontados = 0
    for item in c.items:
        prod = db.get(Producto, item.producto_id)
        if not prod or not prod.receta_id:
            continue
        receta = (
            db.query(Receta)
            .filter(Receta.id == prod.receta_id, Receta.activo == True)
            .first()
        )
        if not receta:
            continue
        # Factor: porciones_pedidas / porciones_que_rinde_la_receta
        factor = item.cantidad / (receta.porciones or 1)
        for ir in receta.items:
            if not ir.ingrediente:
                continue
            necesario = round(ir.cantidad * factor, 6)
            ir.ingrediente.stock = round(ir.ingrediente.stock - necesario, 6)
            db.add(MovimientoStock(
                ingrediente_id=ir.ingrediente_id,
                tipo="SALIDA",
                cantidad=-necesario,
                motivo=f"Venta: {prod.nombre} ×{item.cantidad}",
                referencia_id=comanda_id,
                referencia_tipo="comanda",
            ))
            ingredientes_descontados += 1

    db.commit()
    return {
        "ok": True,
        "subtotal": subtotal,
        "descuento": descuento,
        "propina": data.propina,
        "total": total_final,
        "vuelto": vuelto,
        "ingredientes_descontados": ingredientes_descontados,
    }


@router.post("/{comanda_id}/cancelar")
def cancelar(comanda_id: int, db: Session = Depends(get_db), _=Depends(require_auth)):
    c = db.query(Comanda).options(joinedload(Comanda.mesa)).filter(
        Comanda.id == comanda_id, Comanda.estado == "abierta"
    ).first()
    if not c:
        raise HTTPException(404, "Comanda no encontrada o ya cerrada")
    c.estado = "cancelada"
    c.closed_at = datetime.utcnow()
    if c.mesa:
        c.mesa.estado = "libre"
    db.commit()
    return {"ok": True}
