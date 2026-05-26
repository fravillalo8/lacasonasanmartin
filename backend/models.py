from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Ingrediente(Base):
    __tablename__ = "ingredientes"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False)
    unidad = Column(String(20), nullable=False)   # kg, lt, unidad, g, ml, etc.
    stock = Column(Float, default=0)
    stock_minimo = Column(Float, default=0)
    costo_unitario = Column(Float, default=0)     # último precio de compra
    categoria = Column(String(100), default="")
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    movimientos = relationship("MovimientoStock", back_populates="ingrediente")
    items_compra = relationship("ItemCompra", back_populates="ingrediente")
    items_receta = relationship("ItemReceta", back_populates="ingrediente")


class Compra(Base):
    __tablename__ = "compras"

    id = Column(Integer, primary_key=True, index=True)
    folio_sii = Column(String(20), default="")
    tipo_dte = Column(Integer, default=33)        # 33=Factura, 34=Exenta, 52=Guía
    rut_proveedor = Column(String(20), default="")
    nombre_proveedor = Column(String(200), default="")
    fecha = Column(DateTime, default=datetime.utcnow)
    monto_neto = Column(Float, default=0)
    iva = Column(Float, default=0)
    monto_total = Column(Float, default=0)
    verificado_sii = Column(Boolean, default=False)
    estado_sii = Column(String(100), default="")
    notas = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship("ItemCompra", back_populates="compra", cascade="all, delete-orphan")


class ItemCompra(Base):
    __tablename__ = "items_compra"

    id = Column(Integer, primary_key=True, index=True)
    compra_id = Column(Integer, ForeignKey("compras.id"))
    ingrediente_id = Column(Integer, ForeignKey("ingredientes.id"), nullable=True)
    descripcion = Column(String(300), default="")
    cantidad = Column(Float, default=0)
    precio_unitario = Column(Float, default=0)
    monto_item = Column(Float, default=0)

    compra = relationship("Compra", back_populates="items")
    ingrediente = relationship("Ingrediente", back_populates="items_compra")


class MovimientoStock(Base):
    __tablename__ = "movimientos_stock"

    id = Column(Integer, primary_key=True, index=True)
    ingrediente_id = Column(Integer, ForeignKey("ingredientes.id"))
    tipo = Column(String(10))                     # ENTRADA, SALIDA, AJUSTE
    cantidad = Column(Float)
    motivo = Column(String(200), default="")
    referencia_id = Column(Integer, nullable=True)
    referencia_tipo = Column(String(20), nullable=True)  # compra, receta, manual
    created_at = Column(DateTime, default=datetime.utcnow)

    ingrediente = relationship("Ingrediente", back_populates="movimientos")


class Receta(Base):
    __tablename__ = "recetas"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False)
    descripcion = Column(Text, default="")
    precio_venta = Column(Float, default=0)
    porciones = Column(Float, default=1)          # porciones que rinde
    categoria = Column(String(100), default="")
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship("ItemReceta", back_populates="receta", cascade="all, delete-orphan")


class ItemReceta(Base):
    __tablename__ = "items_receta"

    id = Column(Integer, primary_key=True, index=True)
    receta_id = Column(Integer, ForeignKey("recetas.id"))
    ingrediente_id = Column(Integer, ForeignKey("ingredientes.id"))
    cantidad = Column(Float)

    receta = relationship("Receta", back_populates="items")
    ingrediente = relationship("Ingrediente", back_populates="items_receta")


