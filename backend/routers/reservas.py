from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import Reserva
from routers.auth import require_auth

router = APIRouter(prefix="/api/reservas", tags=["reservas"])


class ReservaIn(BaseModel):
    fecha: str
    cliente_nombre: str
    cliente_telefono: str = ""
    num_personas: int = 2
    mesa_id: Optional[int] = None
    estado: str = "pendiente"
    notas: str = ""


def _fmt(r: Reserva) -> dict:
    return {
        "id": r.id,
        "fecha": r.fecha.isoformat() if r.fecha else "",
        "cliente_nombre": r.cliente_nombre,
        "cliente_telefono": r.cliente_telefono,
        "num_personas": r.num_personas,
        "mesa_id": r.mesa_id,
        "estado": r.estado,
        "notas": r.notas,
        "created_at": r.created_at.isoformat() if r.created_at else "",
    }


@router.get("")
def listar(db: Session = Depends(get_db), _=Depends(require_auth)):
    return [_fmt(r) for r in db.query(Reserva).order_by(Reserva.fecha).all()]


@router.post("")
def crear(data: ReservaIn, db: Session = Depends(get_db), _=Depends(require_auth)):
    r = Reserva(
        fecha=datetime.fromisoformat(data.fecha),
        cliente_nombre=data.cliente_nombre,
        cliente_telefono=data.cliente_telefono,
        num_personas=data.num_personas,
        mesa_id=data.mesa_id,
        estado=data.estado,
        notas=data.notas,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return _fmt(r)


@router.put("/{rid}")
def actualizar(rid: int, data: ReservaIn, db: Session = Depends(get_db), _=Depends(require_auth)):
    r = db.query(Reserva).filter(Reserva.id == rid).first()
    if not r:
        raise HTTPException(404, "Reserva no encontrada")
    r.fecha = datetime.fromisoformat(data.fecha)
    r.cliente_nombre = data.cliente_nombre
    r.cliente_telefono = data.cliente_telefono
    r.num_personas = data.num_personas
    r.mesa_id = data.mesa_id
    r.estado = data.estado
    r.notas = data.notas
    db.commit()
    db.refresh(r)
    return _fmt(r)


@router.delete("/{rid}")
def eliminar(rid: int, db: Session = Depends(get_db), _=Depends(require_auth)):
    r = db.query(Reserva).filter(Reserva.id == rid).first()
    if not r:
        raise HTTPException(404, "Reserva no encontrada")
    db.delete(r)
    db.commit()
    return {"ok": True}
