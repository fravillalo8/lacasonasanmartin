from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from database import get_db
from models import Venta, Comanda, ItemComanda
from routers.auth import require_auth

router = APIRouter(prefix="/api/ventas", tags=["ventas"])


def _venta_dict(v: Venta) -> dict:
    comanda = v.comanda
    items = []
    if comanda:
        for it in comanda.items:
            items.append({
                "nombre_producto": it.producto.nombre if it.producto else "",
                "cantidad": it.cantidad,
                "precio_unitario": it.precio_unitario,
                "subtotal": it.subtotal,
            })
    return {
        "id": v.id,
        "comanda_id": v.comanda_id,
        "numero_mesa": v.numero_mesa,
        "subtotal": v.subtotal,
        "descuento": v.descuento,
        "propina": v.propina,
        "total": v.total,
        "tipo_pago": v.tipo_pago,
        "monto_recibido": v.monto_recibido,
        "vuelto": v.vuelto,
        "fecha": v.created_at.strftime("%d/%m/%Y") if v.created_at else "",
        "hora": v.created_at.strftime("%H:%M") if v.created_at else "",
        "created_at": v.created_at.isoformat() if v.created_at else "",
        "items": items,
    }


@router.get("")
def listar(
    fecha_desde: str = Query(None),
    fecha_hasta: str = Query(None),
    tipo_pago: str = Query(None),
    db: Session = Depends(get_db),
    _=Depends(require_auth),
):
    q = db.query(Venta).options(
        joinedload(Venta.comanda).joinedload(Comanda.items).joinedload(ItemComanda.producto)
    )
    if fecha_desde:
        try:
            d = datetime.strptime(fecha_desde, "%Y-%m-%d")
            q = q.filter(Venta.created_at >= d)
        except ValueError:
            pass
    if fecha_hasta:
        try:
            d = datetime.strptime(fecha_hasta, "%Y-%m-%d") + timedelta(days=1)
            q = q.filter(Venta.created_at < d)
        except ValueError:
            pass
    if tipo_pago:
        q = q.filter(Venta.tipo_pago == tipo_pago)

    ventas = q.order_by(Venta.created_at.desc()).limit(500).all()
    return [_venta_dict(v) for v in ventas]


@router.get("/resumen")
def resumen(db: Session = Depends(get_db), _=Depends(require_auth)):
    now = datetime.utcnow()
    inicio_hoy = now.replace(hour=0, minute=0, second=0, microsecond=0)
    inicio_semana = inicio_hoy - timedelta(days=inicio_hoy.weekday())
    inicio_mes = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    def _stats(desde: datetime):
        total = db.query(func.sum(Venta.total)).filter(Venta.created_at >= desde).scalar() or 0
        count = db.query(func.count(Venta.id)).filter(Venta.created_at >= desde).scalar() or 0
        rows_pago = (
            db.query(Venta.tipo_pago, func.sum(Venta.total))
            .filter(Venta.created_at >= desde)
            .group_by(Venta.tipo_pago)
            .all()
        )
        por_pago = {tp: round(s, 0) for tp, s in rows_pago if tp}
        return {"total": round(total, 0), "count": count, "por_pago": por_pago}

    return {
        "hoy": _stats(inicio_hoy),
        "semana": _stats(inicio_semana),
        "mes": _stats(inicio_mes),
    }
