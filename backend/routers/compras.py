import os
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import Compra, ItemCompra, Ingrediente, MovimientoStock
from routers.auth import require_auth
from services.sii_service import sii_service, TIPOS_DTE

router = APIRouter(prefix="/api/compras", tags=["compras"])

RESTAURANTE_RUT_FULL = os.getenv("RESTAURANTE_RUT", "")
SII_CERT = os.getenv("SII_CERT_PEM_PATH", "")
SII_KEY = os.getenv("SII_KEY_PEM_PATH", "")


class ItemCompraIn(BaseModel):
    descripcion: str
    cantidad: float
    precio_unitario: float
    monto_item: float
    ingrediente_id: Optional[int] = None


class CompraIn(BaseModel):
    folio_sii: str = ""
    tipo_dte: int = 33
    rut_proveedor: str
    nombre_proveedor: str
    fecha: str                   # YYYY-MM-DD
    monto_neto: float = 0
    iva: float = 0
    monto_total: float
    notas: str = ""
    items: list[ItemCompraIn] = []


class VerificarDTEIn(BaseModel):
    rut_emisor: str              # sin puntos, sin DV (ej: 76123456)
    dv_emisor: str
    tipo_dte: int = 33
    folio: int
    fecha: str                   # DD/MM/YYYY
    monto: int


def _item_dict(item: ItemCompra) -> dict:
    return {
        "id": item.id,
        "descripcion": item.descripcion,
        "cantidad": item.cantidad,
        "precio_unitario": item.precio_unitario,
        "monto_item": item.monto_item,
        "ingrediente_id": item.ingrediente_id,
        "ingrediente_nombre": item.ingrediente.nombre if item.ingrediente else None,
    }


def _compra_dict(c: Compra) -> dict:
    return {
        "id": c.id,
        "folio_sii": c.folio_sii,
        "tipo_dte": c.tipo_dte,
        "tipo_nombre": TIPOS_DTE.get(c.tipo_dte, f"DTE {c.tipo_dte}"),
        "rut_proveedor": c.rut_proveedor,
        "nombre_proveedor": c.nombre_proveedor,
        "fecha": c.fecha.strftime("%Y-%m-%d") if c.fecha else "",
        "monto_neto": c.monto_neto,
        "iva": c.iva,
        "monto_total": c.monto_total,
        "verificado_sii": c.verificado_sii,
        "estado_sii": c.estado_sii,
        "notas": c.notas,
        "items": [_item_dict(i) for i in c.items],
        "created_at": c.created_at.isoformat() if c.created_at else "",
    }


def _aplicar_stock(compra: Compra, db: Session):
    """Crea movimientos de stock ENTRADA para cada ítem vinculado a un ingrediente."""
    for item in compra.items:
        if not item.ingrediente_id:
            continue
        ing = db.get(Ingrediente, item.ingrediente_id)
        if not ing:
            continue
        ing.stock = round(ing.stock + item.cantidad, 6)
        if item.precio_unitario > 0:
            ing.costo_unitario = item.precio_unitario
        mov = MovimientoStock(
            ingrediente_id=ing.id,
            tipo="ENTRADA",
            cantidad=item.cantidad,
            motivo=f"Compra {compra.folio_sii or compra.id} - {item.descripcion}",
            referencia_id=compra.id,
            referencia_tipo="compra",
        )
        db.add(mov)


@router.get("")
def listar(db: Session = Depends(get_db), _=Depends(require_auth)):
    compras = (
        db.query(Compra)
        .options(joinedload(Compra.items).joinedload(ItemCompra.ingrediente))
        .order_by(Compra.fecha.desc())
        .limit(100)
        .all()
    )
    return [_compra_dict(c) for c in compras]


@router.post("", status_code=201)
def crear(data: CompraIn, db: Session = Depends(get_db), _=Depends(require_auth)):
    try:
        fecha_dt = datetime.strptime(data.fecha, "%Y-%m-%d")
    except ValueError:
        fecha_dt = datetime.utcnow()

    compra = Compra(
        folio_sii=data.folio_sii,
        tipo_dte=data.tipo_dte,
        rut_proveedor=data.rut_proveedor,
        nombre_proveedor=data.nombre_proveedor,
        fecha=fecha_dt,
        monto_neto=data.monto_neto,
        iva=data.iva,
        monto_total=data.monto_total,
        notas=data.notas,
    )
    db.add(compra)
    db.flush()

    for item_data in data.items:
        item = ItemCompra(compra_id=compra.id, **item_data.model_dump())
        db.add(item)

    db.flush()
    db.refresh(compra)
    # Recargar con relaciones antes de aplicar stock
    compra = (
        db.query(Compra)
        .options(joinedload(Compra.items).joinedload(ItemCompra.ingrediente))
        .filter(Compra.id == compra.id)
        .first()
    )
    _aplicar_stock(compra, db)
    db.commit()
    db.refresh(compra)
    return _compra_dict(compra)


@router.delete("/{compra_id}")
def eliminar(compra_id: int, db: Session = Depends(get_db), _=Depends(require_auth)):
    compra = db.get(Compra, compra_id)
    if not compra:
        raise HTTPException(404, "Compra no encontrada")
    db.delete(compra)
    db.commit()
    return {"ok": True}


@router.post("/verificar-sii")
def verificar_sii(data: VerificarDTEIn, _=Depends(require_auth)):
    """
    Verifica la validez de un DTE contra el SII.
    Requiere token SII (certificado digital configurado en .env).
    """
    if not SII_CERT or not SII_KEY:
        return {
            "verificado": None,
            "estado_codigo": "NO_CERT",
            "estado_glosa": "Certificado digital no configurado. Configure SII_CERT_PEM_PATH y SII_KEY_PEM_PATH en .env",
        }

    # Parsear RUT del restaurante receptor
    rut_rest = RESTAURANTE_RUT_FULL.split("-")
    if len(rut_rest) != 2:
        return {"verificado": None, "estado_codigo": "BAD_RUT", "estado_glosa": "RUT restaurante mal configurado"}

    token = sii_service.get_token_with_cert(SII_CERT, SII_KEY)
    if not token:
        return {"verificado": False, "estado_codigo": "NO_TOKEN", "estado_glosa": "No se pudo obtener token del SII"}

    return sii_service.verificar_dte(
        token=token,
        rut_emisor=data.rut_emisor,
        dv_emisor=data.dv_emisor,
        rut_receptor=rut_rest[0],
        dv_receptor=rut_rest[1],
        tipo_dte=data.tipo_dte,
        folio=data.folio,
        fecha=data.fecha,
        monto=data.monto,
    )


@router.post("/importar-xml")
async def importar_xml(file: UploadFile = File(...), _=Depends(require_auth)):
    """
    Sube el archivo XML del DTE enviado por el proveedor.
    Parsea y devuelve los datos listos para confirmar y guardar como compra.
    """
    if not file.filename or not file.filename.endswith(".xml"):
        raise HTTPException(400, "Solo se aceptan archivos .xml")

    content = await file.read()
    resultado = sii_service.parse_dte_xml(content)
    if not resultado:
        raise HTTPException(422, "No se pudo parsear el XML del DTE. Verifica que sea un DTE válido del SII.")

    return resultado
