from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import Merma, Ingrediente, MovimientoStock
from routers.auth import require_auth

router = APIRouter(prefix="/api/mermas", tags=["mermas"])


class MermaIn(BaseModel):
    ingrediente_id: int
    cantidad: float
    motivo: str = "vencimiento"
    descripcion: str = ""


@router.get("")
def listar(db: Session = Depends(get_db), _=Depends(require_auth)):
    mermas = db.query(Merma).order_by(Merma.created_at.desc()).limit(100).all()
    return [
        {
            "id": m.id,
            "ingrediente_id": m.ingrediente_id,
            "ingrediente": m.ingrediente.nombre if m.ingrediente else "",
            "unidad": m.ingrediente.unidad if m.ingrediente else "",
            "cantidad": m.cantidad,
            "motivo": m.motivo,
            "descripcion": m.descripcion,
            "costo_estimado": m.costo_estimado,
            "fecha": m.created_at.strftime("%d/%m/%Y %H:%M") if m.created_at else "",
        }
        for m in mermas
    ]


@router.post("")
def registrar(data: MermaIn, db: Session = Depends(get_db), _=Depends(require_auth)):
    ing = db.query(Ingrediente).filter(Ingrediente.id == data.ingrediente_id).first()
    if not ing:
        raise HTTPException(404, "Ingrediente no encontrado")

    costo = round(data.cantidad * ing.costo_unitario, 0)
    m = Merma(
        ingrediente_id=data.ingrediente_id,
        cantidad=data.cantidad,
        motivo=data.motivo,
        descripcion=data.descripcion,
        costo_estimado=costo,
    )
    db.add(m)

    ing.stock = max(0, ing.stock - data.cantidad)
    mov = MovimientoStock(
        ingrediente_id=data.ingrediente_id,
        tipo="SALIDA",
        cantidad=data.cantidad,
        motivo=f"Merma: {data.motivo}" + (f" - {data.descripcion}" if data.descripcion else ""),
        referencia_tipo="merma",
    )
    db.add(mov)
    db.commit()
    return {"ok": True, "costo_estimado": costo, "stock_restante": ing.stock}


@router.get("/resumen")
def resumen(db: Session = Depends(get_db), _=Depends(require_auth)):
    hoy = datetime.utcnow()
    inicio_mes = hoy.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    mermas_mes = db.query(Merma).filter(Merma.created_at >= inicio_mes).all()
    total_costo = sum(m.costo_estimado for m in mermas_mes)
    por_motivo: dict = {}
    for m in mermas_mes:
        por_motivo[m.motivo] = round(por_motivo.get(m.motivo, 0) + m.costo_estimado, 0)
    return {
        "total_costo_mes": round(total_costo, 0),
        "num_registros_mes": len(mermas_mes),
        "por_motivo": por_motivo,
    }
