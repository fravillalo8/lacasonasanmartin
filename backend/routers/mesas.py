from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import Mesa, Comanda, ItemComanda, Venta
from routers.auth import require_auth

router = APIRouter(prefix="/api/mesas", tags=["mesas"])


class MesaIn(BaseModel):
    numero: int
    nombre: str = ""
    capacidad: int = 4
    posicion_x: int = 0
    posicion_y: int = 0


class PosicionIn(BaseModel):
    posicion_x: int
    posicion_y: int


class MesaOut(BaseModel):
    id: int
    numero: int
    nombre: str
    capacidad: int
    estado: str
    posicion_x: int = 0
    posicion_y: int = 0
    comanda_abierta_id: Optional[int] = None

    class Config:
        from_attributes = True


def _mesa_out(m: Mesa, db: Session) -> MesaOut:
    comanda = db.query(Comanda).filter(
        Comanda.mesa_id == m.id,
        Comanda.estado == "abierta"
    ).first()
    return MesaOut(
        id=m.id,
        numero=m.numero,
        nombre=m.nombre,
        capacidad=m.capacidad,
        estado=m.estado,
        posicion_x=getattr(m, "posicion_x", 0) or 0,
        posicion_y=getattr(m, "posicion_y", 0) or 0,
        comanda_abierta_id=comanda.id if comanda else None,
    )


@router.get("", response_model=list[MesaOut])
def listar(db: Session = Depends(get_db), _=Depends(require_auth)):
    mesas = db.query(Mesa).order_by(Mesa.numero).all()
    return [_mesa_out(m, db) for m in mesas]


@router.post("", response_model=MesaOut)
def crear(data: MesaIn, db: Session = Depends(get_db), _=Depends(require_auth)):
    m = Mesa(**data.model_dump())
    db.add(m)
    db.commit()
    db.refresh(m)
    return _mesa_out(m, db)


@router.put("/{mid}", response_model=MesaOut)
def actualizar(mid: int, data: MesaIn, db: Session = Depends(get_db), _=Depends(require_auth)):
    m = db.query(Mesa).filter(Mesa.id == mid).first()
    if not m:
        raise HTTPException(404, "Mesa no encontrada")
    m.numero = data.numero
    m.nombre = data.nombre
    m.capacidad = data.capacidad
    m.posicion_x = data.posicion_x
    m.posicion_y = data.posicion_y
    db.commit()
    db.refresh(m)
    return _mesa_out(m, db)


@router.patch("/{mid}/posicion", response_model=MesaOut)
def mover(mid: int, data: PosicionIn, db: Session = Depends(get_db), _=Depends(require_auth)):
    """Actualiza la posición de la mesa en el mapa de planta."""
    m = db.query(Mesa).filter(Mesa.id == mid).first()
    if not m:
        raise HTTPException(404, "Mesa no encontrada")
    m.posicion_x = data.posicion_x
    m.posicion_y = data.posicion_y
    db.commit()
    db.refresh(m)
    return _mesa_out(m, db)


@router.get("/{mid}/historial")
def historial(mid: int, limit: int = 10, db: Session = Depends(get_db), _=Depends(require_auth)):
    """Retorna las últimas N comandas cerradas/canceladas de una mesa."""
    m = db.query(Mesa).filter(Mesa.id == mid).first()
    if not m:
        raise HTTPException(404, "Mesa no encontrada")
    comandas = (
        db.query(Comanda)
        .options(joinedload(Comanda.items).joinedload(ItemComanda.producto))
        .filter(Comanda.mesa_id == mid, Comanda.estado.in_(["cerrada", "cancelada"]))
        .order_by(Comanda.closed_at.desc())
        .limit(limit)
        .all()
    )
    result = []
    for c in comandas:
        items_data = [
            {
                "nombre": it.producto.nombre if it.producto else "",
                "cantidad": it.cantidad,
                "subtotal": it.subtotal,
                "notas": it.notas or "",
            }
            for it in c.items
        ]
        venta = db.query(Venta).filter(Venta.comanda_id == c.id).first()
        result.append({
            "id": c.id,
            "numero_ticket": c.numero_ticket,
            "estado": c.estado,
            "total": sum(it.subtotal for it in c.items),
            "tipo_pago": venta.tipo_pago if venta else "",
            "pago2_tipo": getattr(venta, "pago2_tipo", "") or "" if venta else "",
            "pago2_monto": getattr(venta, "pago2_monto", 0) or 0 if venta else 0,
            "descuento": venta.descuento if venta else 0,
            "propina": venta.propina if venta else 0,
            "total_cobrado": venta.total if venta else 0,
            "created_at": c.created_at.strftime("%d/%m/%Y %H:%M") if c.created_at else "",
            "closed_at": c.closed_at.strftime("%d/%m/%Y %H:%M") if c.closed_at else "",
            "items": items_data,
        })
    return result


@router.delete("/{mid}")
def eliminar(mid: int, db: Session = Depends(get_db), _=Depends(require_auth)):
    m = db.query(Mesa).filter(Mesa.id == mid).first()
    if not m:
        raise HTTPException(404, "Mesa no encontrada")
    db.delete(m)
    db.commit()
    return {"ok": True}
