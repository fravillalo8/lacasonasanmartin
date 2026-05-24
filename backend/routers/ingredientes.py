from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from models import Ingrediente, MovimientoStock
from routers.auth import require_auth

router = APIRouter(prefix="/api/ingredientes", tags=["ingredientes"])


class IngredienteIn(BaseModel):
    nombre: str
    unidad: str
    stock: float = 0
    stock_minimo: float = 0
    costo_unitario: float = 0
    categoria: str = ""


class AjusteStock(BaseModel):
    cantidad: float       # positivo = entrada, negativo = salida
    motivo: str = "Ajuste manual"


def _to_dict(ing: Ingrediente) -> dict:
    return {
        "id": ing.id,
        "nombre": ing.nombre,
        "unidad": ing.unidad,
        "stock": round(ing.stock, 3),
        "stock_minimo": ing.stock_minimo,
        "costo_unitario": ing.costo_unitario,
        "categoria": ing.categoria,
        "activo": ing.activo,
        "valor_stock": round(ing.stock * ing.costo_unitario, 0),
        "alerta_stock": ing.stock <= ing.stock_minimo and ing.stock_minimo > 0,
    }


@router.get("")
def listar(db: Session = Depends(get_db), _=Depends(require_auth)):
    items = db.query(Ingrediente).filter(Ingrediente.activo == True).order_by(Ingrediente.nombre).all()
    return [_to_dict(i) for i in items]


@router.post("", status_code=201)
def crear(data: IngredienteIn, db: Session = Depends(get_db), _=Depends(require_auth)):
    ing = Ingrediente(**data.model_dump())
    db.add(ing)
    db.commit()
    db.refresh(ing)
    return _to_dict(ing)


@router.put("/{ing_id}")
def actualizar(ing_id: int, data: IngredienteIn, db: Session = Depends(get_db), _=Depends(require_auth)):
    ing = db.get(Ingrediente, ing_id)
    if not ing:
        raise HTTPException(404, "Ingrediente no encontrado")
    for k, v in data.model_dump().items():
        setattr(ing, k, v)
    db.commit()
    db.refresh(ing)
    return _to_dict(ing)


@router.delete("/{ing_id}")
def eliminar(ing_id: int, db: Session = Depends(get_db), _=Depends(require_auth)):
    ing = db.get(Ingrediente, ing_id)
    if not ing:
        raise HTTPException(404, "Ingrediente no encontrado")
    ing.activo = False
    db.commit()
    return {"ok": True}


@router.post("/{ing_id}/ajustar")
def ajustar_stock(ing_id: int, ajuste: AjusteStock, db: Session = Depends(get_db), _=Depends(require_auth)):
    ing = db.get(Ingrediente, ing_id)
    if not ing:
        raise HTTPException(404, "Ingrediente no encontrado")

    ing.stock = round(ing.stock + ajuste.cantidad, 6)
    tipo = "ENTRADA" if ajuste.cantidad >= 0 else "SALIDA"

    mov = MovimientoStock(
        ingrediente_id=ing_id,
        tipo="AJUSTE",
        cantidad=ajuste.cantidad,
        motivo=ajuste.motivo,
        referencia_tipo="manual",
    )
    db.add(mov)
    db.commit()
    return _to_dict(ing)


@router.get("/alertas/stock-bajo")
def stock_bajo(db: Session = Depends(get_db), _=Depends(require_auth)):
    items = (
        db.query(Ingrediente)
        .filter(
            Ingrediente.activo == True,
            Ingrediente.stock_minimo > 0,
            Ingrediente.stock <= Ingrediente.stock_minimo,
        )
        .all()
    )
    return [_to_dict(i) for i in items]
