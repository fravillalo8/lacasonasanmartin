from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Ingrediente, Compra, MovimientoStock, Receta, ItemReceta, Venta, ItemComanda, Producto, GastoDia, Merma, Comanda, AuditLog
from routers.auth import require_auth, require_admin
import csv
import io

router = APIRouter(prefix="/api/reportes", tags=["reportes"])


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), _=Depends(require_auth)):
    """KPIs principales para el dashboard."""
    total_ingredientes = db.query(Ingrediente).filter(Ingrediente.activo == True).count()
    alertas_stock = (
        db.query(Ingrediente)
        .filter(
            Ingrediente.activo == True,
            Ingrediente.stock_minimo > 0,
            Ingrediente.stock <= Ingrediente.stock_minimo,
        )
        .count()
    )
    total_recetas = db.query(Receta).filter(Receta.activo == True).count()

    # Valor total del inventario
    ingredientes = db.query(Ingrediente).filter(Ingrediente.activo == True).all()
    valor_inventario = sum(i.stock * i.costo_unitario for i in ingredientes)

    # Compras del mes actual
    hoy = datetime.utcnow()
    inicio_mes = hoy.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    compras_mes = (
        db.query(func.sum(Compra.monto_total))
        .filter(Compra.fecha >= inicio_mes)
        .scalar() or 0
    )
    num_compras_mes = db.query(Compra).filter(Compra.fecha >= inicio_mes).count()

    # Últimas compras
    ultimas_compras = (
        db.query(Compra)
        .order_by(Compra.fecha.desc())
        .limit(5)
        .all()
    )

    # Ventas del día y del mes
    inicio_hoy = hoy.replace(hour=0, minute=0, second=0, microsecond=0)
    ventas_hoy = db.query(func.sum(Venta.total)).filter(Venta.created_at >= inicio_hoy).scalar() or 0
    num_ventas_hoy = db.query(Venta).filter(Venta.created_at >= inicio_hoy).count()
    ventas_mes = db.query(func.sum(Venta.total)).filter(Venta.created_at >= inicio_mes).scalar() or 0
    num_ventas_mes = db.query(Venta).filter(Venta.created_at >= inicio_mes).count()

    # Ticket promedio del día
    ticket_promedio_hoy = round(ventas_hoy / num_ventas_hoy, 0) if num_ventas_hoy > 0 else 0

    # Ventas últimos 7 días vs 7 días anteriores (comparativa)
    inicio_7d = hoy - timedelta(days=7)
    inicio_7d_prev = hoy - timedelta(days=14)
    ventas_7d = db.query(func.sum(Venta.total)).filter(
        Venta.created_at >= inicio_7d
    ).scalar() or 0
    ventas_7d_prev = db.query(func.sum(Venta.total)).filter(
        Venta.created_at >= inicio_7d_prev,
        Venta.created_at < inicio_7d,
    ).scalar() or 0

    # Top 3 productos del día (comandas cerradas hoy)
    top_hoy = (
        db.query(
            ItemComanda.producto_id,
            func.sum(ItemComanda.cantidad).label("qty"),
        )
        .join(ItemComanda.comanda)
        .filter(
            Comanda.estado == "cerrada",
            Comanda.created_at >= inicio_hoy,
        )
        .group_by(ItemComanda.producto_id)
        .order_by(func.sum(ItemComanda.cantidad).desc())
        .limit(3)
        .all()
    )

    top_hoy_data = []
    for row in top_hoy:
        prod = db.query(Producto).filter(Producto.id == row.producto_id).first()
        if prod:
            top_hoy_data.append({"nombre": prod.nombre, "cantidad": int(row.qty)})

    return {
        "total_ingredientes": total_ingredientes,
        "alertas_stock": alertas_stock,
        "total_recetas": total_recetas,
        "valor_inventario": round(valor_inventario, 0),
        "compras_mes": round(compras_mes, 0),
        "num_compras_mes": num_compras_mes,
        "ventas_hoy": round(ventas_hoy, 0),
        "num_ventas_hoy": num_ventas_hoy,
        "ventas_mes": round(ventas_mes, 0),
        "num_ventas_mes": num_ventas_mes,
        "ticket_promedio_hoy": ticket_promedio_hoy,
        "ventas_7d": round(ventas_7d, 0),
        "ventas_7d_prev": round(ventas_7d_prev, 0),
        "top_hoy": top_hoy_data,
        "ultimas_compras": [
            {
                "id": c.id,
                "nombre_proveedor": c.nombre_proveedor,
                "fecha": c.fecha.strftime("%d/%m/%Y") if c.fecha else "",
                "monto_total": c.monto_total,
                "verificado_sii": c.verificado_sii,
            }
            for c in ultimas_compras
        ],
    }


