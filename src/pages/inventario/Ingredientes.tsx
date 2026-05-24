import { useEffect, useState } from 'react'
import { api } from './api/client'
import type { Ingrediente, IngredienteIn } from './api/client'
import { Plus, Pencil, Trash2, AlertTriangle, CheckCircle, SlidersHorizontal } from 'lucide-react'

const UNIDADES = ['kg', 'g', 'lt', 'ml', 'unidad', 'bandeja', 'caja', 'bolsa', 'lata', 'botella']
const CATEGORIAS = ['Verduras', 'Frutas', 'Carnes', 'Mariscos', 'Lácteos', 'Panadería', 'Despensa', 'Bebidas', 'Condimentos', 'Otros']

const EMPTY: IngredienteIn = {
  nombre: '', unidad: 'kg', stock: 0, stock_minimo: 0, costo_unitario: 0, categoria: '',
}

export default function Ingredientes() {
  const [items, setItems] = useState<Ingrediente[]>([])
  const [loading, setLoading] = useState(true)
  const [soloAlertas, setSoloAlertas] = useState(false)
  const [modal, setModal] = useState<{ open: boolean; editing: Ingrediente | null; ajuste: boolean }>({
    open: false, editing: null, ajuste: false,
  })
  const [form, setForm] = useState<IngredienteIn>(EMPTY)
  const [ajusteCant, setAjusteCant] = useState('')
  const [ajusteMotivo, setAjusteMotivo] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.ingredientes.list().then(setItems).finally(() => setLoading(false))
  }, [])

  function openCrear() {
    setForm(EMPTY)
    setModal({ open: true, editing: null, ajuste: false })
  }

  function openEditar(ing: Ingrediente) {
    setForm({ nombre: ing.nombre, unidad: ing.unidad, stock: ing.stock, stock_minimo: ing.stock_minimo, costo_unitario: ing.costo_unitario, categoria: ing.categoria })
    setModal({ open: true, editing: ing, ajuste: false })
  }

  function openAjuste(ing: Ingrediente) {
    setAjusteCant('')
    setAjusteMotivo('Ajuste manual')
    setModal({ open: true, editing: ing, ajuste: true })
  }

  async function guardar() {
    setSaving(true)
    try {
      if (modal.ajuste && modal.editing) {
        const updated = await api.ingredientes.ajustar(modal.editing.id, parseFloat(ajusteCant), ajusteMotivo)
        setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
      } else if (modal.editing) {
        const updated = await api.ingredientes.update(modal.editing.id, form)
        setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
      } else {
        const nuevo = await api.ingredientes.create(form)
        setItems(prev => [...prev, nuevo])
      }
      setModal({ open: false, editing: null, ajuste: false })
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  async function eliminar(id: number) {
    if (!confirm('¿Eliminar este ingrediente?')) return
    await api.ingredientes.delete(id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const filtered = soloAlertas ? items.filter(i => i.alerta_stock) : items

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">Ingredientes</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setSoloAlertas(s => !s)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${soloAlertas ? 'bg-red-100 text-red-700' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
          >
            <AlertTriangle size={15} />
            {soloAlertas ? 'Solo alertas' : 'Todas'}
          </button>
          <button
            onClick={openCrear}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-900 font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <Plus size={16} />
            Agregar
          </button>
        </div>
      </div>

      {loading && <p className="text-stone-400 text-sm">Cargando…</p>}

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-stone-400 text-sm text-center py-12">
            {soloAlertas ? 'No hay ingredientes con stock bajo.' : 'No hay ingredientes. Agrega el primero.'}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-400 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Ingrediente</th>
                <th className="text-right px-4 py-3">Stock</th>
                <th className="text-right px-4 py-3">Mínimo</th>
                <th className="text-right px-4 py-3">Costo unit.</th>
                <th className="text-right px-4 py-3">Valor stock</th>
                <th className="text-center px-4 py-3">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {filtered.map(ing => (
                <tr key={ing.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-stone-700">{ing.nombre}</p>
                    <p className="text-stone-400 text-xs">{ing.categoria || 'Sin categoría'}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-stone-700">
                    {ing.stock} {ing.unidad}
                  </td>
                  <td className="px-4 py-3 text-right text-stone-400">{ing.stock_minimo} {ing.unidad}</td>
                  <td className="px-4 py-3 text-right text-stone-500">
                    ${ing.costo_unitario.toLocaleString('es-CL')}
                  </td>
                  <td className="px-4 py-3 text-right text-stone-700">
                    ${ing.valor_stock.toLocaleString('es-CL')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {ing.alerta_stock ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                        <AlertTriangle size={11} /> Bajo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">
                        <CheckCircle size={11} /> OK
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openAjuste(ing)} className="text-stone-300 hover:text-amber-500 transition-colors" title="Ajustar stock">
                        <SlidersHorizontal size={15} />
                      </button>
                      <button onClick={() => openEditar(ing)} className="text-stone-300 hover:text-blue-500 transition-colors" title="Editar">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => eliminar(ing.id)} className="text-stone-300 hover:text-red-400 transition-colors" title="Eliminar">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="px-6 py-5 border-b border-stone-100">
              <h2 className="font-semibold text-stone-800">
                {modal.ajuste
                  ? `Ajustar stock — ${modal.editing?.nombre}`
                  : modal.editing
                  ? 'Editar ingrediente'
                  : 'Nuevo ingrediente'}
              </h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              {modal.ajuste ? (
                <>
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">
                      Cantidad (+ entrada / − salida)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={ajusteCant}
                      onChange={e => setAjusteCant(e.target.value)}
                      placeholder="Ej: 5 o -2"
                      className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">Motivo</label>
                    <input
                      value={ajusteMotivo}
                      onChange={e => setAjusteMotivo(e.target.value)}
                      className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">Nombre</label>
                    <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" autoFocus />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-stone-500 mb-1">Unidad</label>
                      <select value={form.unidad} onChange={e => setForm(p => ({ ...p, unidad: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-white">
                        {UNIDADES.map(u => <option key={u}>{u}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-stone-500 mb-1">Categoría</label>
                      <select value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-white">
                        <option value="">— sin categoría —</option>
                        {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-stone-500 mb-1">Stock actual</label>
                      <input type="number" step="0.001" value={form.stock} onChange={e => setForm(p => ({ ...p, stock: parseFloat(e.target.value) || 0 }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-stone-500 mb-1">Stock mínimo</label>
                      <input type="number" step="0.001" value={form.stock_minimo} onChange={e => setForm(p => ({ ...p, stock_minimo: parseFloat(e.target.value) || 0 }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-stone-500 mb-1">Costo/unidad</label>
                      <input type="number" step="1" value={form.costo_unitario} onChange={e => setForm(p => ({ ...p, costo_unitario: parseFloat(e.target.value) || 0 }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t border-stone-100 flex justify-end gap-3">
              <button onClick={() => setModal({ open: false, editing: null, ajuste: false })} className="text-stone-500 hover:text-stone-700 px-4 py-2 text-sm">
                Cancelar
              </button>
              <button onClick={guardar} disabled={saving} className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-900 font-semibold px-5 py-2 rounded-lg text-sm transition-colors">
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
