import { useEffect, useState, useCallback, useRef } from 'react'
import { api, OfflineEnqueuedError, syncQueue } from './api/client'
import type { Mesa, MesaIn, Comanda, ItemComanda, Producto, PagoOut, MPDevice } from './api/client'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import {
  Plus, X, Trash2, Settings, Users, ChevronRight, Minus, Clock, FileText, PenLine,
  CreditCard, Banknote, Smartphone, ArrowLeftRight, Check, Printer, Percent, ShoppingBag,
  TrendingUp, Bell,
} from 'lucide-react'
import type { VentasResumen } from './api/client'

function clpFormat(n: number) {
  return `$${n.toLocaleString('es-CL')}`
}

const ESTADO_COLOR: Record<string, string> = {
  libre: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  ocupada: 'bg-amber-50 border-amber-300 text-amber-800',
  cuenta: 'bg-red-50 border-red-300 text-red-700',
}

const ESTADO_LABEL: Record<string, string> = {
  libre: 'Libre',
  ocupada: 'Ocupada',
  cuenta: 'Cuenta',
}

function playBeepServir() {
  try {
    const ctx = new AudioContext()
    const notas = [523, 659, 784, 1047] // Do-Mi-Sol-Do (C5→C6), más agradable
    notas.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      const t = ctx.currentTime + i * 0.14
      gain.gain.setValueAtTime(0.28, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28)
      osc.start(t)
      osc.stop(t + 0.28)
    })
  } catch { }
}

function minutos(iso: string): string {
  const diff = Date.now() - new Date(iso + 'Z').getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'ahora'
  if (m === 1) return '1 min'
  return `${m} min`
}