@router.get("/movimientos")
def movimientos(
    dias: int = Query(30, ge=1, le=365),
    ingrediente_id: int = Query(None),
    db: Session = Depends(get_db),
    _=Depends(require_auth),
):
    desde = datetime.utcnow() - timedelta(days=dias)
    q = db.query(MovimientoStock).filter(MovimientoStock.created_at >= desde)
    if ingrediente_id:
        q = q.filter(MovimientoStock.ingrediente_id == ingrediente_id)
    movs = q.order_by(MovimientoStock.created_at.desc()).limit(200).all()
    return [
        {
            "id": m.id,
            "ingrediente": m.ingrediente.nombre if m.ingrediente else "",
            "unidad": m.ingrediente.unidad if m.ingrediente else "",
            "tipo": m.tipo,
            "cantidad": m.cantidad,
            "motivo": m.motivo,
            "referencia_tipo": m.referencia_tipo,
            "fecha": m.created_at.strftime("%d/%m/%Y %H:%M") if m.created_at else "",
        }
        for m in movs
    ]


@router.get("/costos-recetas")
def costos_recetas(db: Session = Depends(get_db), _=Depends(require_auth)):
    """Análisis de costos y márgenes por receta."""
    recetas = db.query(Receta).filter(Receta.activo == True).all()
    resultado = []
    for r in recetas:
        costo = sum(
            (i.cantidad * i.ingrediente.costo_unitario)
            for i in r.items
            if i.ingrediente
        )
        costo_porcion = costo / r.porciones if r.porciones else costo
        margen = r.precio_venta - costo_porcion if r.precio_venta else 0
        resultado.append({
            "id": r.id,
            "nombre": r.nombre,
            "categoria": r.categoria,
            "precio_venta": r.precio_venta,
            "costo_total": round(costo, 0),
            "costo_porcion": round(costo_porcion, 0),
            "margen": round(margen, 0),
            "margen_pct": round((margen / r.precio_venta) * 100, 1) if r.precio_venta else 0,
        })
    return sorted(resultado, key=lambda x: x["margen_pct"], reverse=True)


@router.get("/compras-por-periodo")
def compras_por_periodo(
    meses: int = Query(6, ge=1, le=24),
    db: Session = Depends(get_db),
    _=Depends(require_auth),
):
    """Gastos de compra agrupados por mes."""
    desde = datetime.utcnow() - timedelta(days=meses * 30)
    compras = db.query(Compra).filter(Compra.fecha >= desde).all()

    por_mes: dict[str, float] = {}
    for c in compras:
        mes = c.fecha.strftime("%Y-%m") if c.fecha else "?"
        por_mes[mes] = por_mes.get(mes, 0) + c.monto_total

    return [
        {"mes": mes, "total": round(total, 0)}
        for mes, total in sorted(por_mes.items())
    ]


@router.get("/top-productos")
def top_productos(
    dias: int = Query(30, ge=1, le=365),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    _=Depends(require_auth),
):
    """Ranking de productos más vendidos por cantidad y por ingresos."""
    desde = datetime.utcnow() - timedelta(days=dias)
    items = (
        db.query(
            ItemComanda.producto_id,
            func.sum(ItemComanda.cantidad).label("total_cantidad"),
            func.sum(ItemComanda.subtotal).label("total_ingresos"),
        )
        .join(ItemComanda.comanda)
        .filter(ItemComanda.comanda.has(estado="cerrada"))
        .group_by(ItemComanda.producto_id)
        .order_by(func.sum(ItemComanda.cantidad).desc())
        .limit(limit)
        .all()
    )

    resultado = []
    for row in items:
        prod = db.query(Producto).filter(Producto.id == row.producto_id).first()
        resultado.append({
            "producto_id": row.producto_id,
            "nombre": prod.nombre if prod else "Desconocido",
            "categoria": prod.categoria if prod else "",
            "total_cantidad": int(row.total_cantidad),
            "total_ingresos": round(float(row.total_ingresos), 0),
        })
    return resultado