class Producto(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False)
    descripcion = Column(Text, default="")
    precio = Column(Float, default=0)
    categoria = Column(String(100), default="")
    foto = Column(Text, default="")          # URL de imagen
    activo = Column(Boolean, default=True)
    agotado_hoy = Column(Boolean, default=False)
    receta_id = Column(Integer, ForeignKey("recetas.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    items_comanda = relationship("ItemComanda", back_populates="producto")
    receta = relationship("Receta")


class Mesa(Base):
    __tablename__ = "mesas"

    id = Column(Integer, primary_key=True, index=True)
    numero = Column(Integer, nullable=False)
    nombre = Column(String(100), default="")
    capacidad = Column(Integer, default=4)
    estado = Column(String(20), default="libre")  # libre, ocupada, cuenta
    created_at = Column(DateTime, default=datetime.utcnow)

    comandas = relationship("Comanda", back_populates="mesa")


class Comanda(Base):
    __tablename__ = "comandas"

    id = Column(Integer, primary_key=True, index=True)
    mesa_id = Column(Integer, ForeignKey("mesas.id"), nullable=True)
    tipo = Column(String(20), default="mesa")       # mesa, delivery
    cliente_nombre = Column(String(200), default="")
    estado = Column(String(20), default="abierta")  # abierta, cerrada, cancelada
    total = Column(Float, default=0)
    notas = Column(Text, default="")
    numero_ticket = Column(Integer, nullable=True)  # número correlativo del día
    created_at = Column(DateTime, default=datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)

    mesa = relationship("Mesa", back_populates="comandas")
    items = relationship("ItemComanda", back_populates="comanda", cascade="all, delete-orphan")
    venta = relationship("Venta", back_populates="comanda", uselist=False)


class ItemComanda(Base):
    __tablename__ = "items_comanda"

    id = Column(Integer, primary_key=True, index=True)
    comanda_id = Column(Integer, ForeignKey("comandas.id"))
    producto_id = Column(Integer, ForeignKey("productos.id"))
    cantidad = Column(Integer, default=1)
    precio_unitario = Column(Float, default=0)
    subtotal = Column(Float, default=0)
    notas = Column(String(300), default="")
    listo = Column(Boolean, default=False)   # cocina marca el item como preparado

    comanda = relationship("Comanda", back_populates="items")
    producto = relationship("Producto", back_populates="items_comanda")


class Venta(Base):
    __tablename__ = "ventas"

    id = Column(Integer, primary_key=True, index=True)
    comanda_id = Column(Integer, ForeignKey("comandas.id"), unique=True)
    subtotal = Column(Float, default=0)       # total antes de descuento/propina
    descuento = Column(Float, default=0)      # monto fijo descontado
    propina = Column(Float, default=0)        # propina añadida
    total = Column(Float, default=0)          # subtotal - descuento + propina
    tipo_pago = Column(String(20), default="efectivo")
    monto_recibido = Column(Float, default=0)
    vuelto = Column(Float, default=0)
    numero_mesa = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    comanda = relationship("Comanda", back_populates="venta")


class Reserva(Base):
    __tablename__ = "reservas"

    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(DateTime, nullable=False)
    cliente_nombre = Column(String(200), default="")
    cliente_telefono = Column(String(50), default="")
    num_personas = Column(Integer, default=2)
    mesa_id = Column(Integer, ForeignKey("mesas.id"), nullable=True)
    estado = Column(String(20), default="pendiente")  # pendiente, confirmada, cancelada, completada
    notas = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)


class ClienteFrecuente(Base):
    __tablename__ = "clientes_frecuentes"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False)
    telefono = Column(String(50), default="")
    email = Column(String(200), default="")
    notas = Column(Text, default="")
    visitas = Column(Integer, default=0)
    gasto_total = Column(Float, default=0)
    ultima_visita = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class GastoDia(Base):
    __tablename__ = "gastos_dia"

    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(DateTime, default=datetime.utcnow)
    descripcion = Column(String(300), default="")
    monto = Column(Float, default=0)
    categoria = Column(String(100), default="otros")  # personal, servicios, insumos, otros
    created_at = Column(DateTime, default=datetime.utcnow)


class Merma(Base):
    __tablename__ = "mermas"

    id = Column(Integer, primary_key=True, index=True)
    ingrediente_id = Column(Integer, ForeignKey("ingredientes.id"))
    cantidad = Column(Float, default=0)
    motivo = Column(String(20), default="vencimiento")  # vencimiento, coccion, accidente, otro
    descripcion = Column(String(300), default="")
    costo_estimado = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    ingrediente = relationship("Ingrediente")


class Proveedor(Base):
    __tablename__ = "proveedores"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False)
    tipo = Column(String(50), default="")        # supermercado, mayorista, distribuidor, feria
    telefono = Column(String(50), default="")
    contacto = Column(String(200), default="")
    direccion = Column(String(300), default="")
    notas = Column(Text, default="")
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    precios = relationship("PrecioProveedor", back_populates="proveedor", cascade="all, delete-orphan")


class PrecioProveedor(Base):
    __tablename__ = "precios_proveedor"

    id = Column(Integer, primary_key=True, index=True)
    proveedor_id = Column(Integer, ForeignKey("proveedores.id"))
    ingrediente_id = Column(Integer, ForeignKey("ingredientes.id"))
    precio = Column(Float, default=0)            # precio por unidad del ingrediente
    fecha = Column(DateTime, default=datetime.utcnow)
    notas = Column(String(300), default="")

    proveedor = relationship("Proveedor", back_populates="precios")
    ingrediente = relationship("Ingrediente")
