from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import Mesa, Comanda
from routers.auth import require_auth

router = APIRouter(prefix="/api/mesas", tags=["mesas"])


class MesaIn(BaseModel):
    numero: int
    nombre: str = ""
    capacidad: int = 4


class MesaOut(BaseModel):
    id: int
    numero: int
    nombre: str
    capacidad: int
    estado: str
    comanda_abierta_id: Optional[int] = None

    class Config:
        from_attributes = True


@router.get("", response_model=list[MesaOut])
def listar(db: Session = Depends(get_db), _=Depends(require_auth)):
    mesas = db.query(Mesa).order_by(Mesa.numero).all()
    result = []
    for m in mesas:
        comanda = db.query(Comanda).filter(
            Comanda.mesa_id == m.id,
            Comanda.estado == "abierta"
        ).first()
        out = MesaOut(
            id=m.id,
            numero=m.numero,
            nombre=m.nombre,
            capacidad=m.capacidad,
            estado=m.estado,
            comanda_abierta_id=comanda.id if comanda else None,
        )
        result.append(out)
    return result


@router.post("", response_model=MesaOut)
def crear(data: MesaIn, db: Session = Depends(get_db), _=Depends(require_auth)):
    m = Mesa(**data.model_dump())
    db.add(m)
    db.commit()
    db.refresh(m)
    return MesaOut(id=m.id, numero=m.numero, nombre=m.nombre, capacidad=m.capacidad, estado=m.estado)


@router.put("/{mid}", response_model=MesaOut)
def actualizar(mid: int, data: MesaIn, db: Session = Depends(get_db), _=Depends(require_auth)):
    m = db.query(Mesa).filter(Mesa.id == mid).first()
    if not m:
        raise HTTPException(404, "Mesa no encontrada")
    m.numero = data.numero
    m.nombre = data.nombre
    m.capacidad = data.capacidad
    db.commit()
    db.refresh(m)
    comanda = db.query(Comanda).filter(Comanda.mesa_id == m.id, Comanda.estado == "abierta").first()
    return MesaOut(id=m.id, numero=m.numero, nombre=m.nombre, capacidad=m.capacidad, estado=m.estado,
                   comanda_abierta_id=comanda.id if comanda else None)


@router.delete("/{mid}")
def eliminar(mid: int, db: Session = Depends(get_db), _=Depends(require_auth)):
    m = db.query(Mesa).filter(Mesa.id == mid).first()
    if not m:
        raise HTTPException(404, "Mesa no encontrada")
    db.delete(m)
    db.commit()
    return {"ok": True}