@router.get("/horarios-pico")
def horarios_pico(
    dias: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
    _=Depends(require_auth),
):
    """Heatmap de ventas por hora del día y día de la semana."""
    desde = datetime.utcnow() - timedelta(days=dias)
    ventas = db.query(Venta).filter(Venta.created_at >= desde).all()

    dias_semana = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
    heatmap: dict[str, dict[int, int]] = {d: {h: 0 for h in range(24)} for d in dias_semana}
    conteo_hora: dict[int, int] = {h: 0 for h in range(24)}

    for v in ventas:
        if v.created_at:
            dia_idx = v.created_at.weekday()
            hora = v.created_at.hour
            heatmap[dias_semana[dia_idx]][hora] += 1
            conteo_hora[hora] += 1

    return {
        "heatmap": heatmap,
        "por_hora": [{"hora": h, "total": conteo_hora[h]} for h in range(24)],
        "por_dia": [
            {"dia": d, "total": sum(heatmap[d].values())}
            for d in dias_semana
        ],
    }


@router.get("/pyl")
def pyl_mensual(
    meses: int = Query(3, ge=1, le=12),
    db: Session = Depends(get_db),
    _=Depends(require_auth),
):
    """P&L mensual: ingresos - compras - gastos - mermas."""
    desde = datetime.utcnow() - timedelta(days=meses * 31)

    ventas = db.query(Venta).filter(Venta.created_at >= desde).all()
    compras = db.query(Compra).filter(Compra.fecha >= desde).all()
    gastos = db.query(GastoDia).filter(GastoDia.fecha >= desde).all()
    mermas = db.query(Merma).filter(Merma.created_at >= desde).all()

    def mes_key(dt: datetime) -> str:
        return dt.strftime("%Y-%m")

    resumen: dict[str, dict] = {}

    for v in ventas:
        if v.created_at:
            k = mes_key(v.created_at)
            if k not in resumen:
                resumen[k] = {"ingresos": 0, "compras": 0, "gastos": 0, "mermas": 0}
            resumen[k]["ingresos"] += v.total

    for c in compras:
        if c.fecha:
            k = mes_key(c.fecha)
            if k not in resumen:
                resumen[k] = {"ingresos": 0, "compras": 0, "gastos": 0, "mermas": 0}
            resumen[k]["compras"] += c.monto_total

    for g in gastos:
        if g.fecha:
            k = mes_key(g.fecha)
            if k not in resumen:
                resumen[k] = {"ingresos": 0, "compras": 0, "gastos": 0, "mermas": 0}
            resumen[k]["gastos"] += g.monto

    for m in mermas:
        if m.created_at:
            k = mes_key(m.created_at)
            if k not in resumen:
                resumen[k] = {"ingresos": 0, "compras": 0, "gastos": 0, "mermas": 0}
            resumen[k]["mermas"] += m.costo_estimado

    resultado = []
    for mes, data in sorted(resumen.items()):
        ingresos = round(data["ingresos"], 0)
        egresos = round(data["compras"] + data["gastos"] + data["mermas"], 0)
        resultado.append({
            "mes": mes,
            "ingresos": ingresos,
            "compras": round(data["compras"], 0),
            "gastos": round(data["gastos"], 0),
            "mermas": round(data["mermas"], 0),
            "egresos": egresos,
            "resultado": round(ingresos - egresos, 0),
        })
    return resultado


