import csv
import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import Producto
from routers.auth import require_auth

router = APIRouter(prefix="/api/productos", tags=["productos"])


class ProductoIn(BaseModel):
    nombre: str
    descripcion: str = ""
    precio: float = 0
    categoria: str = ""
    foto: str = ""
    activo: bool = True


class ProductoOut(BaseModel):
    id: int
    nombre: str
    descripcion: str
    precio: float
    categoria: str
    foto: str
    activo: bool
    agotado_hoy: bool = False

    class Config:
        from_attributes = True


@router.get("", response_model=list[ProductoOut])
def listar(solo_activos: bool = False, db: Session = Depends(get_db), _=Depends(require_auth)):
    q = db.query(Producto)
    if solo_activos:
        q = q.filter(Producto.activo == True)
    return q.order_by(Producto.categoria, Producto.nombre).all()


@router.post("", response_model=ProductoOut)
def crear(data: ProductoIn, db: Session = Depends(get_db), _=Depends(require_auth)):
    p = Producto(**data.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.put("/{pid}", response_model=ProductoOut)
def actualizar(pid: int, data: ProductoIn, db: Session = Depends(get_db), _=Depends(require_auth)):
    p = db.query(Producto).filter(Producto.id == pid).first()
    if not p:
        raise HTTPException(404, "Producto no encontrado")
    for k, v in data.model_dump().items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/{pid}")
def eliminar(pid: int, db: Session = Depends(get_db), _=Depends(require_auth)):
    p = db.query(Producto).filter(Producto.id == pid).first()
    if not p:
        raise HTTPException(404, "Producto no encontrado")
    p.activo = False
    db.commit()
    return {"ok": True}


@router.post("/{pid}/agotar")
def toggle_agotado(pid: int, db: Session = Depends(get_db), _=Depends(require_auth)):
    p = db.query(Producto).filter(Producto.id == pid).first()
    if not p:
        raise HTTPException(404, "Producto no encontrado")
    p.agotado_hoy = not p.agotado_hoy
    db.commit()
    return {"id": p.id, "agotado_hoy": p.agotado_hoy}


@router.post("/importar-csv")
async def importar_csv(file: UploadFile = File(...), db: Session = Depends(get_db), _=Depends(require_auth)):
    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    creados = 0
    errores = []

    for i, row in enumerate(reader, start=2):
        nombre = (row.get("nombre") or row.get("Nombre") or "").strip()
        if not nombre:
            errores.append(f"Fila {i}: sin nombre")
            continue
        precio_raw = (row.get("precio") or row.get("Precio") or "0").strip().replace("$", "").replace(".", "").replace(",", ".")
        try:
            precio = float(precio_raw)
        except ValueError:
            precio = 0

        p = Producto(
            nombre=nombre,
            descripcion=(row.get("descripcion") or row.get("Descripcion") or "").strip(),
            precio=precio,
            categoria=(row.get("categoria") or row.get("Categoria") or "").strip(),
            foto=(row.get("foto") or row.get("Foto") or "").strip(),
        )
        db.add(p)
        creados += 1

    db.commit()
    return {"creados": creados, "errores": errores}
