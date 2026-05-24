import { useEffect, useState } from 'react'
import { api } from './api/client'
import type { Receta, RecetaIn, Ingrediente } from './api/client'
import { Plus, Pencil, Trash2, ChefHat, Play, ChevronDown, ChevronUp } from 'lucide-react'

function clp(n: number) {
  return `$${n.toLocaleString('es-CL')}`
}

const EMPTY_RECETA: RecetaIn = {
  nombre: '', descripcion: '', precio_venta: 0, porciones: 1, categoria: '', items: [],
}

export default function Recetas() {
  const [recetas, setRecetas] = useState<Receta[]>([])
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [modal, setModal] = useState<{ open: boolean; editing: Receta | null }>({ open: false, editing: null })
  const [form, setForm] = useState<RecetaIn>(EMPTY_RECETA)
  const [saving, setSaving] = useState(false)

  // Consumo modal
  const [consumoModal, setConsumoModal] = useState<{ open: boolean; receta: Receta | null }>({ open: false, receta: null })
  const [consumoPorciones, setConsumoPorciones] = useState('1')

  useEffect(() => {
    Promise.all([api.recetas.list(), api.ingredientes.list()])
      .then(([r, i]) => { setRecetas(r); setIngredientes(i) })
      .finally(() => setLoading(false))
  }, [])

  function openCrear() {
    setForm(EMPTY_RECETA)
    setModal({ open: true, editing: null })
  }

  function openEditar(r: Receta) {
    setForm({
      nombre: r.nombre, descripcion: r.descripcion, precio_venta: r.precio_venta,
      porciones: r.porciones, categoria: r.categoria,
      items: r.items.map(i => ({ ingrediente_id: i.ingrediente_id, cantidad: i.cantidad })),
    })
    setModal({ open: true, editing: r })
  }

  function addItem() {
    setForm(p => ({ ...p, items: [...p.items, { ingrediente_id: ingredientes[0]?.id || 0, cantidad: 1 }] }))
  }

  function removeItem(idx: number) {
    setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))
  }

  async function guardar() {
    setSaving(true)
    try {
      if (modal.editing) {
        const updated = await api.recetas.update(modal.editing.id, form)
        setRecetas(prev => prev.map(r => r.id === updated.id ? updated : r))
      } else {
        const nueva = await api.recetas.create(form)
        setRecetas(prev => [...prev, nueva])
      }
      setModal({ open: false, editing: null })
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  async function eliminar(id: number) {
    if (!confirm('¿Eliminar esta receta?')) return
    await api.recetas.delete(id)
    setRecetas(prev => prev.filter(r => r.id !== id))
  }

  async function consumir() {
    if (!consumoModal.receta) return
    try {
      await api.recetas.consumir(consumoModal.receta.id, parseFloat(consumoPorciones))
      alert(`Stock descontado para ${consumoPorciones} porción(es) de ${consumoModal.receta.nombre}`)
      setConsumoModal({ open: false, receta: null })
      const recetasActualizadas = await api.recetas.list()
      setRecetas(recetasActualizadas)
    } catch (err: unknown) {
      const e = err as { message?: string }
      alert(e.message || 'Error al consumir ingredientes')
    }
  }

  const margenColor = (pct: number) => {
    if (pct >= 60) return 'text-emerald-600'
    if (pct >= 40) return 'text-amber-600'
    return 'text-red-500'
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">Recetas</h1>
        <button
          onClick={openCrear}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-900 font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <Plus size={16} />
          Nueva receta
        </button>
      </div>

      {loading && <p className="text-stone-400 text-sm">Cargando…</p>}

      <div className="space-y-3">
        {recetas.map(r => (
          <div key={r.id} className="bg-white rounded-xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-4 px-4 py-3">
              <div
                className="flex-1 cursor-pointer"
                onClick={() => setExpanded(expanded === r.id ? null : r.id)}
              >
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-stone-700">{r.nombre}</p>
                  {r.categoria && (
                    <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">{r.categoria}</span>
                  )}
                </div>
                <p className="text-xs text-stone-400 mt-0.5">{r.porciones} porción{r.porciones !== 1 ? 'es' : ''}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-stone-700">{clp(r.precio_venta)}</p>
                <p className="text-xs">
                  Costo: {clp(r.costo_porcion)} ·{' '}
                  <span className={`font-semibold ${margenColor(r.margen_pct)}`}>{r.margen_pct}%</span>
                </p>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <button
                  onClick={() => { setConsumoModal({ open: true, receta: r }); setConsumoPorciones('1') }}
                  className="text-stone-300 hover:text-emerald-500 transition-colors" title="Consumir stock"
                >
                  <Play size={15} />
                </button>
                <button onClick={() => openEditar(r)} className="text-stone-300 hover:text-blue-500 transition-colors"><Pencil size={15} /></button>
                <button onClick={() => eliminar(r.id)} className="text-stone-300 hover:text-red-400 transition-colors"><Trash2 size={15} /></button>
                <button onClick={() => setExpanded(expanded === r.id ? null : r.id)} className="text-stone-300">
                  {expanded === r.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            </div>

            {expanded === r.id && (
              <div className="border-t border-stone-50 px-4 py-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-stone-400">
                      <th className="text-left pb-1">Ingrediente</th>
                      <th className="text-right pb-1">Cantidad</th>
                      <th className="text-right pb-1">Costo línea</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    {r.items.map(item => (
                      <tr key={item.id}>
                        <td className="py-1.5 text-stone-600">{item.ingrediente_nombre}</td>
                        <td className="py-1.5 text-right text-stone-500">{item.cantidad} {item.ingrediente_unidad}</td>
                        <td className="py-1.5 text-right text-stone-700">{clp(item.costo_linea)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-end mt-2 text-xs">
                  <span className="font-semibold text-stone-700">Costo total: {clp(r.costo_total)}</span>
                </div>
              </div>
            )}
          </div>
        ))}

        {!loading && recetas.length === 0 && (
          <div className="text-center py-12 text-stone-400">
            <ChefHat size={36} className="mx-auto mb-3 opacity-30" />
            <p>No hay recetas. Crea la primera.</p>
          </div>
        )}
      </div>

      {/* Modal Crear/Editar */}
      {modal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-stone-100 sticky top-0 bg-white">
              <h2 className="font-semibold text-stone-800">
                {modal.editing ? 'Editar receta' : 'Nueva receta'}
              </h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-stone-500 mb-1">Nombre del plato</label>
                  <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" autoFocus />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">Precio de venta ($)</label>
                  <input type="number" value={form.precio_venta} onChange={e => setForm(p => ({ ...p, precio_venta: parseFloat(e.target.value) || 0 }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">Porciones que rinde</label>
                  <input type="number" min="1" step="0.5" value={form.porciones} onChange={e => setForm(p => ({ ...p, porciones: parseFloat(e.target.value) || 1 }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-stone-500 mb-1">Categoría (opcional)</label>
                  <input value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))} placeholder="Entrantes, Fondos, Postres…" className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-stone-500 font-medium uppercase tracking-wide">Ingredientes</label>
                  <button onClick={addItem} className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-500">
                    <Plus size={13} /> Agregar
                  </button>
                </div>
                <div className="space-y-2">
                  {form.items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <select
                        value={item.ingrediente_id}
                        onChange={e => setForm(p => ({ ...p, items: p.items.map((it, i) => i === idx ? { ...it, ingrediente_id: parseInt(e.target.value) } : it) }))}
                        className="flex-1 border border-stone-200 rounded-lg px-2 py-1.5 text-xs bg-white"
                      >
                        {ingredientes.map(ing => (
                          <option key={ing.id} value={ing.id}>{ing.nombre} ({ing.unidad})</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.001"
                        value={item.cantidad}
                        onChange={e => setForm(p => ({ ...p, items: p.items.map((it, i) => i === idx ? { ...it, cantidad: parseFloat(e.target.value) || 0 } : it) }))}
                        className="w-20 border border-stone-200 rounded-lg px-2 py-1.5 text-xs text-right"
                      />
                      <button onClick={() => removeItem(idx)} className="text-stone-300 hover:text-red-400"><Trash2 size={14} /></button>
                    </div>
                  ))}
                  {form.items.length === 0 && (
                    <p className="text-stone-400 text-xs py-2">Sin ingredientes aún.</p>
                  )}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-stone-100 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setModal({ open: false, editing: null })} className="text-stone-500 hover:text-stone-700 px-4 py-2 text-sm">Cancelar</button>
              <button onClick={guardar} disabled={saving || !form.nombre} className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-900 font-semibold px-5 py-2 rounded-lg text-sm transition-colors">
                {saving ? 'Guardando…' : 'Guardar receta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Consumo */}
      {consumoModal.open && consumoModal.receta && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 space-y-4">
            <h2 className="font-semibold text-stone-800">Registrar consumo</h2>
            <p className="text-stone-500 text-sm">{consumoModal.receta.nombre}</p>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Número de porciones</label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={consumoPorciones}
                onChange={e => setConsumoPorciones(e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                autoFocus
              />
            </div>
            <p className="text-xs text-stone-400">
              Se descontará del stock el equivalente a {consumoPorciones} porción(es).
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConsumoModal({ open: false, receta: null })} className="text-stone-500 text-sm px-4 py-2">Cancelar</button>
              <button onClick={consumir} className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors">
                Descontar stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
