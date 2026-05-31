// En dev: vacío → Vite proxea /api → localhost:8000
// En prod: URL completa del backend Railway (VITE_API_URL=https://xxx.railway.app)
const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api'

function getToken() {
  return localStorage.getItem('inv_token') || ''
}

// ─── Offline infrastructure ────────────────────────────────────────────────

export interface QueuedOp {
  id: string
  path: string
  method: string
  body?: unknown
  timestamp: number
}

const Q_KEY = 'mc_offline_queue'
const C_PREFIX = 'mc_cache_'

export const offlineQ = {
  get: (): QueuedOp[] => {
    try { return JSON.parse(localStorage.getItem(Q_KEY) || '[]') } catch { return [] }
  },
  add: (op: Omit<QueuedOp, 'id' | 'timestamp'>): QueuedOp => {
    const full: QueuedOp = { ...op, id: crypto.randomUUID(), timestamp: Date.now() }
    localStorage.setItem(Q_KEY, JSON.stringify([...offlineQ.get(), full]))
    return full
  },
  remove: (id: string) => {
    localStorage.setItem(Q_KEY, JSON.stringify(offlineQ.get().filter(o => o.id !== id)))
  },
  count: (): number => offlineQ.get().length,
}

const apiCache = {
  set: (key: string, data: unknown) =>
    localStorage.setItem(C_PREFIX + key, JSON.stringify({ data, ts: Date.now() })),
  get: <T>(key: string): T | null => {
    try {
      const s = localStorage.getItem(C_PREFIX + key)
      return s ? (JSON.parse(s).data as T) : null
    } catch { return null }
  },
}

export class OfflineEnqueuedError extends Error {
  readonly op: QueuedOp
  constructor(op: QueuedOp) {
    super('offline_enqueued')
    this.name = 'OfflineEnqueuedError'
    this.op = op
  }
}

export async function syncQueue(): Promise<{ synced: number; failed: number }> {
  const queue = offlineQ.get()
  if (queue.length === 0) return { synced: 0, failed: 0 }
  let synced = 0, failed = 0
  for (const op of queue) {
    try {
      const res = await fetch(`${BASE}${op.path}`, {
        method: op.method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: op.body !== undefined ? JSON.stringify(op.body) : undefined,
      })
      offlineQ.remove(op.id)
      if (res.ok) synced++
      else failed++ // op inválido (4xx) — descartar para no bloquear
    } catch {
      break // error de red — parar y reintentar próxima vez
    }
  }
  return { synced, failed }
}

// ─── Request ───────────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase()

  if (!navigator.onLine) {
    if (method === 'GET') {
      const cached = apiCache.get<T>(path)
      if (cached !== null) return cached
      throw new Error('Sin conexión y sin datos en caché')
    }
    // Mutar offline → encolar
    const op = offlineQ.add({
      path,
      method,
      body: options.body ? JSON.parse(options.body as string) : undefined,
    })
    throw new OfflineEnqueuedError(op)
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('inv_token')
      localStorage.removeItem('inv_role')
      window.location.href = '/mesa-central/login'
      throw new Error('Sesión expirada')
    }
    const text = await res.text().catch(() => '')
    let detail = `HTTP ${res.status}`
    try {
      const err = JSON.parse(text)
      if (typeof err.detail === 'string') detail = err.detail
      else detail = `HTTP ${res.status}: ${text.slice(0, 120)}`
    } catch { detail = `HTTP ${res.status}: ${text.slice(0, 120)}` }
    throw new Error(detail)
  }
  const data = await res.json() as T
  if (method === 'GET') apiCache.set(path, data)
  return data
}

