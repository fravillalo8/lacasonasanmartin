from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from database import get_db
from models import AuditLog
from routers.auth import require_auth, require_admin
import csv
import io

router = APIRouter(prefix="/api/auditoria", tags=["auditoria"])


@router.get("")
def listar(
    dias: int = Query(7, ge=1, le=90),
    accion: str = Query(""),
    db: Session = Depends(get_db),
    _=Depends(require_auth),
):
    desde = datetime.utcnow() - timedelta(days=dias)
    q = db.query(AuditLog).filter(AuditLog.created_at >= desde)
    if accion:
        q = q.filter(AuditLog.accion == accion)
    logs = q.order_by(AuditLog.created_at.desc()).limit(500).all()
    return [
        {
            "id": l.id,
            "accion": l.accion,
            "detalle": l.detalle,
            "usuario_rol": l.usuario_rol,
            "referencia_id": l.referencia_id,
            "referencia_tipo": l.referencia_tipo,
            "fecha": l.created_at.strftime("%d/%m/%Y %H:%M:%S") if l.created_at else "",
        }
        for l in logs
    ]


@router.get("/csv")
def exportar_csv(
    dias: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    desde = datetime.utcnow() - timedelta(days=dias)
    logs = db.query(AuditLog).filter(AuditLog.created_at >= desde).order_by(AuditLog.created_at.desc()).all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Fecha", "Acción", "Detalle", "Rol", "Referencia ID", "Tipo"])
    for l in logs:
        writer.writerow([
            l.created_at.strftime("%d/%m/%Y %H:%M:%S") if l.created_at else "",
            l.accion,
            l.detalle,
            l.usuario_rol,
            l.referencia_id or "",
            l.referencia_tipo or "",
        ])

    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=auditoria_{dias}dias.csv"},
    )
