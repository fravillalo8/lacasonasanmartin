from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import Venta, GastoDia, Comanda, ItemComanda
from routers.auth import require_auth

router = APIRouter(prefix="/api/caja", tags=["caja"])


class GastoIn(BaseModel):
    descripcion: str
    monto: float
    categoria: str = "otros"
    fecha: Optional[str] = None


@router.get("/cierre")
def cierre_caja(fecha: Optional[str] = Query(None), db: Session = Depends(get_db), _=Depends(require_auth)):
    if fecha:
        dia = datetime.fromisoformat(fecha)
    else:
        dia = datetime.utcnow()

    inicio = dia.replace(hour=0, minute=0, second=0, microsecond=0)
    fin = dia.replace(hour=23, minute=59, second=59, microsecond=999999)

    ventas = db.query(Venta).filter(Venta.created_at >= inicio, Venta.created_at <= fin).all()
    gastos = db.query(GastoDia).filter(GastoDia.fecha >= inicio, GastoDia.fecha <= fin).all()

    total_ventas = sum(v.total for v in ventas)
    total_gastos = sum(g.monto for g in gastos)

    por_pago: dict = {}
    for v in ventas:
        por_pago[v.tipo_pago] = round(por_pago.get(v.tipo_pago, 0) + v.total, 0)

    efectivo = por_pago.get("efectivo", 0)
    no_efectivo = round(total_ventas - efectivo, 0)

    return {
        "fecha": dia.strftime("%Y-%m-%d"),
        "total_ventas": round(total_ventas, 0),
        "num_ventas": len(ventas),
        "total_gastos": round(total_gastos, 0),
        "resultado_neto": round(total_ventas - total_gastos, 0),
        "efectivo_bruto": round(efectivo, 0),
        "no_efectivo": no_efectivo,
        "por_pago": por_pago,
        "gastos": [
            {
                "id": g.id,
                "descripcion": g.descripcion,
                "monto": g.monto,
                "categoria": g.categoria,
                "fecha": g.fecha.isoformat() if g.fecha else "",
            }
            for g in gastos
        ],
        "ventas_detalle": [
            {
                "id": v.id,
                "numero_mesa": v.numero_mesa,
                "tipo_pago": v.tipo_pago,
                "subtotal": v.subtotal,
                "descuento": v.descuento,
                "propina": v.propina,
                "total": v.total,
                "hora": v.created_at.strftime("%H:%M") if v.created_at else "",
            }
            for v in ventas
        ],
    }


@router.get("/gastos")
def listar_gastos(db: Session = Depends(get_db), _=Depends(require_auth)):
    gastos = db.query(GastoDia).order_by(GastoDia.fecha.desc()).limit(100).all()
    return [
        {
            "id": g.id,
            "descripcion": g.descripcion,
            "monto": g.monto,
            "categoria": g.categoria,
            "fecha": g.fecha.strftime("%d/%m/%Y") if g.fecha else "",
        }
        for g in gastos
    ]


@router.post("/gastos")
def agregar_gasto(data: GastoIn, db: Session = Depends(get_db), _=Depends(require_auth)):
    fecha = datetime.fromisoformat(data.fecha) if data.fecha else datetime.utcnow()
    g = GastoDia(descripcion=data.descripcion, monto=data.monto, categoria=data.categoria, fecha=fecha)
    db.add(g)
    db.commit()
    db.refresh(g)
    return {"id": g.id, "descripcion": g.descripcion, "monto": g.monto, "categoria": g.categoria}


@router.delete("/gastos/{gid}")
def eliminar_gasto(gid: int, db: Session = Depends(get_db), _=Depends(require_auth)):
    g = db.query(GastoDia).filter(GastoDia.id == gid).first()
    if not g:
        raise HTTPException(404, "Gasto no encontrado")
    db.delete(g)
    db.commit()
    return {"ok": True}