// ─── Modal nueva mesa ──────────────────────────────────────────────────────
function ModalNuevaMesa({
  onSave,
  onClose,
}: {
  onSave: (data: MesaIn) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState<MesaIn>({ numero: 1, nombre: '', capacidad: 4 })
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-800">Nueva mesa</h3>
          <button onClick={onClose}><X size={18} className="text-stone-400" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          <div>
            <label className="text-xs text-stone-500 mb-1 block">Número</label>
            <input
              type="number"
              min={1}
              required
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
              value={form.numero}
              onChange={e => setForm(f => ({ ...f, numero: parseInt(e.target.value) || 1 }))}
            />
          </div>
          <div>
            <label className="text-xs text-stone-500 mb-1 block">Nombre (opcional)</label>
            <input
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="Ej: Terraza, Reservado…"
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-stone-500 mb-1 block">Capacidad</label>
            <input
              type="number"
              min={1}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
              value={form.capacidad}
              onChange={e => setForm(f => ({ ...f, capacidad: parseInt(e.target.value) || 1 }))}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-900 font-semibold py-2 rounded-lg text-sm"
            >
              {saving ? 'Guardando…' : 'Crear mesa'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm border border-stone-200 text-stone-600">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── MP Point: modal de espera ─────────────────────────────────────────────
function MPPointModal({
  amount,
  deviceId,
  description,
  onSuccess,
  onCancel,
}: {
  amount: number
  deviceId: string
  description: string
  onSuccess: (tipoPago: string) => void
  onCancel: () => void
}) {
  type Estado = 'enviando' | 'esperando' | 'procesando' | 'aprobado' | 'rechazado' | 'error'
  const [estado, setEstado] = useState<Estado>('enviando')
  const [intentId, setIntentId] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    api.mpPoint.crearIntent({ device_id: deviceId, amount: Math.round(amount), description })
      .then(intent => {
        setIntentId(intent.id)
        setEstado('esperando')
        intervalRef.current = setInterval(async () => {
          try {
            const s = await api.mpPoint.verIntent(intent.id)
            if (s.state === 'ON_TERMINAL') setEstado('esperando')
            if (s.state === 'PROCESSING') setEstado('procesando')
            if (s.state === 'FINISHED') {
              clearInterval(intervalRef.current!)
              if (s.payment_data?.state === 'CONFIRMED') {
                setEstado('aprobado')
                const tipo = s.payment_data?.type === 'debit_card' ? 'debito' : 'credito'
                setTimeout(() => onSuccess(tipo), 1200)
              } else {
                setEstado('rechazado')
              }
            }
            if (s.state === 'CANCELED' || s.state === 'ERROR') {
              clearInterval(intervalRef.current!)
              setEstado('error')
            }
          } catch { }
        }, 3000)
      })
      .catch(() => setEstado('error'))

    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])  // eslint-disable-line

  async function cancelar() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (intentId) api.mpPoint.cancelarIntent(deviceId, intentId).catch(() => {})
    onCancel()
  }

  const INFO: Record<Estado, { emoji: string; label: string; spin: boolean }> = {
    enviando:    { emoji: '📡', label: 'Enviando al terminal…', spin: true },
    esperando:   { emoji: '📱', label: 'Esperando pago del cliente…', spin: true },
    procesando:  { emoji: '⏳', label: 'Procesando con el banco…', spin: true },
    aprobado:    { emoji: '✅', label: '¡Pago aprobado!', spin: false },
    rechazado:   { emoji: '❌', label: 'Pago rechazado por el banco', spin: false },
    error:       { emoji: '⚠️', label: 'Error en el terminal', spin: false },
  }
  const { emoji, label, spin } = INFO[estado]

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
      <div className="bg-white rounded-3xl p-8 shadow-2xl w-80 text-center space-y-5">
        <p className="text-5xl">{emoji}</p>
        <div>
          <p className="font-bold text-lg text-stone-800">{label}</p>
          <p className="text-stone-400 text-sm mt-1">Mercado Pago Point</p>
        </div>
        <div className="bg-stone-50 rounded-2xl py-4">
          <p className="text-3xl font-black text-stone-900">{clpFormat(amount)}</p>
        </div>
        {spin && (
          <div className="flex justify-center">
            <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {(estado === 'esperando' || estado === 'procesando' || estado === 'enviando') && (
          <button type="button" onClick={cancelar}
            className="w-full border border-stone-200 text-stone-500 py-2.5 rounded-xl text-sm hover:bg-stone-50">
            Cancelar
          </button>
        )}
        {(estado === 'rechazado' || estado === 'error') && (
          <button type="button" onClick={onCancel}
            className="w-full bg-stone-800 text-white py-2.5 rounded-xl text-sm font-semibold">
            Volver a intentar
          </button>
        )}
      </div>
    </div>
  )
}

// ─── MP Point: selector de dispositivo ────────────────────────────────────
function MPDeviceModal({
  onSelect,
  onClose,
}: {
  onSelect: (device: MPDevice) => void
  onClose: () => void
}) {
  const [devices, setDevices] = useState<MPDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    api.mpPoint.devices()
      .then(r => setDevices(r.devices ?? []))
      .catch(e => setErr(e instanceof Error ? e.message : 'Error al buscar terminales'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-2xl shadow-2xl w-80 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <p className="font-semibold text-stone-800">Seleccionar terminal</p>
          <button onClick={onClose}><X size={16} className="text-stone-400" /></button>
        </div>
        <div className="p-4 space-y-2">
          {loading && <p className="text-sm text-stone-400 text-center py-4">Buscando terminales…</p>}
          {err && <p className="text-sm text-red-500">{err}</p>}
          {!loading && devices.length === 0 && !err && (
            <p className="text-sm text-stone-400 text-center py-4">
              Sin terminales en modo PDV.<br/>
              <a href="https://www.mercadopago.cl/point" target="_blank" rel="noreferrer"
                className="text-sky-500 underline text-xs">Ver configuración</a>
            </p>
          )}
          {devices.map(d => (
            <button key={d.id} onClick={() => onSelect(d)}
              className="w-full text-left bg-stone-50 hover:bg-sky-50 border border-stone-100 hover:border-sky-300 rounded-xl px-4 py-3 transition-colors">
              <p className="text-sm font-semibold text-stone-800">Terminal #{d.pos_id}</p>
              <p className="text-xs text-stone-400 mt-0.5">{d.id}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── POS: Panel de comanda ─────────────────────────────────────────────────
function ComandaPanel({
  mesa,
  deliveryComanda,
  productos,
  onClose,
  onUpdate,
}: {
  mesa?: Mesa
  deliveryComanda?: Comanda
  productos: Producto[]
  onClose: () => void
  onUpdate: () => void
}) {
  const [comanda, setComanda] = useState<Comanda | null>(deliveryComanda ?? null)
  const [loading, setLoading] = useState(!deliveryComanda)
  const [filterCat, setFilterCat] = useState('')
  const [showCobrar, setShowCobrar] = useState(false)
  const [notaModal, setNotaModal] = useState<{ prod: Producto; notas: string } | null>(null)
  const [localAgotado, setLocalAgotado] = useState<Record<number, boolean>>({})
  const [mpDevice, setMpDevice] = useState<MPDevice | null>(() => {
    const s = localStorage.getItem('mp_device')
    return s ? JSON.parse(s) : null
  })
  const [showMPDevice, setShowMPDevice] = useState(false)
  const [showMPModal, setShowMPModal] = useState(false)
  const [tipoPago, setTipoPago] = useState('efectivo')
  const [montoRecibido, setMontoRecibido] = useState('')
  const [descuentoPct, setDescuentoPct] = useState('')
  const [propinaVal, setPropinaVal] = useState('')
  const [cobrando, setCobrando] = useState(false)
  const [pagoResult, setPagoResult] = useState<PagoOut | null>(null)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    if (deliveryComanda) return
    if (!mesa) return
    try {
      setLoading(true)
      const c = await api.comandas.abrir(mesa.id)
      setComanda(c)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [mesa, deliveryComanda])

  useEffect(() => { load() }, [load])

  async function confirmarNota() {
    if (!comanda || !notaModal) return
    const { prod, notas } = notaModal
    setNotaModal(null)
    try {
      const updated = await api.comandas.agregarItem(comanda.id, {
        producto_id: prod.id,
        cantidad: 1,
        notas,
      })
      setComanda(updated)
    } catch (e: unknown) {
      if (e instanceof OfflineEnqueuedError) {
        const tempItem: ItemComanda = {
          id: -(Date.now()),
          producto_id: prod.id,
          nombre_producto: prod.nombre,
          cantidad: 1,
          precio_unitario: prod.precio,
          subtotal: prod.precio,
          notas,
          listo: false,
        }
        setComanda(c => c ? { ...c, items: [...c.items, tempItem] } : c)
      } else {
        setErr(e instanceof Error ? e.message : 'Error')
      }
    }
  }

  async function toggleAgotado(prodId: number, e: React.MouseEvent) {
    e.stopPropagation()
    try {
      const result = await api.productosExtra.agotar(prodId)
      setLocalAgotado(prev => ({ ...prev, [prodId]: result.agotado_hoy }))
    } catch { }
  }

  async function cambiarCantidad(item_id: number, nueva: number) {
    if (!comanda) return
    try {
      const updated = await api.comandas.cambiarCantidad(comanda.id, item_id, nueva)
      setComanda(updated)
    } catch (e: unknown) {
      if (e instanceof OfflineEnqueuedError) {
        setComanda(c => {
          if (!c) return c
          const items = nueva <= 0
            ? c.items.filter(it => it.id !== item_id)
            : c.items.map(it => it.id === item_id
                ? { ...it, cantidad: nueva, subtotal: it.precio_unitario * nueva }
                : it)
          return { ...c, items }
        })
      } else {
        setErr(e instanceof Error ? e.message : 'Error')
      }
    }
  }

  async function solicitarCuenta() {
    if (!comanda) return
    try {
      await api.comandas.pedirCuenta(comanda.id)
      onUpdate()
      onClose()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error')
    }
  }

  const descPct = parseFloat(descuentoPct) || 0
  const propina = parseFloat(propinaVal) || 0
  const subtotal = comanda?.items.reduce((sum, it) => sum + it.subtotal, 0) ?? 0
  const descMonto = Math.round(subtotal * descPct / 100)
  const totalFinal = Math.max(0, subtotal - descMonto + propina)

  async function cobrar(tipoOverride?: string) {
    if (!comanda) return
    const tipo = tipoOverride ?? tipoPago

    if (tipo === 'mp') {
      if (!mpDevice) { setShowMPDevice(true); return }
      setShowMPModal(true)
      return
    }

    setCobrando(true)
    try {
      const monto = tipo === 'efectivo' ? (parseFloat(montoRecibido) || totalFinal) : totalFinal
      const result = await api.comandas.cobrar(comanda.id, {
        tipo_pago: tipo,
        monto_recibido: monto,
        descuento_pct: descPct,
        propina,
      })
      setPagoResult(result)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error')
      setCobrando(false)
    }
  }

  function handleMPSuccess(cardType: string) {
    setShowMPModal(false)
    cobrar(cardType)
  }

  function seleccionarDevice(d: MPDevice) {
    setMpDevice(d)
    localStorage.setItem('mp_device', JSON.stringify(d))
    setShowMPDevice(false)
    setShowMPModal(true)
  }

  const panelTitle = deliveryComanda
    ? `Para llevar — ${deliveryComanda.cliente_nombre}`
    : mesa ? `Mesa ${mesa.numero}${mesa.nombre ? ` · ${mesa.nombre}` : ''}` : ''

  function printReceipt() {
    if (!comanda || !pagoResult) return
    const now = new Date().toLocaleString('es-CL')
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Boleta ${panelTitle}</title>
<style>
  body { font-family: monospace; font-size: 13px; max-width: 320px; margin: 0 auto; padding: 16px; }
  h2 { text-align: center; margin: 0 0 4px; font-size: 16px; }
  .center { text-align: center; }
  .divider { border-top: 1px dashed #999; margin: 8px 0; }
  .row { display: flex; justify-content: space-between; margin: 2px 0; }
  .total { font-weight: bold; font-size: 15px; }
  @media print { button { display: none; } }
</style></head><body>
<h2>La Casona San Martín</h2>
<p class="center" style="margin:0;color:#666">MesaControl</p>
<div class="divider"></div>
<div class="row"><span>${panelTitle}</span><span>${now}</span></div>
<div class="divider"></div>
${comanda.items.map(it =>
  `<div class="row"><span>${it.cantidad}× ${it.nombre_producto}</span><span>${it.subtotal.toLocaleString('es-CL')}</span></div>`
).join('')}
<div class="divider"></div>
<div class="row"><span>Subtotal</span><span>${pagoResult.subtotal.toLocaleString('es-CL')}</span></div>
${pagoResult.descuento > 0 ? `<div class="row"><span>Descuento (${descPct}%)</span><span>-${pagoResult.descuento.toLocaleString('es-CL')}</span></div>` : ''}
${pagoResult.propina > 0 ? `<div class="row"><span>Propina</span><span>+${pagoResult.propina.toLocaleString('es-CL')}</span></div>` : ''}
<div class="row total"><span>TOTAL</span><span>$${pagoResult.total.toLocaleString('es-CL')}</span></div>
<div class="row"><span>Pago: ${tipoPago}</span>${tipoPago === 'efectivo' ? `<span>Vuelto: $${pagoResult.vuelto.toLocaleString('es-CL')}</span>` : ''}</div>
<div class="divider"></div>
<p class="center">¡Gracias por su visita!</p>
<br><button onclick="window.print()">Imprimir</button>
</body></html>`
    const w = window.open('', '_blank', 'width=400,height=600')
    if (w) { w.document.write(html); w.document.close() }
  }

  const categorias = Array.from(new Set(productos.map(p => p.categoria).filter(Boolean)))
  const prodFiltrados = filterCat ? productos.filter(p => p.categoria === filterCat) : productos

  const pagoIcons: Record<string, React.ReactNode> = {
    efectivo: <Banknote size={15} />,
    debito: <CreditCard size={15} />,
    credito: <CreditCard size={15} />,
    transferencia: <Smartphone size={15} />,
    mp: <span className="text-sky-500 font-black text-[11px]">MP</span>,
  }

  if (!loading && err && !comanda) {
    return (
      <div className="fixed inset-0 z-50 flex">
        <div className="flex-1 bg-black/40" onClick={onClose} />
        <div className="w-full max-w-2xl bg-white flex flex-col items-center justify-center gap-4 shadow-2xl p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
            <X size={28} className="text-red-500" />
          </div>
          <div>
            <p className="font-bold text-stone-800 text-lg">Error al abrir la comanda</p>
            <p className="text-red-500 text-sm mt-1">{err}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setErr(''); load() }}
              className="bg-amber-500 hover:bg-amber-400 text-stone-900 font-semibold px-6 py-2.5 rounded-xl text-sm"
            >
              Reintentar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="border border-stone-200 text-stone-600 px-6 py-2.5 rounded-xl text-sm hover:bg-stone-50"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (pagoResult) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl p-8 text-center shadow-xl w-72 space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <Check size={32} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-stone-800">¡Cobro exitoso!</p>
            <p className="text-stone-400 text-sm mt-0.5">{panelTitle} liberada</p>
          </div>
          <div className="bg-stone-50 rounded-xl p-3 text-sm space-y-1 text-left">
            <div className="flex justify-between"><span className="text-stone-500">Total cobrado</span><span className="font-bold">{clpFormat(pagoResult.total)}</span></div>
            {pagoResult.descuento > 0 && <div className="flex justify-between text-emerald-600"><span>Descuento</span><span>-{clpFormat(pagoResult.descuento)}</span></div>}
            {pagoResult.propina > 0 && <div className="flex justify-between text-amber-600"><span>Propina</span><span>+{clpFormat(pagoResult.propina)}</span></div>}
            {tipoPago === 'efectivo' && pagoResult.vuelto > 0 && (
              <div className="flex justify-between font-semibold text-blue-600"><span>Vuelto</span><span>{clpFormat(pagoResult.vuelto)}</span></div>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={printReceipt} className="flex-1 flex items-center justify-center gap-2 border border-stone-200 text-stone-700 py-2 rounded-xl text-sm hover:bg-stone-50">
              <Printer size={15} /> Imprimir
            </button>
            <button type="button" onClick={() => { onClose(); onUpdate() }} className="flex-1 bg-stone-800 text-white py-2 rounded-xl text-sm font-semibold hover:bg-stone-700">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-2xl bg-white flex flex-col shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-stone-800 text-lg">{panelTitle}</p>
              {comanda?.numero_ticket && (
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  #{comanda.numero_ticket}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              {mesa && (
                <p className="text-xs text-stone-400 flex items-center gap-1">
                  <Users size={12} /> {mesa.capacidad} personas
                </p>
              )}
              {comanda?.created_at && (
                <p className="text-xs text-stone-400 flex items-center gap-1">
                  <Clock size={12} /> {minutos(comanda.created_at)}
                </p>
              )}
            </div>
          </div>
          <button type="button" title="Cerrar" onClick={onClose} className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: product catalog */}
          <div className="flex-1 flex flex-col border-r border-stone-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-100">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Agregar productos</p>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => setFilterCat('')}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${!filterCat ? 'bg-amber-500 text-stone-900' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                >
                  Todos
                </button>
                {categorias.map(c => (
                  <button
                    key={c}
                    onClick={() => setFilterCat(c)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${filterCat === c ? 'bg-amber-500 text-stone-900' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 content-start">
              {prodFiltrados.filter(p => p.activo).map(p => {
                const agotado = localAgotado[p.id] ?? p.agotado_hoy
                return (
                  <div key={p.id} className="relative">
                    <button
                      onClick={() => !agotado && setNotaModal({ prod: p, notas: '' })}
                      disabled={agotado}
                      className={`w-full text-left rounded-xl p-3 transition-colors border ${agotado ? 'opacity-40 cursor-not-allowed bg-stone-100 border-stone-200' : 'bg-stone-50 hover:bg-amber-50 border-stone-100 hover:border-amber-200'}`}
                    >
                      {p.foto && (
                        <img
                          src={p.foto}
                          alt={p.nombre}
                          className="w-full aspect-video object-cover rounded-lg mb-2"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      )}
                      <p className="text-xs font-semibold text-stone-800 leading-tight">{p.nombre}</p>
                      <p className="text-amber-600 text-xs font-bold mt-0.5">{clpFormat(p.precio)}</p>
                    </button>
                    <button
                      type="button"
                      onClick={e => toggleAgotado(p.id, e)}
                      title={agotado ? 'Marcar disponible' : 'Marcar agotado'}
                      className={`absolute top-1.5 right-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-colors ${agotado ? 'bg-red-500 text-white' : 'bg-stone-200 text-stone-500 hover:bg-red-100 hover:text-red-500'}`}
                    >
                      {agotado ? 'Agotado' : '86'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right: order + payment */}
          <div className="w-64 flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <div className="px-4 pt-4 pb-2">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Pedido</p>
              </div>
              {loading ? (
                <p className="text-xs text-stone-400 px-4">Cargando…</p>
              ) : !comanda || comanda.items.length === 0 ? (
                <p className="text-xs text-stone-400 px-4 py-2">Sin items aún</p>
              ) : (
                <ul className="divide-y divide-stone-50 px-3">
                  {comanda.items.map(it => (
                    <li key={it.id} className="py-2">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <p className="text-xs font-medium text-stone-700 flex-1 truncate">{it.nombre_producto}</p>
                        <span className="text-xs font-semibold text-stone-700 shrink-0">{clpFormat(it.subtotal)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(it.id, it.cantidad - 1)}
                          className="w-5 h-5 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-red-100 hover:text-red-500"
                        >
                          <Minus size={9} />
                        </button>
                        <span className="text-xs font-bold text-stone-800 min-w-[1.4rem] text-center">{it.cantidad}</span>
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(it.id, it.cantidad + 1)}
                          className="w-5 h-5 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-amber-100 hover:text-amber-600"
                        >
                          <Plus size={9} />
                        </button>
                        <span className="text-xs text-stone-400 ml-1">{clpFormat(it.precio_unitario)} c/u</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Total + cobrar */}
            <div className="border-t border-stone-100 p-4 space-y-3">
              {err && <p className="text-red-500 text-xs">{err}</p>}
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-500">Subtotal</span>
                <span className="text-lg font-bold text-stone-800">{clpFormat(subtotal)}</span>
              </div>
              {!showCobrar ? (
                <div className="space-y-2">
                  {mesa && (
                    <button
                      type="button"
                      onClick={solicitarCuenta}
                      disabled={!comanda || comanda.items.length === 0}
                      className="w-full border border-orange-200 text-orange-600 hover:bg-orange-50 disabled:opacity-40 font-medium py-2 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <FileText size={14} />
                      Pedir cuenta
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowCobrar(true)}
                    disabled={!comanda || comanda.items.length === 0}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowLeftRight size={15} />
                    Cobrar mesa
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Descuento y propina */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-stone-400 mb-1 flex items-center gap-1"><Percent size={10} /> Descuento %</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="0"
                        className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                        value={descuentoPct}
                        onChange={e => setDescuentoPct(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-stone-400 mb-1 block">Propina $</label>
                      <div className="flex gap-1 mb-1.5">
                        {[5, 10, 15].map(pct => (
                          <button
                            type="button"
                            key={pct}
                            onClick={() => setPropinaVal(String(Math.round(subtotal * pct / 100)))}
                            className="flex-1 text-[11px] bg-stone-100 hover:bg-amber-100 hover:text-amber-800 rounded-lg py-1 text-stone-600 font-semibold transition-colors"
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                        value={propinaVal}
                        onChange={e => setPropinaVal(e.target.value)}
                      />
                    </div>
                  </div>
                  {(descMonto > 0 || propina > 0) && (
                    <div className="text-xs text-stone-500 space-y-0.5 bg-stone-50 rounded-lg p-2">
                      {descMonto > 0 && <div className="flex justify-between text-emerald-600"><span>Descuento {descPct}%</span><span>-{clpFormat(descMonto)}</span></div>}
                      {propina > 0 && <div className="flex justify-between text-amber-600"><span>Propina</span><span>+{clpFormat(propina)}</span></div>}
                      <div className="flex justify-between font-bold text-stone-800 pt-1 border-t border-stone-200"><span>Total a cobrar</span><span>{clpFormat(totalFinal)}</span></div>
                    </div>
                  )}
                  {/* Tipo de pago */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['efectivo', 'debito', 'credito', 'transferencia', 'mp'] as const).map(t => (
                      <button
                        type="button"
                        key={t}
                        onClick={() => setTipoPago(t)}
                        className={`flex items-center gap-1 justify-center px-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${tipoPago === t ? 'bg-stone-800 text-white border-stone-800' : 'border-stone-200 text-stone-600 hover:bg-stone-50'}`}
                      >
                        {pagoIcons[t]}
                        {t === 'mp' ? 'Terminal' : t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                  {tipoPago === 'mp' && (
                    <div className="flex items-center justify-between bg-sky-50 border border-sky-200 rounded-lg px-3 py-2 text-xs">
                      {mpDevice
                        ? <span className="text-sky-700">Terminal #{mpDevice.pos_id}</span>
                        : <span className="text-stone-400">Sin terminal configurado</span>
                      }
                      <button type="button" onClick={() => setShowMPDevice(true)}
                        className="text-sky-600 font-semibold hover:underline">
                        {mpDevice ? 'Cambiar' : 'Configurar'}
                      </button>
                    </div>
                  )}
                  {tipoPago === 'efectivo' && (
                    <input
                      type="number"
                      placeholder={`Monto recibido (mín ${clpFormat(totalFinal)})…`}
                      className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                      value={montoRecibido}
                      onChange={e => setMontoRecibido(e.target.value)}
                    />
                  )}
                  {tipoPago === 'efectivo' && montoRecibido && parseFloat(montoRecibido) >= totalFinal && (
                    <p className="text-xs text-stone-500">
                      Vuelto: <strong>{clpFormat(parseFloat(montoRecibido) - totalFinal)}</strong>
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => cobrar()}
                    disabled={cobrando}
                    className={`w-full font-bold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 ${
                      tipoPago === 'mp'
                        ? 'bg-sky-500 hover:bg-sky-400 text-white'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-white'
                    }`}
                  >
                    {cobrando ? 'Procesando…'
                      : tipoPago === 'mp' ? `Enviar al terminal ${clpFormat(totalFinal)}`
                      : `Confirmar ${clpFormat(totalFinal)}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCobrar(false)}
                    className="w-full text-stone-400 text-xs hover:text-stone-600 py-1"
                  >
                    Cancelar pago
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal MP Point — esperando pago */}
        {showMPModal && mpDevice && (
          <MPPointModal
            amount={totalFinal}
            deviceId={mpDevice.id}
            description={panelTitle}
            onSuccess={handleMPSuccess}
            onCancel={() => setShowMPModal(false)}
          />
        )}

        {/* Modal MP Point — selector de terminal */}
        {showMPDevice && (
          <MPDeviceModal
            onSelect={seleccionarDevice}
            onClose={() => setShowMPDevice(false)}
          />
        )}

        {/* Modal de nota por ítem */}
        {notaModal && (
          <div className="absolute inset-0 z-20 flex items-end bg-stone-900/75">
            <div className="w-full bg-white p-4 space-y-3 border-t border-stone-200">
              <div className="flex items-center gap-2">
                <PenLine size={15} className="text-amber-500" />
                <p className="text-sm font-semibold text-stone-800">{notaModal.prod.nombre}</p>
                <span className="ml-auto text-sm font-bold text-amber-600">{clpFormat(notaModal.prod.precio)}</span>
              </div>
              <input
                autoFocus
                className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="Nota para cocina — ej: sin cebolla, bien cocido… (Enter para agregar)"
                value={notaModal.notas}
                onChange={e => setNotaModal(m => m ? { ...m, notas: e.target.value } : m)}
                onKeyDown={e => {
                  if (e.key === 'Enter') confirmarNota()
                  if (e.key === 'Escape') setNotaModal(null)
                }}
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setNotaModal(null)}
                  className="flex-1 border border-stone-200 rounded-xl py-2.5 text-sm text-stone-600 hover:bg-stone-50">
                  Cancelar
                </button>
                <button type="button" onClick={confirmarNota}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 rounded-xl py-2.5 text-sm font-semibold text-stone-900">
                  Agregar ↵
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────
export default function Mesas() {
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [comandasActivas, setComandasActivas] = useState<Comanda[]>([])
  const [resumenHoy, setResumenHoy] = useState<VentasResumen['hoy'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [showNueva, setShowNueva] = useState(false)
  const [mesaActiva, setMesaActiva] = useState<Mesa | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [showDelivery, setShowDelivery] = useState(false)
  const [deliveryNombre, setDeliveryNombre] = useState('')
  const [deliveryComanda, setDeliveryComanda] = useState<Comanda | null>(null)
  const [creandoDelivery, setCreandoDelivery] = useState(false)
  const [notifListas, setNotifListas] = useState<{ id: number; label: string }[]>([])
  const listasPrevRef = useRef<Set<number>>(new Set())
  const online = useOnlineStatus()

  function detectarListas(cas: Comanda[]) {
    const nuevasListas = cas.filter(
      c => c.lista_para_servir && !listasPrevRef.current.has(c.id)
    )
    if (nuevasListas.length > 0) {
      playBeepServir()
      setNotifListas(prev => [
        ...prev,
        ...nuevasListas.map(c => ({
          id: c.id,
          label: c.tipo === 'delivery'
            ? `Para llevar — ${c.cliente_nombre || 'sin nombre'}`
            : `Mesa ${c.numero_mesa}${c.numero_ticket ? ` · Ticket #${c.numero_ticket}` : ''}`,
        })),
      ])
    }
    listasPrevRef.current = new Set(cas.filter(c => c.lista_para_servir).map(c => c.id))
  }

  async function reload() {
    setLoading(true)
    try {
      const [m, p, cas, res] = await Promise.all([
        api.mesas.list(),
        api.productos.list(true),
        api.comandas.activos(),
        api.ventas.resumen().catch(() => null),
      ])
      setMesas(m)
      setProductos(p)
      setComandasActivas(cas)
      if (res) setResumenHoy(res.hoy)
      detectarListas(cas)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
    const interval = setInterval(async () => {
      try {
        const [m, cas] = await Promise.all([
          api.mesas.list(),
          api.comandas.activos(),
        ])
        setMesas(m)
        setComandasActivas(cas)
        detectarListas(cas)
      } catch { }
    }, 20000)
    return () => clearInterval(interval)
  }, [])

  // Sync pendientes al reconectar y refrescar mesas
  useEffect(() => {
    if (!online) return
    syncQueue().then(({ synced }) => {
      if (synced > 0) reload()
    })
  }, [online])

  async function crearMesa(data: MesaIn) {
    await api.mesas.create(data)
    setShowNueva(false)
    reload()
  }

  async function iniciarDelivery() {
    if (!deliveryNombre.trim()) return
    setCreandoDelivery(true)
    try {
      const c = await api.comandas.delivery(deliveryNombre.trim())
      setDeliveryComanda(c)
      setShowDelivery(false)
      setDeliveryNombre('')
    } finally {
      setCreandoDelivery(false)
    }
  }

  async function eliminarMesa(m: Mesa) {
    if (!confirm(`¿Eliminar Mesa ${m.numero}? Esta acción es permanente.`)) return
    setDeletingId(m.id)
    try {
      await api.mesas.delete(m.id)
      reload()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Banner: cocina lista para servir */}
      {notifListas.length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4">
          {notifListas.map(n => (
            <div
              key={n.id}
              className="bg-emerald-600 text-white rounded-2xl shadow-2xl px-5 py-4 flex items-center gap-4"
            >
              <Bell size={20} className="shrink-0 animate-bounce" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm leading-tight">🍽 Lista para servir</p>
                <p className="text-emerald-100 text-xs mt-0.5 truncate">{n.label}</p>
              </div>
              <button
                type="button"
                onClick={() => setNotifListas(prev => prev.filter(x => x.id !== n.id))}
                className="shrink-0 bg-white/20 hover:bg-white/30 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors"
              >
                Entendido
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">Mesas y comandas</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDelivery(true)}
            className="flex items-center gap-2 border border-stone-200 text-stone-700 hover:bg-stone-50 font-medium px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <ShoppingBag size={16} />
            Para llevar
          </button>
          <button
            type="button"
            onClick={() => setShowNueva(true)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-900 font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <Plus size={16} />
            Agregar mesa
          </button>
        </div>
      </div>

      {/* Resumen del turno */}
      {resumenHoy && (
        <div className="flex items-center gap-4 bg-stone-50 border border-stone-100 rounded-2xl px-5 py-3">
          <TrendingUp size={18} className="text-amber-500 shrink-0" />
          <div className="flex gap-6 text-sm flex-wrap">
            <div>
              <span className="text-stone-400 text-xs">Ventas hoy</span>
              <p className="font-bold text-stone-800">{clpFormat(resumenHoy.total)}</p>
            </div>
            <div>
              <span className="text-stone-400 text-xs">Cobros</span>
              <p className="font-bold text-stone-800">{resumenHoy.count}</p>
            </div>
            <div>
              <span className="text-stone-400 text-xs">Mesas activas</span>
              <p className="font-bold text-stone-800">{comandasActivas.filter(c => c.tipo === 'mesa').length}</p>
            </div>
            {resumenHoy.count > 0 && (
              <div>
                <span className="text-stone-400 text-xs">Ticket promedio</span>
                <p className="font-bold text-stone-800">{clpFormat(Math.round(resumenHoy.total / resumenHoy.count))}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leyenda */}
      <div className="flex gap-4 text-xs text-stone-500">
        {Object.entries(ESTADO_LABEL).map(([k, v]) => (
          <span key={k} className={`px-2.5 py-1 rounded-full border font-medium ${ESTADO_COLOR[k]}`}>{v}</span>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-stone-400">Cargando…</div>
      ) : mesas.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-lg font-medium">Sin mesas configuradas</p>
          <p className="text-sm mt-1">Agrega tu primera mesa para comenzar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {(() => {
            const comandaByMesa: Record<number, Comanda> = {}
            for (const c of comandasActivas) {
              if (c.mesa_id !== null) comandaByMesa[c.mesa_id] = c
            }
            return mesas.map(m => {
              const comanda = comandaByMesa[m.id]
              const listaServir = comanda?.lista_para_servir ?? false
              return (
                <div
                  key={m.id}
                  className={`relative rounded-2xl border-2 p-4 cursor-pointer transition-all hover:shadow-md select-none ${
                    listaServir
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-emerald-200 shadow-md'
                      : ESTADO_COLOR[m.estado]
                  }`}
                  onClick={() => setMesaActiva(m)}
                >
                  {listaServir && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse whitespace-nowrap">
                      🍽 Lista para servir
                    </span>
                  )}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-2xl leading-none">{m.numero}</p>
                      {m.nombre && <p className="text-xs mt-0.5 opacity-70">{m.nombre}</p>}
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      listaServir ? 'bg-emerald-200 text-emerald-800' :
                      m.estado === 'libre' ? 'bg-emerald-200 text-emerald-800' :
                      m.estado === 'ocupada' ? 'bg-amber-200 text-amber-900' : 'bg-red-200 text-red-800'
                    }`}>
                      {listaServir ? 'Lista' : ESTADO_LABEL[m.estado]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs opacity-60 flex items-center gap-1">
                        <Users size={11} /> {m.capacidad}
                      </span>
                      {comanda && (
                        <span className="text-xs opacity-70 flex items-center gap-1">
                          <Clock size={10} /> {minutos(comanda.created_at)}
                          {comanda.numero_ticket && (
                            <span className="ml-1 opacity-60">#{comanda.numero_ticket}</span>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); eliminarMesa(m) }}
                        disabled={deletingId === m.id || m.estado !== 'libre'}
                        className="w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 bg-white/50 flex items-center justify-center hover:bg-red-100 text-red-400 disabled:opacity-20 transition-opacity"
                        title={m.estado !== 'libre' ? 'Solo se puede eliminar si está libre' : 'Eliminar mesa'}
                      >
                        <Trash2 size={11} />
                      </button>
                      <ChevronRight size={15} className="opacity-40" />
                    </div>
                  </div>
                </div>
              )
            })
          })()}
        </div>
      )}

      {/* Gestión de mesas */}
      {mesas.length > 0 && (
        <div className="mt-2 p-3 bg-stone-50 rounded-xl text-xs text-stone-400 flex items-center gap-2">
          <Settings size={13} />
          Para eliminar una mesa, debe estar en estado Libre.
        </div>
      )}

      {showNueva && (
        <ModalNuevaMesa onSave={crearMesa} onClose={() => setShowNueva(false)} />
      )}

      {mesaActiva && (
        <ComandaPanel
          mesa={mesaActiva}
          productos={productos}
          onClose={() => setMesaActiva(null)}
          onUpdate={() => { setMesaActiva(null); reload() }}
        />
      )}

      {deliveryComanda && (
        <ComandaPanel
          deliveryComanda={deliveryComanda}
          productos={productos}
          onClose={() => setDeliveryComanda(null)}
          onUpdate={() => setDeliveryComanda(null)}
        />
      )}

      {/* Modal para llevar */}
      {showDelivery && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-6 space-y-4">
            <div className="flex items-center gap-2">
              <ShoppingBag size={18} className="text-amber-500" />
              <h2 className="font-bold text-stone-800">Para llevar</h2>
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Nombre del cliente</label>
              <input
                autoFocus
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="Juan Pérez / Pedido #3…"
                value={deliveryNombre}
                onChange={e => setDeliveryNombre(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') iniciarDelivery() }}
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowDelivery(false); setDeliveryNombre('') }}
                className="flex-1 border border-stone-200 rounded-xl py-2 text-sm text-stone-600 hover:bg-stone-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={iniciarDelivery}
                disabled={creandoDelivery || !deliveryNombre.trim()}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-900 font-semibold rounded-xl py-2 text-sm"
              >
                {creandoDelivery ? 'Creando…' : 'Iniciar pedido'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
