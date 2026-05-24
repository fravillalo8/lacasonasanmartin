from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import ClienteFrecuente
from routers.auth import require_auth

router = APIRouter(prefix="/api/clientes", tags=["clientes"])


class ClienteIn(BaseModel):
    nombre: str
    telefono: str = ""
    email: str = ""
    notas: str = ""


def _fmt(c: ClienteFrecuente) -> dict:
    return {
        "id": c.id,
        "nombre": c.nombre,
        "telefono": c.telefono,
        "email": c.email,
        "notas": c.notas,
        "visitas": c.visitas,
        "gasto_total": c.gasto_total,
        "ultima_visita": c.ultima_visita.isoformat() if c.ultima_visita else None,
        "created_at": c.created_at.isoformat() if c.created_at else "",
    }


@router.get("")
def listar(q: str = Query(""), db: Session = Depends(get_db), _=Depends(require_auth)):
    query = db.query(ClienteFrecuente)
    if q:
        query = query.filter(
            ClienteFrecuente.nombre.ilike(f"%{q}%") | ClienteFrecuente.telefono.ilike(f"%{q}%")
        )
    return [_fmt(c) for c in query.order_by(ClienteFrecuente.visitas.desc()).all()]


@router.post("")
def crear(data: ClienteIn, db: Session = Depends(get_db), _=Depends(require_auth)):
    c = ClienteFrecuente(**data.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return _fmt(c)


@router.put("/{cid}")
def actualizar(cid: int, data: ClienteIn, db: Session = Depends(get_db), _=Depends(require_auth)):
    c = db.query(ClienteFrecuente).filter(ClienteFrecuente.id == cid).first()
    if not c:
        raise HTTPException(404, "Cliente no encontrado")
    for k, v in data.model_dump().items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return _fmt(c)


@router.delete("/{cid}")
def eliminar(cid: int, db: Session = Depends(get_db), _=Depends(require_auth)):
    c = db.query(ClienteFrecuente).filter(ClienteFrecuente.id == cid).first()
    if not c:
        raise HTTPException(404, "Cliente no encontrado")
    db.delete(c)
    db.commit()
    return {"ok": True}


@router.post("/{cid}/visita")
def registrar_visita(cid: int, gasto: float = 0, db: Session = Depends(get_db), _=Depends(require_auth)):
    c = db.query(ClienteFrecuente).filter(ClienteFrecuente.id == cid).first()
    if not c:
        raise HTTPException(404, "Cliente no encontrado")
    c.visitas += 1
    c.gasto_total += gasto
    c.ultima_visita = datetime.utcnow()
    db.commit()
    return _fmt(c)
