import { useEffect, useState } from 'react'
import { api } from './api/client'
import { hoyCL } from './api/fecha'
import type { CierreCaja, GastoIn } from './api/client'
import { Wallet, Plus, Trash2, Banknote, CreditCard, Smartphone, TrendingUp, TrendingDown } from 'lucide-react'

function clpFormat(n: number) {
  return `$${Math.round(n).toLocaleString('es-CL')}`
}

/* El día del LOCAL, en hora de Chile. Ver api/fecha.ts: el cierre de caja se
   hace después de las 20:00, cuando la fecha en UTC ya es la de mañana. */
const today = () => hoyCL()

const CATEGORIAS = ['personal', 'servicios', 'insumos', 'otros']

const PAGO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  debito: 'Débito',
  credito: 'Crédito',
  transferencia: 'Transferencia',
}

const PAGO_ICON: Record<string, React.ReactNode> = {
  efectivo: <Banknote size={14} />,
  debito: <CreditCard size={14} />,
  credito: <CreditCard size={14} />,
  transferencia: <Smartphone size={14} />,
}

export default function CierreCaja() {
  const [fecha, setFecha] = useState(today())
  const [cierre, setCierre] = useState<CierreCaja | null>(null)
  const [loading, setLoading] = useState(true)

  const [showGasto, setShowGasto] = useState(false)
  const [gasto, setGasto] = useState<GastoIn>({ descripcion: '', monto: 0, categoria: 'otros' })
  const [savingGasto, setSavingGasto] = useState(false)

  async function reload() {
    setLoading(true)
    try {
      setCierre(await api.caja.cierre(fecha))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [fecha])

  async function agregarGasto() {
    if (!gasto.descripcion.trim() || gasto.monto <= 0) return
    setSavingGasto(true)
    try {
      await api.caja.agregarGasto({ ...gasto, fecha })
      setGasto({ descripcion: '', monto: 0, categoria: 'otros' })
      setShowGasto(false)
      await reload()
    } finally {
      setSavingGasto(false)
    }
  }

  async function quitarGasto(id: number) {
    await api.caja.eliminarGasto(id)
    await reload()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">Cierre de caja</h1>
        <div className="flex items-center gap-3">
          <input
            type="date"
            className="border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowGasto(true)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-900 font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            <Plus size={16} /> Agregar gasto
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-stone-400">Cargando…</div>
      ) : !cierre ? null : (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SummaryCard
              label="Ingresos del día"
              value={cierre.total_ventas}
              sub={`${cierre.num_ventas} cobro${cierre.num_ventas !== 1 ? 's' : ''}`}
              color="emerald"
              icon={<TrendingUp size={18} />}
            />
            <SummaryCard
              label="Gastos del día"
              value={cierre.total_gastos}
              sub={`${cierre.gastos.length} registro${cierre.gastos.length !== 1 ? 's' : ''}`}
              color="red"
              icon={<TrendingDown size={18} />}
            />
            <SummaryCard
              label="Resultado neto"
              value={cierre.resultado_neto}
              sub="ventas − gastos"
              color={cierre.resultado_neto >= 0 ? 'emerald' : 'red'}
              icon={<Wallet size={18} />}
            />
            <SummaryCard
              label="Efectivo en caja"
              value={cierre.efectivo_bruto}
              sub="solo pagos efectivo"
              color="amber"
              icon={<Banknote size={18} />}
            />
          </div>

          {/* Por tipo de pago */}
          {Object.keys(cierre.por_pago).length > 0 && (
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 space-y-3">
              <h2 className="font-semibold text-stone-700">Desglose por tipo de pago</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(cierre.por_pago).map(([tipo, monto]) => (
                  <div key={tipo} className="flex items-center gap-3 bg-stone-50 rounded-xl p-3">
                    <span className="text-stone-400">{PAGO_ICON[tipo] ?? <CreditCard size={14} />}</span>
                    <div>
                      <p className="text-xs text-stone-500">{PAGO_LABEL[tipo] ?? tipo}</p>
                      <p className="font-bold text-stone-800 text-sm">{clpFormat(monto)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gastos */}
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <h2 className="font-semibold text-stone-700">Gastos del día</h2>
              <span className="text-sm font-bold text-red-500">{clpFormat(cierre.total_gastos)}</span>
            </div>
            {cierre.gastos.length === 0 ? (
              <p className="text-center py-8 text-stone-400 text-sm">Sin gastos registrados</p>
            ) : (
              <table className="w-full">
                <tbody className="divide-y divide-stone-50">
                  {cierre.gastos.map(g => (
                    <tr key={g.id} className="hover:bg-stone-50">
                      <td className="px-4 py-3 text-sm text-stone-700">{g.descripcion}</td>
                      <td className="px-4 py-3 text-xs text-stone-400">{g.categoria}</td>
                      <td className="px-4 py-3 text-right font-semibold text-stone-700">{clpFormat(g.monto)}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => quitarGasto(g.id)}
                          className="text-stone-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Ventas detalle */}
          {cierre.ventas_detalle.length > 0 && (
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-stone-100">
                <h2 className="font-semibold text-stone-700">Ventas del día ({cierre.num_ventas})</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-stone-400 uppercase tracking-wide border-b border-stone-50">
                      <th className="px-4 py-2 text-left">Hora</th>
                      <th className="px-4 py-2 text-left">Mesa</th>
                      <th className="px-4 py-2 text-left">Pago</th>
                      <th className="px-4 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    {cierre.ventas_detalle.map(v => (
                      <tr key={v.id} className="hover:bg-stone-50">
                        <td className="px-4 py-2 text-stone-500">{v.hora}</td>
                        <td className="px-4 py-2 text-stone-700">
                          {v.numero_mesa > 0 ? `Mesa ${v.numero_mesa}` : 'Para llevar'}
                        </td>
                        <td className="px-4 py-2 text-stone-500">{PAGO_LABEL[v.tipo_pago] ?? v.tipo_pago}</td>
                        <td className="px-4 py-2 text-right font-semibold text-stone-800">{clpFormat(v.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal gasto */}
      {showGasto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="font-bold text-stone-800 text-lg">Registrar gasto</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-stone-500 mb-1 block">Descripción *</label>
                <input
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                  value={gasto.descripcion}
                  onChange={e => setGasto(g => ({ ...g, descripcion: e.target.value }))}
                  placeholder="Gas, sueldos, insumos..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-stone-500 mb-1 block">Monto *</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                    value={gasto.monto || ''}
                    onChange={e => setGasto(g => ({ ...g, monto: Number(e.target.value) }))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs text-stone-500 mb-1 block">Categoría</label>
                  <select
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                    value={gasto.categoria}
                    onChange={e => setGasto(g => ({ ...g, categoria: e.target.value }))}
                  >
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowGasto(false)}
                className="flex-1 border border-stone-200 rounded-xl py-2 text-sm text-stone-600 hover:bg-stone-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={agregarGasto}
                disabled={savingGasto || !gasto.descripcion.trim() || gasto.monto <= 0}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-900 font-semibold rounded-xl py-2 text-sm"
              >
                {savingGasto ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, sub, color, icon }: {
  label: string
  value: number
  sub: string
  color: 'emerald' | 'red' | 'amber' | 'blue'
  icon: React.ReactNode
}) {
  const colors = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
  }
  return (
    <div className={`rounded-2xl border p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2 opacity-70">{icon}<p className="text-xs uppercase tracking-wide font-medium">{label}</p></div>
      <p className="text-2xl font-bold">{`$${Math.round(Math.abs(value)).toLocaleString('es-CL')}`}</p>
      <p className="text-xs opacity-60 mt-0.5">{sub}</p>
    </div>
  )
}
