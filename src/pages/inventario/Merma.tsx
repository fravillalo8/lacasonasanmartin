import { useEffect, useState } from 'react'
import { api } from './api/client'
import type { MermaItem, MermaIn, Ingrediente, MermaResumen } from './api/client'
import { Plus, TrendingDown } from 'lucide-react'

function clpFormat(n: number) {
  return `$${Math.round(n).toLocaleString('es-CL')}`
}

const MOTIVOS = ['vencimiento', 'coccion', 'accidente', 'otro']
const MOTIVO_COLOR: Record<string, string> = {
  vencimiento: 'bg-red-100 text-red-700',
  coccion: 'bg-orange-100 text-orange-700',
  accidente: 'bg-amber-100 text-amber-700',
  otro: 'bg-stone-100 text-stone-600',
}

const empty = (): MermaIn => ({ ingrediente_id: 0, cantidad: 0, motivo: 'vencimiento', descripcion: '' })

export default function Merma() {
  const [mermas, setMermas] = useState<MermaItem[]>([])
  const [resumen, setResumen] = useState<MermaResumen | null>(null)
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<MermaIn>(empty())
  const [saving, setSaving] = useState(false)
  const [resultado, setResultado] = useState<{ costo_estimado: number; stock_restante: number } | null>(null)

  async function reload() {
    setLoading(true)
    try {
      const [m, r, ing] = await Promise.all([
        api.mermas.list(),
        api.mermas.resumen(),
        api.ingredientes.list(),
      ])
      setMermas(m)
      setResumen(r)
      setIngredientes(ing.filter(i => i.activo))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [])

  async function registrar() {
    if (!form.ingrediente_id || form.cantidad <= 0) return
    setSaving(true)
    try {
      const res = await api.mermas.registrar(form)
      setResultado(res)
      setForm(empty())
      await reload()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">Control de merma</h1>
        <button
          type="button"
          onClick={() => { setShowForm(true); setResultado(null) }}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-900 font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
        >
          <Plus size={16} /> Registrar merma
        </button>
      </div>

      {/* Resumen del mes */}
      {resumen && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wide text-red-600 font-medium mb-1">Costo merma (mes)</p>
            <p className="text-2xl font-bold text-red-800">{clpFormat(resumen.total_costo_mes)}</p>
            <p className="text-xs text-red-500 mt-0.5">{resumen.num_registros_mes} registro{resumen.num_registros_mes !== 1 ? 's' : ''}</p>
          </div>
          {Object.entries(resumen.por_motivo).map(([motivo, costo]) => (
            <div key={motivo} className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm">
              <p className={`text-xs px-2 py-0.5 rounded-full font-medium inline-block mb-2 ${MOTIVO_COLOR[motivo] ?? 'bg-stone-100 text-stone-600'}`}>
                {motivo}
              </p>
              <p className="text-xl font-bold text-stone-800">{clpFormat(costo)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Historial */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-stone-400">Cargando…</div>
      ) : mermas.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-stone-400 gap-2">
          <TrendingDown size={36} className="opacity-30" />
          <p>Sin mermas registradas</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100">
            <h2 className="font-semibold text-stone-700">Historial reciente</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-stone-400 uppercase tracking-wide border-b border-stone-50">
                  <th className="px-4 py-2 text-left font-medium">Ingrediente</th>
                  <th className="px-4 py-2 text-left font-medium">Motivo</th>
                  <th className="px-4 py-2 text-right font-medium">Cantidad</th>
                  <th className="px-4 py-2 text-right font-medium">Costo</th>
                  <th className="px-4 py-2 text-left font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {mermas.map(m => (
                  <tr key={m.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-stone-800">{m.ingrediente}</p>
                      {m.descripcion && <p className="text-xs text-stone-400">{m.descripcion}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MOTIVO_COLOR[m.motivo] ?? 'bg-stone-100 text-stone-600'}`}>
                        {m.motivo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-stone-700">
                      {m.cantidad} {m.unidad}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-red-600">
                      {clpFormat(m.costo_estimado)}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-400">{m.fecha}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-bold text-stone-800 text-lg">Registrar merma</h2>

            {resultado && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                Merma registrada. Costo estimado: <strong>{clpFormat(resultado.costo_estimado)}</strong>.
                Stock restante: <strong>{resultado.stock_restante}</strong>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs text-stone-500 mb-1 block">Ingrediente *</label>
                <select
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                  value={form.ingrediente_id || ''}
                  onChange={e => setForm(f => ({ ...f, ingrediente_id: Number(e.target.value) }))}
                >
                  <option value="">Seleccionar…</option>
                  {ingredientes.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.nombre} (stock: {i.stock} {i.unidad})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-stone-500 mb-1 block">Cantidad *</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                    value={form.cantidad || ''}
                    onChange={e => setForm(f => ({ ...f, cantidad: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-stone-500 mb-1 block">Motivo</label>
                  <select
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                    value={form.motivo}
                    onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}
                  >
                    {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-stone-500 mb-1 block">Descripción</label>
                <input
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Detalle opcional..."
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 border border-stone-200 rounded-xl py-2 text-sm text-stone-600 hover:bg-stone-50"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={registrar}
                disabled={saving || !form.ingrediente_id || form.cantidad <= 0}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-900 font-semibold rounded-xl py-2 text-sm"
              >
                {saving ? 'Registrando…' : 'Registrar merma'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