@router.get("/estadisticas-roles")
def estadisticas_roles(
    dias: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """Resumen de actividad y ventas agrupado por rol (admin/mozo/cocina)."""
    desde = datetime.utcnow() - timedelta(days=dias)

    # Ventas por rol (usando AuditLog accion=cobrar_mesa)
    logs_cobros = (
        db.query(AuditLog.usuario_rol, func.count(AuditLog.id).label("cobros"))
        .filter(AuditLog.created_at >= desde, AuditLog.accion == "cobrar_mesa")
        .group_by(AuditLog.usuario_rol)
        .all()
    )
    cobros_por_rol = {r.usuario_rol: r.cobros for r in logs_cobros}

    # Ítems agregados por rol
    logs_items = (
        db.query(AuditLog.usuario_rol, func.count(AuditLog.id).label("items"))
        .filter(AuditLog.created_at >= desde, AuditLog.accion == "agregar_item")
        .group_by(AuditLog.usuario_rol)
        .all()
    )
    items_por_rol = {r.usuario_rol: r.items for r in logs_items}

    # Total de todas las acciones por rol
    logs_total = (
        db.query(AuditLog.usuario_rol, func.count(AuditLog.id).label("total"))
        .filter(AuditLog.created_at >= desde)
        .group_by(AuditLog.usuario_rol)
        .all()
    )
    total_por_rol = {r.usuario_rol: r.total for r in logs_total}

    # Ventas totales del período para el promedio
    ventas_periodo = db.query(Venta).filter(Venta.created_at >= desde).all()
    total_ventas_periodo = sum(v.total for v in ventas_periodo)

    roles = list(set(list(cobros_por_rol.keys()) + list(items_por_rol.keys()) + list(total_por_rol.keys())))
    if not roles:
        roles = ["admin", "mozo", "cocina"]

    resultado = []
    for rol in sorted(roles):
        cobros = cobros_por_rol.get(rol, 0)
        resultado.append({
            "rol": rol,
            "cobros": cobros,
            "items_agregados": items_por_rol.get(rol, 0),
            "total_acciones": total_por_rol.get(rol, 0),
        })

    return {
        "dias": dias,
        "total_ventas_periodo": round(total_ventas_periodo, 0),
        "roles": resultado,
    }


# ─── CSV Exports ─────────────────────────────────────────────────────────────

@router.get("/top-productos/csv")
def top_productos_csv(
    dias: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    items = (
        db.query(
            ItemComanda.producto_id,
            func.sum(ItemComanda.cantidad).label("total_cantidad"),
            func.sum(ItemComanda.subtotal).label("total_ingresos"),
        )
        .join(ItemComanda.comanda)
        .filter(ItemComanda.comanda.has(estado="cerrada"))
        .group_by(ItemComanda.producto_id)
        .order_by(func.sum(ItemComanda.cantidad).desc())
        .all()
    )
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Producto", "Categoría", "Unidades vendidas", "Ingresos CLP"])
    for row in items:
        prod = db.query(Producto).filter(Producto.id == row.producto_id).first()
        writer.writerow([
            prod.nombre if prod else "",
            prod.categoria if prod else "",
            int(row.total_cantidad),
            round(float(row.total_ingresos), 0),
        ])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=top-productos-{dias}dias.csv"},
    )


@router.get("/pyl/csv")
def pyl_csv(
    meses: int = Query(3, ge=1, le=12),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    # Reutiliza la lógica del endpoint P&L
    desde = datetime.utcnow() - timedelta(days=meses * 31)
    ventas = db.query(Venta).filter(Venta.created_at >= desde).all()
    compras = db.query(Compra).filter(Compra.fecha >= desde).all()
    gastos = db.query(GastoDia).filter(GastoDia.fecha >= desde).all()
    mermas = db.query(Merma).filter(Merma.created_at >= desde).all()

    resumen: dict = {}
    for v in ventas:
        if v.created_at:
            k = v.created_at.strftime("%Y-%m")
            resumen.setdefault(k, {"ingresos": 0, "compras": 0, "gastos": 0, "mermas": 0})
            resumen[k]["ingresos"] += v.total
    for c in compras:
        if c.fecha:
            k = c.fecha.strftime("%Y-%m")
            resumen.setdefault(k, {"ingresos": 0, "compras": 0, "gastos": 0, "mermas": 0})
            resumen[k]["compras"] += c.monto_total
    for g in gastos:
        if g.fecha:
            k = g.fecha.strftime("%Y-%m")
            resumen.setdefault(k, {"ingresos": 0, "compras": 0, "gastos": 0, "mermas": 0})
            resumen[k]["gastos"] += g.monto
    for m in mermas:
        if m.created_at:
            k = m.created_at.strftime("%Y-%m")
            resumen.setdefault(k, {"ingresos": 0, "compras": 0, "gastos": 0, "mermas": 0})
            resumen[k]["mermas"] += m.costo_estimado

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Mes", "Ingresos", "Compras", "Gastos", "Mermas", "Egresos", "Resultado"])
    for mes, data in sorted(resumen.items()):
        egresos = data["compras"] + data["gastos"] + data["mermas"]
        writer.writerow([
            mes,
            round(data["ingresos"], 0),
            round(data["compras"], 0),
            round(data["gastos"], 0),
            round(data["mermas"], 0),
            round(egresos, 0),
            round(data["ingresos"] - egresos, 0),
        ])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=pyl-{meses}meses.csv"},
    )


@router.get("/ventas/csv")
def ventas_csv(
    dias: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    desde = datetime.utcnow() - timedelta(days=dias)
    ventas = db.query(Venta).filter(Venta.created_at >= desde).order_by(Venta.created_at.desc()).all()
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Fecha", "Mesa", "Subtotal", "Descuento", "Propina", "Total", "Tipo pago"])
    for v in ventas:
        writer.writerow([
            v.created_at.strftime("%d/%m/%Y %H:%M") if v.created_at else "",
            v.numero_mesa or "",
            round(v.subtotal or 0, 0),
            round(v.descuento or 0, 0),
            round(v.propina or 0, 0),
            round(v.total or 0, 0),
            v.tipo_pago or "",
        ])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=ventas-{dias}dias.csv"},
    )
