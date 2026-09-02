import { useEffect, useState } from 'react'
import { api } from './api/client'
import type { VentaDetalle, VentasResumen } from './api/client'
import { hoyCL, haceDiasCL } from './api/fecha'
import { Banknote, CreditCard, Smartphone, TrendingUp, Receipt, ChevronDown, ChevronUp } from 'lucide-react'

function clpFormat(n: number) {
  return `$${n.toLocaleString('es-CL')}`
}

const PAGO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  debito: 'Débito',
  credito: 'Crédito',
  transferencia: 'Transferencia',
}

const PAGO_COLOR: Record<string, string> = {
  efectivo: 'bg-emerald-100 text-emerald-700',
  debito: 'bg-blue-100 text-blue-700',
  credito: 'bg-violet-100 text-violet-700',
  transferencia: 'bg-amber-100 text-amber-700',
}

const PAGO_ICON: Record<string, React.ReactNode> = {
  efectivo: <Banknote size={13} />,
  debito: <CreditCard size={13} />,
  credito: <CreditCard size={13} />,
  transferencia: <Smartphone size={13} />,
}

function ResumenCard({ label, data, color }: {
  label: string
  data: VentasResumen['hoy']
  color: string
}) {
  return (
    <div className={`rounded-2xl p-4 border ${color}`}>
      <p className="text-xs uppercase tracking-wide font-medium opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-bold">{clpFormat(data.total)}</p>
      <p className="text-xs opacity-60 mt-0.5">{data.count} cobro{data.count !== 1 ? 's' : ''}</p>
      {Object.keys(data.por_pago).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {Object.entries(data.por_pago).map(([tipo, monto]) => (
            <span key={tipo} className="text-xs bg-white/50 rounded-full px-2 py-0.5">
              {PAGO_LABEL[tipo] ?? tipo}: {clpFormat(monto)}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function VentaRow({ venta }: { venta: VentaDetalle }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <tr
        className="cursor-pointer hover:bg-stone-50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <td className="px-4 py-3 text-sm text-stone-700 font-medium">Mesa {venta.numero_mesa}</td>
        <td className="px-4 py-3 text-xs text-stone-500">{venta.fecha} {venta.hora}</td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${PAGO_COLOR[venta.tipo_pago] ?? 'bg-stone-100 text-stone-600'}`}>
            {PAGO_ICON[venta.tipo_pago]}
            {PAGO_LABEL[venta.tipo_pago] ?? venta.tipo_pago}
          </span>
        </td>
        <td className="px-4 py-3 text-right text-sm font-semibold text-stone-800">{clpFormat(venta.total)}</td>
        <td className="px-4 py-3 text-stone-300">{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</td>
      </tr>
      {open && (
        <tr className="bg-stone-50">
          <td colSpan={5} className="px-6 py-3">
            <div className="text-xs space-y-1">
              {venta.items.map((it, i) => (
                <div key={i} className="flex justify-between text-stone-600">
                  <span>{it.cantidad}× {it.nombre_producto}</span>
                  <span>{clpFormat(it.subtotal)}</span>
                </div>
              ))}
              <div className="border-t border-stone-200 pt-1 mt-1 space-y-0.5">
                <div className="flex justify-between text-stone-500"><span>Subtotal</span><span>{clpFormat(venta.subtotal)}</span></div>
                {venta.descuento > 0 && <div className="flex justify-between text-emerald-600"><span>Descuento</span><span>-{clpFormat(venta.descuento)}</span></div>}
                {venta.propina > 0 && <div className="flex justify-between text-amber-600"><span>Propina</span><span>+{clpFormat(venta.propina)}</span></div>}
                <div className="flex justify-between font-bold text-stone-800"><span>Total</span><span>{clpFormat(venta.total)}</span></div>
                {venta.tipo_pago === 'efectivo' && venta.vuelto > 0 && (
                  <div className="flex justify-between text-blue-600"><span>Vuelto entregado</span><span>{clpFormat(venta.vuelto)}</span></div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

/* Ambas en hora de Chile — ver api/fecha.ts. Con la fecha en UTC, después de
   las 20:00 el rango «últimos 30 días» se corría un día completo y el resumen
   de ventas del turno de la noche caía fuera del día que el local vivió. */
const today = () => hoyCL()
const daysAgo = (n: number) => haceDiasCL(n)

export default function Ventas() {
  const [ventas, setVentas] = useState<VentaDetalle[]>([])
  const [resumen, setResumen] = useState<VentasResumen | null>(null)
  const [loading, setLoading] = useState(true)
  const [fechaDesde, setFechaDesde] = useState(daysAgo(30))
  const [fechaHasta, setFechaHasta] = useState(today())
  const [tipoPago, setTipoPago] = useState('')

  async function reload() {
    setLoading(true)
    try {
      const [v, r] = await Promise.all([
        api.ventas.list({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta, tipo_pago: tipoPago || undefined }),
        api.ventas.resumen(),
      ])
      setVentas(v)
      setResumen(r)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [])

  const totalFiltrado = ventas.reduce((s, v) => s + v.total, 0)

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">Historial de ventas</h1>

      {/* Resumen */}
      {resumen && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ResumenCard label="Hoy" data={resumen.hoy} color="border-emerald-200 text-emerald-900 bg-emerald-50" />
          <ResumenCard label="Esta semana" data={resumen.semana} color="border-blue-200 text-blue-900 bg-blue-50" />
          <ResumenCard label="Este mes" data={resumen.mes} color="border-violet-200 text-violet-900 bg-violet-50" />
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-stone-500 mb-1 block">Desde</label>
            <input
              type="date"
              className="border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
              value={fechaDesde}
              onChange={e => setFechaDesde(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-stone-500 mb-1 block">Hasta</label>
            <input
              type="date"
              className="border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
              value={fechaHasta}
              onChange={e => setFechaHasta(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-stone-500 mb-1 block">Tipo de pago</label>
            <select
              className="border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
              value={tipoPago}
              onChange={e => setTipoPago(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="efectivo">Efectivo</option>
              <option value="debito">Débito</option>
              <option value="credito">Crédito</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </div>
          <button
            type="button"
            onClick={reload}
            className="bg-amber-500 hover:bg-amber-400 text-stone-900 font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Filtrar
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-stone-400" />
            <h2 className="font-semibold text-stone-700">
              {ventas.length} venta{ventas.length !== 1 ? 's' : ''}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-stone-600">
            <TrendingUp size={15} className="text-emerald-500" />
            <span className="font-bold text-emerald-600">{clpFormat(totalFiltrado)}</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32 text-stone-400">Cargando…</div>
        ) : ventas.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <p>Sin ventas en el período seleccionado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-stone-400 uppercase tracking-wide border-b border-stone-100">
                  <th className="px-4 py-2 text-left font-medium">Mesa</th>
                  <th className="px-4 py-2 text-left font-medium">Fecha</th>
                  <th className="px-4 py-2 text-left font-medium">Pago</th>
                  <th className="px-4 py-2 text-right font-medium">Total</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {ventas.map(v => <VentaRow key={v.id} venta={v} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