// ─── Auth ─────────────────────────────────────────────────────────────────
export const api = {
  auth: {
    login: (pin: string) =>
      request<{ token: string; role: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ pin }),
      }),
    me: () => request<{ ok: boolean; role: string }>('/auth/me'),
  },

  // ─── Ingredientes ────────────────────────────────────────────────────────
  ingredientes: {
    list: () => request<Ingrediente[]>('/ingredientes'),
    create: (data: IngredienteIn) =>
      request<Ingrediente>('/ingredientes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: IngredienteIn) =>
      request<Ingrediente>(`/ingredientes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<{ ok: boolean }>(`/ingredientes/${id}`, { method: 'DELETE' }),
    ajustar: (id: number, cantidad: number, motivo: string) =>
      request<Ingrediente>(`/ingredientes/${id}/ajustar`, {
        method: 'POST',
        body: JSON.stringify({ cantidad, motivo }),
      }),
    alertas: () => request<Ingrediente[]>('/ingredientes/alertas/stock-bajo'),
  },

  // ─── Compras ─────────────────────────────────────────────────────────────
  compras: {
    list: () => request<Compra[]>('/compras'),
    create: (data: CompraIn) =>
      request<Compra>('/compras', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<{ ok: boolean }>(`/compras/${id}`, { method: 'DELETE' }),
    verificarSII: (data: VerificarDTEIn) =>
      request<VerificacionSII>('/compras/verificar-sii', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    importarXML: async (file: File): Promise<DTEImportado> => {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${BASE}/compras/importar-xml`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail || 'Error importando XML')
      }
      return res.json()
    },
  },

  // ─── Recetas ─────────────────────────────────────────────────────────────
  recetas: {
    list: () => request<Receta[]>('/recetas'),
    create: (data: RecetaIn) =>
      request<Receta>('/recetas', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: RecetaIn) =>
      request<Receta>(`/recetas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<{ ok: boolean }>(`/recetas/${id}`, { method: 'DELETE' }),
    consumir: (id: number, porciones: number) =>
      request<{ ok: boolean }>(`/recetas/${id}/consumir`, {
        method: 'POST',
        body: JSON.stringify({ porciones }),
      }),
  },

  // ─── Reportes ────────────────────────────────────────────────────────────
  reportes: {
    dashboard: () => request<DashboardData>('/reportes/dashboard'),
    movimientos: (dias?: number) =>
      request<Movimiento[]>(`/reportes/movimientos${dias ? `?dias=${dias}` : ''}`),
    costosRecetas: () => request<CostoReceta[]>('/reportes/costos-recetas'),
    comprasPeriodo: (meses?: number) =>
      request<ComprasMes[]>(`/reportes/compras-por-periodo${meses ? `?meses=${meses}` : ''}`),
    topProductos: (dias?: number) =>
      request<TopProducto[]>(`/reportes/top-productos${dias ? `?dias=${dias}` : ''}`),
    horariosPico: (dias?: number) =>
      request<HorariosPico>(`/reportes/horarios-pico${dias ? `?dias=${dias}` : ''}`),
    pyl: (meses?: number) =>
      request<PYLMes[]>(`/reportes/pyl${meses ? `?meses=${meses}` : ''}`),
    estadisticasRoles: (dias?: number) =>
      request<EstadisticasRoles>(`/reportes/estadisticas-roles${dias ? `?dias=${dias}` : ''}`),
  },

  // ─── Productos extra ──────────────────────────────────────────────────────
  productosExtra: {
    agotar: (id: number) =>
      request<{ id: number; agotado_hoy: boolean }>(`/productos/${id}/agotar`, { method: 'POST' }),
    subirFoto: (id: number, dataUrl: string) =>
      request<Producto>(`/productos/${id}/foto`, { method: 'POST', body: JSON.stringify({ data_url: dataUrl }) }),
  },

  // ─── Productos ───────────────────────────────────────────────────────────
  productos: {
    list: (soloActivos?: boolean) =>
      request<Producto[]>(`/productos${soloActivos ? '?solo_activos=true' : ''}`),
    create: (data: ProductoIn) =>
      request<Producto>('/productos', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: ProductoIn) =>
      request<Producto>(`/productos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<{ ok: boolean }>(`/productos/${id}`, { method: 'DELETE' }),
    importarCSV: async (file: File): Promise<{ creados: number; errores: string[] }> => {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${BASE}/productos/importar-csv`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail || 'Error importando CSV')
      }
      return res.json()
    },
  },

  // ─── Mesas ───────────────────────────────────────────────────────────────
  mesas: {
    list: () => request<Mesa[]>('/mesas'),
    create: (data: MesaIn) =>
      request<Mesa>('/mesas', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: MesaIn) =>
      request<Mesa>(`/mesas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<{ ok: boolean }>(`/mesas/${id}`, { method: 'DELETE' }),
    moverPosicion: (id: number, posicion_x: number, posicion_y: number) =>
      request<Mesa>(`/mesas/${id}/posicion`, { method: 'PATCH', body: JSON.stringify({ posicion_x, posicion_y }) }),
    historial: (id: number, limit = 10) =>
      request<HistorialComanda[]>(`/mesas/${id}/historial?limit=${limit}`),
  },

  // ─── Comandas ────────────────────────────────────────────────────────────
  comandas: {
    abrir: (mesa_id: number) =>
      request<Comanda>(`/comandas/abrir/${mesa_id}`, { method: 'POST' }),
    delivery: (cliente_nombre: string) =>
      request<Comanda>('/comandas/delivery', { method: 'POST', body: JSON.stringify({ cliente_nombre }) }),
    ver: (id: number) => request<Comanda>(`/comandas/${id}`),
    activos: () => request<Comanda[]>('/comandas/activos'),
    agregarItem: (id: number, data: { producto_id: number; cantidad: number; notas?: string }) =>
      request<Comanda>(`/comandas/${id}/items`, { method: 'POST', body: JSON.stringify(data) }),
    quitarItem: (id: number, item_id: number) =>
      request<Comanda>(`/comandas/${id}/items/${item_id}`, { method: 'DELETE' }),
    cobrar: (id: number, data: PagoIn) =>
      request<PagoOut>(`/comandas/${id}/cobrar`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    cancelar: (id: number) =>
      request<{ ok: boolean }>(`/comandas/${id}/cancelar`, { method: 'POST' }),
    cocina: () => request<Comanda[]>('/comandas/cocina'),
    cambiarCantidad: (id: number, item_id: number, cantidad: number) =>
      request<Comanda>(`/comandas/${id}/items/${item_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ cantidad }),
      }),
    toggleListo: (id: number, item_id: number) =>
      request<Comanda>(`/comandas/${id}/items/${item_id}/listo`, { method: 'POST' }),
    todoListo: (id: number) =>
      request<Comanda>(`/comandas/${id}/todo-listo`, { method: 'POST' }),
    historialCocina: () => request<Comanda[]>('/comandas/historial-cocina'),
    pedirCuenta: (id: number) =>
      request<Comanda>(`/comandas/${id}/pedir-cuenta`, { method: 'POST' }),
  },

  // ─── Ventas ──────────────────────────────────────────────────────────────
  ventas: {
    list: (params?: { fecha_desde?: string; fecha_hasta?: string; tipo_pago?: string }) => {
      const qs = new URLSearchParams()
      if (params?.fecha_desde) qs.set('fecha_desde', params.fecha_desde)
      if (params?.fecha_hasta) qs.set('fecha_hasta', params.fecha_hasta)
      if (params?.tipo_pago) qs.set('tipo_pago', params.tipo_pago)
      const q = qs.toString()
      return request<VentaDetalle[]>(`/ventas${q ? `?${q}` : ''}`)
    },
    resumen: () => request<VentasResumen>('/ventas/resumen'),
  },

  // ─── Reservas ─────────────────────────────────────────────────────────────
  reservas: {
    list: () => request<Reserva[]>('/reservas'),
    create: (data: ReservaIn) =>
      request<Reserva>('/reservas', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: ReservaIn) =>
      request<Reserva>(`/reservas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<{ ok: boolean }>(`/reservas/${id}`, { method: 'DELETE' }),
  },

  // ─── Clientes ─────────────────────────────────────────────────────────────
  clientes: {
    list: (q?: string) => request<ClienteFrecuente[]>(`/clientes${q ? `?q=${encodeURIComponent(q)}` : ''}`),
    create: (data: ClienteIn) =>
      request<ClienteFrecuente>('/clientes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: ClienteIn) =>
      request<ClienteFrecuente>(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<{ ok: boolean }>(`/clientes/${id}`, { method: 'DELETE' }),
    visita: (id: number, gasto: number) =>
      request<ClienteFrecuente>(`/clientes/${id}/visita?gasto=${gasto}`, { method: 'POST' }),
  },

  // ─── Caja ─────────────────────────────────────────────────────────────────
  caja: {
    cierre: (fecha?: string) =>
      request<CierreCaja>(`/caja/cierre${fecha ? `?fecha=${fecha}` : ''}`),
    gastos: () => request<GastoDia[]>('/caja/gastos'),
    agregarGasto: (data: GastoIn) =>
      request<GastoDia>('/caja/gastos', { method: 'POST', body: JSON.stringify(data) }),
    eliminarGasto: (id: number) =>
      request<{ ok: boolean }>(`/caja/gastos/${id}`, { method: 'DELETE' }),
  },

  // ─── Mermas ───────────────────────────────────────────────────────────────
  mermas: {
    list: () => request<MermaItem[]>('/mermas'),
    registrar: (data: MermaIn) =>
      request<{ ok: boolean; costo_estimado: number; stock_restante: number }>(
        '/mermas', { method: 'POST', body: JSON.stringify(data) }
      ),
    resumen: () => request<MermaResumen>('/mermas/resumen'),
  },

  // ─── Proveedores ──────────────────────────────────────────────────────────
  proveedores: {
    list: () => request<Proveedor[]>('/proveedores'),
    create: (data: ProveedorIn) =>
      request<Proveedor>('/proveedores', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: ProveedorIn) =>
      request<Proveedor>(`/proveedores/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<{ ok: boolean }>(`/proveedores/${id}`, { method: 'DELETE' }),
    precios: (id: number) =>
      request<PrecioProveedor[]>(`/proveedores/${id}/precios`),
    upsertPrecio: (id: number, data: PrecioIn) =>
      request<PrecioProveedor>(`/proveedores/${id}/precios`, { method: 'POST', body: JSON.stringify(data) }),
    deletePrecio: (provId: number, precioId: number) =>
      request<{ ok: boolean }>(`/proveedores/${provId}/precios/${precioId}`, { method: 'DELETE' }),
  },

  // ─── MP Point ────────────────────────────────────────────────────────────
  mpPoint: {
    devices: () => request<{ devices: MPDevice[] }>('/mp-point/devices'),
    crearIntent: (data: { device_id: string; amount: number; description?: string }) =>
      request<MPIntent>('/mp-point/intents', { method: 'POST', body: JSON.stringify(data) }),
    verIntent: (intent_id: string) => request<MPIntent>(`/mp-point/intents/${intent_id}`),
    cancelarIntent: (device_id: string, intent_id: string) =>
      request<{ ok: boolean }>(`/mp-point/intents/${device_id}/${intent_id}`, { method: 'DELETE' }),
  },

  // ─── Auditoría ────────────────────────────────────────────────────────────
  auditoria: {
    list: (dias = 7) => request<AuditEntry[]>(`/auditoria?dias=${dias}`),
  },

  // ─── Cotizador ────────────────────────────────────────────────────────────
  cotizador: {
    comparar: () => request<ComparacionData>('/cotizador/comparar'),
    pedidoOptimo: (items: { ingrediente_id: number; cantidad: number }[]) =>
      request<PedidoOptimo>('/cotizador/pedido-optimo', {
        method: 'POST',
        body: JSON.stringify({ items }),
      }),
    prediccion: (dias = 30, diasObjetivo = 14) =>
      request<PrediccionCompras>(`/cotizador/prediccion-compras?dias=${dias}&dias_objetivo=${diasObjetivo}`),
  },
}

// ─── Tipos ────────────────────────────────────────────────────────────────
export interface Ingrediente {
  id: number
  nombre: string
  unidad: string
  stock: number
  stock_minimo: number
  costo_unitario: number
  categoria: string
  activo: boolean
  valor_stock: number
  alerta_stock: boolean
}

export interface IngredienteIn {
  nombre: string
  unidad: string
  stock?: number
  stock_minimo?: number
  costo_unitario?: number
  categoria?: string
}

export interface ItemCompra {
  id: number
  descripcion: string
  cantidad: number
  precio_unitario: number
  monto_item: number
  ingrediente_id: number | null
  ingrediente_nombre: string | null
}

export interface Compra {
  id: number
  folio_sii: string
  tipo_dte: number
  tipo_nombre: string
  rut_proveedor: string
  nombre_proveedor: string
  fecha: string
  monto_neto: number
  iva: number
  monto_total: number
  verificado_sii: boolean
  estado_sii: string
  notas: string
  items: ItemCompra[]
}

export interface CompraIn {
  folio_sii?: string
  tipo_dte?: number
  rut_proveedor: string
  nombre_proveedor: string
  fecha: string
  monto_neto?: number
  iva?: number
  monto_total: number
  notas?: string
  items: {
    descripcion: string
    cantidad: number
    precio_unitario: number
    monto_item: number
    ingrediente_id?: number | null
  }[]
}

export interface VerificarDTEIn {
  rut_emisor: string
  dv_emisor: string
  tipo_dte: number
  folio: number
  fecha: string
  monto: number
}

export interface VerificacionSII {
  verificado: boolean | null
  estado_codigo: string
  estado_glosa: string
  folio?: number
  tipo_dte?: number
  tipo_nombre?: string
}

export interface DTEImportado {
  folio_sii: string
  tipo_dte: number
  tipo_nombre: string
  rut_proveedor: string
  nombre_proveedor: string
  fecha: string
  monto_neto: number
  iva: number
  monto_total: number
  items: {
    descripcion: string
    cantidad: number
    unidad: string
    precio_unitario: number
    monto_item: number
    ingrediente_id: null
  }[]
}

export interface ItemReceta {
  id: number
  ingrediente_id: number
  ingrediente_nombre: string
  ingrediente_unidad: string
  cantidad: number
  costo_linea: number
}

export interface Receta {
  id: number
  nombre: string
  descripcion: string
  precio_venta: number
  porciones: number
  categoria: string
  activo: boolean
  costo_total: number
  costo_porcion: number
  margen: number
  margen_pct: number
  items: ItemReceta[]
}

export interface RecetaIn {
  nombre: string
  descripcion?: string
  precio_venta?: number
  porciones?: number
  categoria?: string
  items: { ingrediente_id: number; cantidad: number }[]
}

export interface DashboardData {
  total_ingredientes: number
  alertas_stock: number
  total_recetas: number
  valor_inventario: number
  compras_mes: number
  num_compras_mes: number
  ventas_hoy: number
  num_ventas_hoy: number
  ventas_mes: number
  num_ventas_mes: number
  ticket_promedio_hoy: number
  ventas_7d: number
  ventas_7d_prev: number
  top_hoy: { nombre: string; cantidad: number }[]
  ultimas_compras: {
    id: number
    nombre_proveedor: string
    fecha: string
    monto_total: number
    verificado_sii: boolean
  }[]
}

export interface AuditEntry {
  id: number
  accion: string
  detalle: string
  usuario_rol: string
  referencia_id: number | null
  referencia_tipo: string | null
  fecha: string
}

export interface PagoIn {
  tipo_pago: string
  monto_recibido: number
  descuento_pct?: number
  descuento_monto?: number
  propina?: number
  pago2_tipo?: string
  pago2_monto?: number
}

export interface PagoOut {
  ok: boolean
  subtotal: number
  descuento: number
  propina: number
  total: number
  vuelto: number
  pago2_tipo?: string
  pago2_monto?: number
}

export interface VentaDetalle {
  id: number
  comanda_id: number
  numero_mesa: number
  subtotal: number
  descuento: number
  propina: number
  total: number
  tipo_pago: string
  monto_recibido: number
  vuelto: number
  fecha: string
  hora: string
  created_at: string
  items: {
    nombre_producto: string
    cantidad: number
    precio_unitario: number
    subtotal: number
  }[]
}

export interface VentasResumen {
  hoy: { total: number; count: number; por_pago: Record<string, number> }
  semana: { total: number; count: number; por_pago: Record<string, number> }
  mes: { total: number; count: number; por_pago: Record<string, number> }
}

export interface Movimiento {
  id: number
  ingrediente: string
  unidad: string
  tipo: string
  cantidad: number
  motivo: string
  referencia_tipo: string
  fecha: string
}

export interface CostoReceta {
  id: number
  nombre: string
  categoria: string
  precio_venta: number
  costo_total: number
  costo_porcion: number
  margen: number
  margen_pct: number
}

export interface ComprasMes {
  mes: string
  total: number
}

export interface Producto {
  id: number
  nombre: string
  descripcion: string
  precio: number
  categoria: string
  foto: string
  activo: boolean
  agotado_hoy: boolean
}

export interface ProductoIn {
  nombre: string
  descripcion?: string
  precio?: number
  categoria?: string
  foto?: string
  activo?: boolean
}

export interface Mesa {
  id: number
  numero: number
  nombre: string
  capacidad: number
  estado: 'libre' | 'ocupada' | 'cuenta'
  posicion_x: number
  posicion_y: number
  comanda_abierta_id: number | null
}

export interface MesaIn {
  numero: number
  nombre?: string
  capacidad?: number
  posicion_x?: number
  posicion_y?: number
}

export interface HistorialComanda {
  id: number
  numero_ticket: number | null
  estado: string
  total: number
  tipo_pago: string
  pago2_tipo: string
  pago2_monto: number
  descuento: number
  propina: number
  total_cobrado: number
  created_at: string
  closed_at: string
  items: { nombre: string; cantidad: number; subtotal: number; notas: string }[]
}

export interface ItemComanda {
  id: number
  producto_id: number
  nombre_producto: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  notas: string
  listo: boolean
}

export interface Comanda {
  id: number
  mesa_id: number | null
  numero_mesa: number
  numero_ticket: number | null
  tipo: string
  cliente_nombre: string
  estado: 'abierta' | 'cerrada' | 'cancelada'
  total: number
  notas: string
  created_at: string
  items: ItemComanda[]
  lista_para_servir: boolean
}

export interface Reserva {
  id: number
  fecha: string
  cliente_nombre: string
  cliente_telefono: string
  num_personas: number
  mesa_id: number | null
  estado: string
  notas: string
  created_at: string
}

export interface ReservaIn {
  fecha: string
  cliente_nombre: string
  cliente_telefono?: string
  num_personas?: number
  mesa_id?: number | null
  estado?: string
  notas?: string
}

export interface ClienteFrecuente {
  id: number
  nombre: string
  telefono: string
  email: string
  notas: string
  visitas: number
  gasto_total: number
  ultima_visita: string | null
  created_at: string
}

export interface ClienteIn {
  nombre: string
  telefono?: string
  email?: string
  notas?: string
}

export interface CierreCaja {
  fecha: string
  total_ventas: number
  num_ventas: number
  total_gastos: number
  resultado_neto: number
  efectivo_bruto: number
  no_efectivo: number
  por_pago: Record<string, number>
  gastos: { id: number; descripcion: string; monto: number; categoria: string; fecha: string }[]
  ventas_detalle: {
    id: number
    numero_mesa: number
    tipo_pago: string
    subtotal: number
    descuento: number
    propina: number
    total: number
    hora: string
  }[]
}

export interface GastoDia {
  id: number
  descripcion: string
  monto: number
  categoria: string
  fecha: string
}

export interface GastoIn {
  descripcion: string
  monto: number
  categoria?: string
  fecha?: string
}

export interface MermaItem {
  id: number
  ingrediente_id: number
  ingrediente: string
  unidad: string
  cantidad: number
  motivo: string
  descripcion: string
  costo_estimado: number
  fecha: string
}

export interface MermaIn {
  ingrediente_id: number
  cantidad: number
  motivo?: string
  descripcion?: string
}

export interface MermaResumen {
  total_costo_mes: number
  num_registros_mes: number
  por_motivo: Record<string, number>
}

export interface TopProducto {
  producto_id: number
  nombre: string
  categoria: string
  total_cantidad: number
  total_ingresos: number
}

export interface HorariosPico {
  heatmap: Record<string, Record<number, number>>
  por_hora: { hora: number; total: number }[]
  por_dia: { dia: string; total: number }[]
}

export interface PYLMes {
  mes: string
  ingresos: number
  compras: number
  gastos: number
  mermas: number
  egresos: number
  resultado: number
}

export interface Proveedor {
  id: number
  nombre: string
  tipo: string
  telefono: string
  contacto: string
  direccion: string
  notas: string
  activo: boolean
}

export interface ProveedorIn {
  nombre: string
  tipo?: string
  telefono?: string
  contacto?: string
  direccion?: string
  notas?: string
}

export interface PrecioProveedor {
  id: number
  proveedor_id: number
  ingrediente_id: number
  ingrediente_nombre: string
  ingrediente_unidad: string
  precio: number
  fecha: string | null
  notas: string
}

export interface PrecioIn {
  ingrediente_id: number
  precio: number
  notas?: string
}

export interface ComparacionFila {
  ingrediente_id: number
  ingrediente: string
  unidad: string
  stock_actual: number
  costo_actual: number
  precios: Record<number, number | null>
  fechas: Record<number, string | null>
  notas: Record<number, string | null>
  min_precio: number | null
  mejor_proveedor_id: number | null
}

export interface ComparacionData {
  proveedores: { id: number; nombre: string; tipo: string }[]
  filas: ComparacionFila[]
}

export interface PedidoItem {
  ingrediente_id: number
  nombre: string
  unidad: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  ahorro_vs_actual: number
  precio_actual: number
}

export interface PedidoGrupo {
  proveedor_id: number
  proveedor: string
  tipo: string
  telefono: string
  items: PedidoItem[]
  total: number
}

export interface PedidoOptimo {
  grupos: PedidoGrupo[]
  sin_precio: { ingrediente_id: number; nombre: string; cantidad: number; unidad: string }[]
  total_general: number
  ahorro_estimado: number
}

export interface PrediccionIngrediente {
  ingrediente_id: number
  nombre: string
  unidad: string
  stock_actual: number
  stock_minimo: number
  consumo_diario: number
  consumo_periodo: number
  dias_hasta_agotarse: number | null
  cantidad_sugerida: number
  urgencia: 'critico' | 'alto' | 'medio' | 'ok' | 'sin_datos'
}

export interface PrediccionCompras {
  periodo_dias: number
  dias_objetivo: number
  ingredientes: PrediccionIngrediente[]
  resumen: { criticos: number; altos: number; con_datos: number }
}

export interface MPDevice {
  id: string
  pos_id: number
  store_id: string
  operating_mode: string
}

export interface MPIntent {
  id: string
  device_id: string
  amount: number
  state: 'OPEN' | 'ON_TERMINAL' | 'PROCESSING' | 'FINISHED' | 'CANCELED' | 'ERROR'
  payment_data?: {
    state: 'CONFIRMED' | 'REJECTED'
    payment_id?: number
    type?: string        // debit_card | credit_card
    installments?: number
  }
}

export interface EstadisticasRoles {
  dias: number
  total_ventas_periodo: number
  roles: {
    rol: string
    cobros: number
    items_agregados: number
    total_acciones: number
  }[]
}
