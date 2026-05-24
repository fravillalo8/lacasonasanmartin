from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from database import get_db
from models import Receta, ItemReceta, Ingrediente, MovimientoStock
from routers.auth import require_auth

router = APIRouter(prefix="/api/recetas", tags=["recetas"])


class ItemRecetaIn(BaseModel):
    ingrediente_id: int
    cantidad: float


class RecetaIn(BaseModel):
    nombre: str
    descripcion: str = ""
    precio_venta: float = 0
    porciones: float = 1
    categoria: str = ""
    items: list[ItemRecetaIn] = []


class ConsumoIn(BaseModel):
    porciones: float = 1


def _calcular_costo(receta: Receta) -> float:
    total = 0.0
    for item in receta.items:
        if item.ingrediente:
            total += item.cantidad * item.ingrediente.costo_unitario
    return round(total, 0)


def _receta_dict(r: Receta) -> dict:
    costo = _calcular_costo(r)
    margen = round(r.precio_venta - costo, 0) if r.precio_venta else 0
    margen_pct = round((margen / r.precio_venta) * 100, 1) if r.precio_venta else 0
    return {
        "id": r.id,
        "nombre": r.nombre,
        "descripcion": r.descripcion,
        "precio_venta": r.precio_venta,
        "porciones": r.porciones,
        "categoria": r.categoria,
        "activo": r.activo,
        "costo_total": costo,
        "costo_porcion": round(costo / r.porciones, 0) if r.porciones else costo,
        "margen": margen,
        "margen_pct": margen_pct,
        "items": [
            {
                "id": i.id,
                "ingrediente_id": i.ingrediente_id,
                "ingrediente_nombre": i.ingrediente.nombre if i.ingrediente else "",
                "ingrediente_unidad": i.ingrediente.unidad if i.ingrediente else "",
                "cantidad": i.cantidad,
                "costo_linea": round(i.cantidad * i.ingrediente.costo_unitario, 0) if i.ingrediente else 0,
            }
            for i in r.items
        ],
    }


def _load_receta(receta_id: int, db: Session) -> Optional[Receta]:
    return (
        db.query(Receta)
        .options(joinedload(Receta.items).joinedload(ItemReceta.ingrediente))
        .filter(Receta.id == receta_id)
        .first()
    )


@router.get("")
def listar(db: Session = Depends(get_db), _=Depends(require_auth)):
    recetas = (
        db.query(Receta)
        .options(joinedload(Receta.items).joinedload(ItemReceta.ingrediente))
        .filter(Receta.activo == True)
        .order_by(Receta.nombre)
        .all()
    )
    return [_receta_dict(r) for r in recetas]


@router.post("", status_code=201)
def crear(data: RecetaIn, db: Session = Depends(get_db), _=Depends(require_auth)):
    receta = Receta(
        nombre=data.nombre,
        descripcion=data.descripcion,
        precio_venta=data.precio_venta,
        porciones=data.porciones,
        categoria=data.categoria,
    )
    db.add(receta)
    db.flush()

    for item_data in data.items:
        if not db.get(Ingrediente, item_data.ingrediente_id):
            raise HTTPException(400, f"Ingrediente {item_data.ingrediente_id} no existe")
        db.add(ItemReceta(receta_id=receta.id, **item_data.model_dump()))

    db.commit()
    return _receta_dict(_load_receta(receta.id, db))


@router.put("/{receta_id}")
def actualizar(receta_id: int, data: RecetaIn, db: Session = Depends(get_db), _=Depends(require_auth)):
    receta = db.get(Receta, receta_id)
    if not receta:
        raise HTTPException(404, "Receta no encontrada")

    receta.nombre = data.nombre
    receta.descripcion = data.descripcion
    receta.precio_venta = data.precio_venta
    receta.porciones = data.porciones
    receta.categoria = data.categoria

    # Reemplazar ítems
    db.query(ItemReceta).filter(ItemReceta.receta_id == receta_id).delete()
    for item_data in data.items:
        db.add(ItemReceta(receta_id=receta_id, **item_data.model_dump()))

    db.commit()
    return _receta_dict(_load_receta(receta_id, db))


@router.delete("/{receta_id}")
def eliminar(receta_id: int, db: Session = Depends(get_db), _=Depends(require_auth)):
    receta = db.get(Receta, receta_id)
    if not receta:
        raise HTTPException(404, "Receta no encontrada")
    receta.activo = False
    db.commit()
    return {"ok": True}


@router.post("/{receta_id}/consumir")
def consumir(receta_id: int, consumo: ConsumoIn, db: Session = Depends(get_db), _=Depends(require_auth)):
    """
    Descuenta del stock los ingredientes para N porciones de la receta.
    Verificar disponibilidad antes de consumir.
    """
    receta = _load_receta(receta_id, db)
    if not receta:
        raise HTTPException(404, "Receta no encontrada")

    factor = consumo.porciones / receta.porciones

    # Verificar stock suficiente
    faltantes = []
    for item in receta.items:
        if not item.ingrediente:
            continue
        necesario = round(item.cantidad * factor, 6)
        if item.ingrediente.stock < necesario:
            faltantes.append({
                "ingrediente": item.ingrediente.nombre,
                "necesario": necesario,
                "disponible": item.ingrediente.stock,
                "unidad": item.ingrediente.unidad,
            })

    if faltantes:
        raise HTTPException(422, {"detail": "Stock insuficiente", "faltantes": faltantes})

    # Descontar stock
    for item in receta.items:
        if not item.ingrediente:
            continue
        necesario = round(item.cantidad * factor, 6)
        item.ingrediente.stock = round(item.ingrediente.stock - necesario, 6)
        mov = MovimientoStock(
            ingrediente_id=item.ingrediente_id,
            tipo="SALIDA",
            cantidad=-necesario,
            motivo=f"Receta: {receta.nombre} × {consumo.porciones} porción(es)",
            referencia_id=receta_id,
            referencia_tipo="receta",
        )
        db.add(mov)

    db.commit()
    return {"ok": True, "porciones_consumidas": consumo.porciones}
