from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from models import Proveedor, PrecioProveedor, Ingrediente
from routers.auth import require_admin

router = APIRouter(prefix="/api/proveedores", tags=["proveedores"])


class ProveedorIn(BaseModel):
    nombre: str
    tipo: str = ""
    telefono: str = ""
    contacto: str = ""
    direccion: str = ""
    notas: str = ""


class PrecioIn(BaseModel):
    ingrediente_id: int
    precio: float
    notas: str = ""


def _prov_dict(p: Proveedor) -> dict:
    return {
        "id": p.id,
        "nombre": p.nombre,
        "tipo": p.tipo,
        "telefono": p.telefono,
        "contacto": p.contacto,
        "direccion": p.direccion,
        "notas": p.notas,
        "activo": p.activo,
    }


def _precio_dict(pp: PrecioProveedor) -> dict:
    return {
        "id": pp.id,
        "proveedor_id": pp.proveedor_id,
        "ingrediente_id": pp.ingrediente_id,
        "ingrediente_nombre": pp.ingrediente.nombre if pp.ingrediente else "",
        "ingrediente_unidad": pp.ingrediente.unidad if pp.ingrediente else "",
        "precio": pp.precio,
        "fecha": pp.fecha.isoformat() if pp.fecha else None,
        "notas": pp.notas,
    }


@router.get("")
def listar(db: Session = Depends(get_db), _=Depends(require_admin)):
    items = db.query(Proveedor).filter(Proveedor.activo == True).order_by(Proveedor.nombre).all()
    return [_prov_dict(p) for p in items]


@router.post("", status_code=201)
def crear(data: ProveedorIn, db: Session = Depends(get_db), _=Depends(require_admin)):
    p = Proveedor(**data.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return _prov_dict(p)


@router.put("/{prov_id}")
def actualizar(prov_id: int, data: ProveedorIn, db: Session = Depends(get_db), _=Depends(require_admin)):
    p = db.get(Proveedor, prov_id)
    if not p:
        raise HTTPException(404, "Proveedor no encontrado")
    for k, v in data.model_dump().items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return _prov_dict(p)


@router.delete("/{prov_id}")
def eliminar(prov_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    p = db.get(Proveedor, prov_id)
    if not p:
        raise HTTPException(404, "Proveedor no encontrado")
    p.activo = False
    db.commit()
    return {"ok": True}


@router.get("/{prov_id}/precios")
def listar_precios(prov_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    precios = db.query(PrecioProveedor).filter(PrecioProveedor.proveedor_id == prov_id).all()
    return [_precio_dict(pp) for pp in precios]


@router.post("/{prov_id}/precios", status_code=201)
def upsert_precio(prov_id: int, data: PrecioIn, db: Session = Depends(get_db), _=Depends(require_admin)):
    p = db.get(Proveedor, prov_id)
    if not p:
        raise HTTPException(404, "Proveedor no encontrado")
    ing = db.get(Ingrediente, data.ingrediente_id)
    if not ing:
        raise HTTPException(404, "Ingrediente no encontrado")

    existing = (
        db.query(PrecioProveedor)
        .filter(PrecioProveedor.proveedor_id == prov_id, PrecioProveedor.ingrediente_id == data.ingrediente_id)
        .first()
    )
    if existing:
        existing.precio = data.precio
        existing.notas = data.notas
        existing.fecha = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return _precio_dict(existing)
    else:
        pp = PrecioProveedor(proveedor_id=prov_id, ingrediente_id=data.ingrediente_id, precio=data.precio, notas=data.notas)
        db.add(pp)
        db.commit()
        db.refresh(pp)
        return _precio_dict(pp)


@router.delete("/{prov_id}/precios/{precio_id}")
def eliminar_precio(prov_id: int, precio_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    pp = db.query(PrecioProveedor).filter(PrecioProveedor.id == precio_id, PrecioProveedor.proveedor_id == prov_id).first()
    if not pp:
        raise HTTPException(404, "Precio no encontrado")
    db.delete(pp)
    db.commit()
    return {"ok": True}
