import { useEffect, useState } from 'react'
import { Plus, ChevronDown, ChevronRight, Pencil, Trash2, X, Check, Phone, MapPin, Tag } from 'lucide-react'
import { api } from './api/client'
import type { Proveedor, ProveedorIn, PrecioProveedor, Ingrediente } from './api/client'

const TIPOS = ['supermercado', 'mayorista', 'distribuidor', 'feria', 'otro']

const EMPTY_FORM: ProveedorIn = {
  nombre: '', tipo: 'supermercado', telefono: '', contacto: '', direccion: '', notas: '',
}

export default function Proveedores() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Proveedor | null>(null)
  const [form, setForm] = useState<ProveedorIn>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // Expanded proveedor for price editing
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [precios, setPrecios] = useState<PrecioProveedor[]>([])
  const [loadingPrecios, setLoadingPrecios] = useState(false)

  // Price editing inline
  const [precioEdit, setPrecioEdit] = useState<Record<number, string>>({})
  const [savingPrecio, setSavingPrecio] = useState<number | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const [provs, ings] = await Promise.all([api.proveedores.list(), api.ingredientes.list()])
      setProveedores(provs)
      setIngredientes(ings)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error cargando datos')
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(p: Proveedor) {
    setEditing(p)
    setForm({ nombre: p.nombre, tipo: p.tipo, telefono: p.telefono, contacto: p.contacto, direccion: p.direccion, notas: p.notas })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.nombre.trim()) return
    setSaving(true)
    try {
      if (editing) {
        const updated = await api.proveedores.update(editing.id, form)
        setProveedores(prev => prev.map(p => p.id === editing.id ? updated : p))
      } else {
        const created = await api.proveedores.create(form)
        setProveedores(prev => [...prev, created])
      }
      setShowForm(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error guardando')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(p: Proveedor) {
    if (!confirm(`¿Eliminar proveedor "${p.nombre}"?`)) return
    try {
      await api.proveedores.delete(p.id)
      setProveedores(prev => prev.filter(x => x.id !== p.id))
      if (expandedId === p.id) setExpandedId(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error eliminando')
    }
  }

  async function toggleExpand(p: Proveedor) {
    if (expandedId === p.id) {
      setExpandedId(null)
      setPrecios([])
      setPrecioEdit({})
      return
    }
    setExpandedId(p.id)
    setLoadingPrecios(true)
    try {
      const data = await api.proveedores.precios(p.id)
      setPrecios(data)
      const edits: Record<number, string> = {}
      data.forEach(pp => { edits[pp.ingrediente_id] = String(pp.precio) })
      setPrecioEdit(edits)
    } catch {
      setPrecios([])
    } finally {
      setLoadingPrecios(false)
    }
  }

  async function savePrecio(provId: number, ingId: number) {
    const val = parseFloat(precioEdit[ingId] ?? '0')
    if (isNaN(val) || val < 0) return
    setSavingPrecio(ingId)
    try {
      if (val === 0) {
        const existing = precios.find(p => p.ingrediente_id === ingId)
        if (existing) {
          await api.proveedores.deletePrecio(provId, existing.id)
          setPrecios(prev => prev.filter(p => p.ingrediente_id !== ingId))
        }
      } else {
        const saved = await api.proveedores.upsertPrecio(provId, { ingrediente_id: ingId, precio: val })
        setPrecios(prev => {
          const exists = prev.find(p => p.ingrediente_id === ingId)
          return exists ? prev.map(p => p.ingrediente_id === ingId ? saved : p) : [...prev, saved]
        })
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error guardando precio')
    } finally {
      setSavingPrecio(null)
    }
  }

  function getPrecio(ingId: number) {
    return precios.find(p => p.ingrediente_id === ingId)
  }

  const tipoBadgeColor: Record<string, string> = {
    supermercado: 'bg-blue-100 text-blue-700',
    mayorista: 'bg-purple-100 text-purple-700',
    distribuidor: 'bg-green-100 text-green-700',
    feria: 'bg-amber-100 text-amber-700',
    otro: 'bg-stone-100 text-stone-600',
  }

  if (loading) return <div className="p-6 text-stone-400 text-sm">Cargando proveedores…</div>

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-stone-800">Proveedores</h1>
          <p className="text-sm text-stone-400 mt-0.5">Gestiona tus proveedores y sus precios por ingrediente</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-900 font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <Plus size={16} /> Nuevo proveedor
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600 flex justify-between">
          {error}
          <button onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-semibold text-stone-800">{editing ? 'Editar proveedor' : 'Nuevo proveedor'}</h2>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-stone-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-stone-500 mb-1">Nombre *</label>
                <input
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Jumbo Los Andes"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Tipo</label>
                <select
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                  value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                >
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-stone-500 mb-1">Teléfono</label>
                  <input
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                    value={form.telefono}
                    onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                    placeholder="+56 9 …"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">Contacto</label>
                  <input
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                    value={form.contacto}
                    onChange={e => setForm(f => ({ ...f, contacto: e.target.value }))}
                    placeholder="Nombre contacto"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Dirección</label>
                <input
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                  value={form.direccion}
                  onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))}
                  placeholder="Calle, número, ciudad"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Notas</label>
                <textarea
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  rows={2}
                  value={form.notas}
                  onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 border border-stone-200 text-stone-600 py-2 rounded-lg text-sm hover:bg-stone-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.nombre.trim()}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-900 font-semibold py-2 rounded-lg text-sm"
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proveedores list */}
      {proveedores.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center text-stone-400 text-sm">
          No hay proveedores registrados. Crea el primero.
        </div>
      ) : (
        <div className="space-y-3">
          {proveedores.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              {/* Header row */}
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => toggleExpand(p)}
                  className="text-stone-400 hover:text-stone-600"
                >
                  {expandedId === p.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-stone-800 text-sm">{p.nombre}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipoBadgeColor[p.tipo] ?? tipoBadgeColor.otro}`}>
                      {p.tipo}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-0.5 text-xs text-stone-400 flex-wrap">
                    {p.telefono && (
                      <span className="flex items-center gap-1"><Phone size={11} />{p.telefono}</span>
                    )}
                    {p.direccion && (
                      <span className="flex items-center gap-1"><MapPin size={11} />{p.direccion}</span>
                    )}
                    {p.contacto && (
                      <span className="flex items-center gap-1"><Tag size={11} />{p.contacto}</span>
                    )}
                  </div>
                </div>
                <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-600">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(p)} className="p-1.5 rounded hover:bg-red-50 text-stone-400 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Price grid */}
              {expandedId === p.id && (
                <div className="border-t border-stone-100 px-4 py-4">
                  <p className="text-xs text-stone-500 mb-3 font-medium">
                    Precios por ingrediente — ingresa 0 para borrar el precio
                  </p>
                  {loadingPrecios ? (
                    <p className="text-xs text-stone-400">Cargando precios…</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ingredientes.map(ing => {
                        const saved = getPrecio(ing.id)
                        const val = precioEdit[ing.id] ?? ''
                        const isDirty = val !== (saved ? String(saved.precio) : '')
                        return (
                          <div key={ing.id} className="flex items-center gap-2 bg-stone-50 rounded-lg px-3 py-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-stone-700 truncate">{ing.nombre}</p>
                              <p className="text-[10px] text-stone-400">por {ing.unidad}</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-stone-400">$</span>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                className="w-24 border border-stone-200 rounded px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-amber-400 text-right"
                                placeholder="—"
                                value={val}
                                onChange={e => setPrecioEdit(prev => ({ ...prev, [ing.id]: e.target.value }))}
                              />
                              {isDirty && (
                                <button
                                  onClick={() => savePrecio(p.id, ing.id)}
                                  disabled={savingPrecio === ing.id}
                                  className="p-1 rounded bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-900"
                                >
                                  <Check size={11} />
                                </button>
                              )}
                              {!isDirty && saved && (
                                <span className="w-5 text-center text-green-500">
                                  <Check size={11} />
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
