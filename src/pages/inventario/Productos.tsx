import { useEffect, useRef, useState } from 'react'
import { api } from './api/client'
import type { Producto, ProductoIn } from './api/client'
import { Plus, Pencil, Trash2, Upload, X, Check, ImageOff } from 'lucide-react'

const CATEGORIAS = ['Entradas', 'Platos principales', 'Postres', 'Bebidas', 'Vinos', 'Tragos', 'Sin categoría']

function clpFormat(n: number) {
  return `$${n.toLocaleString('es-CL')}`
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-800">{title}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-3">{children}</div>
      </div>
    </div>
  )
}

function FormProducto({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Producto
  onSave: (data: ProductoIn) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState<ProductoIn>({
    nombre: initial?.nombre ?? '',
    descripcion: initial?.descripcion ?? '',
    precio: initial?.precio ?? 0,
    categoria: initial?.categoria ?? '',
    foto: initial?.foto ?? '',
    activo: initial?.activo ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre) { setErr('El nombre es obligatorio'); return }
    setSaving(true)
    try {
      await onSave(form)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="text-xs text-stone-500 mb-1 block">Nombre *</label>
        <input
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
          value={form.nombre}
          onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-stone-500 mb-1 block">Precio (CLP)</label>
          <input
            type="number"
            min={0}
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
            value={form.precio}
            onChange={e => setForm(f => ({ ...f, precio: parseFloat(e.target.value) || 0 }))}
          />
        </div>
        <div>
          <label className="text-xs text-stone-500 mb-1 block">Categoría</label>
          <select
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
            value={form.categoria}
            onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
          >
            <option value="">— Sin categoría —</option>
            {CATEGORIAS.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs text-stone-500 mb-1 block">Descripción</label>
        <textarea
          rows={2}
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400 resize-none"
          value={form.descripcion}
          onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
        />
      </div>
      <div>
        <label className="text-xs text-stone-500 mb-1 block">URL de foto</label>
        <input
          type="url"
          placeholder="https://…"
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
          value={form.foto}
          onChange={e => setForm(f => ({ ...f, foto: e.target.value }))}
        />
      </div>
      {err && <p className="text-red-500 text-xs">{err}</p>}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-900 font-semibold py-2 rounded-lg text-sm transition-colors"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm border border-stone-200 text-stone-600 hover:bg-stone-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

export default function Productos() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Producto | null>(null)
  const [importMsg, setImportMsg] = useState('')
  const csvRef = useRef<HTMLInputElement>(null)
  const [filterCat, setFilterCat] = useState('')

  async function reload() {
    setLoading(true)
    try {
      setProductos(await api.productos.list())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [])

  async function handleCreate(data: ProductoIn) {
    await api.productos.create(data)
    setShowForm(false)
    reload()
  }

  async function handleEdit(data: ProductoIn) {
    if (!editing) return
    await api.productos.update(editing.id, data)
    setEditing(null)
    reload()
  }

  async function handleDelete(p: Producto) {
    if (!confirm(`¿Desactivar "${p.nombre}"?`)) return
    await api.productos.delete(p.id)
    reload()
  }

  async function toggleAgotado(p: Producto) {
    await api.productosExtra.agotar(p.id)
    reload()
  }

  async function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportMsg('Importando…')
    try {
      const res = await api.productos.importarCSV(file)
      setImportMsg(`✓ ${res.creados} productos importados${res.errores.length ? ` · ${res.errores.length} errores` : ''}`)
      reload()
    } catch (err: unknown) {
      setImportMsg(err instanceof Error ? err.message : 'Error')
    } finally {
      if (csvRef.current) csvRef.current.value = ''
    }
  }

  const categorias = Array.from(new Set(productos.map(p => p.categoria).filter(Boolean)))
  const filtered = filterCat ? productos.filter(p => p.categoria === filterCat) : productos
  const groups = filterCat
    ? { [filterCat]: filtered }
    : filtered.reduce<Record<string, Producto[]>>((acc, p) => {
        const cat = p.categoria || 'Sin categoría'
        ;(acc[cat] = acc[cat] || []).push(p)
        return acc
      }, {})

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">Catálogo de productos</h1>
        <div className="flex items-center gap-2">
          <input
            ref={csvRef}
            type="file"
            accept=".csv"
            onChange={handleCSV}
            className="hidden"
            id="csv-upload"
          />
          <label
            htmlFor="csv-upload"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-stone-200 text-stone-600 hover:bg-stone-50 cursor-pointer"
          >
            <Upload size={15} />
            Importar CSV
          </label>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-900 font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <Plus size={16} />
            Nuevo producto
          </button>
        </div>
      </div>

      {importMsg && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm">
          <Check size={16} />
          {importMsg}
        </div>
      )}

      {/* CSV hint */}
      <p className="text-xs text-stone-400">
        El CSV debe tener columnas: <code className="bg-stone-100 px-1 rounded">nombre, precio, categoria, descripcion, foto</code>
      </p>

      {/* Filter */}
      {categorias.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterCat('')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!filterCat ? 'bg-amber-500 text-stone-900' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
          >
            Todos
          </button>
          {categorias.map(c => (
            <button
              key={c}
              onClick={() => setFilterCat(c)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterCat === c ? 'bg-amber-500 text-stone-900' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48 text-stone-400">Cargando…</div>
      ) : productos.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-lg font-medium">Sin productos aún</p>
          <p className="text-sm mt-1">Crea tu primer producto o importa un CSV.</p>
        </div>
      ) : (
        Object.entries(groups).map(([cat, items]) => (
          <div key={cat}>
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">{cat}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map(p => (
                <div key={p.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden group ${p.agotado_hoy ? 'border-red-200 opacity-70' : 'border-stone-100'}`}>
                  <div className="aspect-video bg-stone-100 relative flex items-center justify-center">
                    {p.foto ? (
                      <img
                        src={p.foto}
                        alt={p.nombre}
                        className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : (
                      <ImageOff size={28} className="text-stone-300" />
                    )}
                    {p.agotado_hoy && (
                      <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">AGOTADO</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => setEditing(p)}
                        className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-stone-700 hover:bg-white"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p)}
                        className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-red-500 hover:bg-white"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-stone-800 leading-tight">{p.nombre}</p>
                    {p.descripcion && (
                      <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">{p.descripcion}</p>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-amber-600 font-bold text-sm">{clpFormat(p.precio)}</p>
                      <button
                        type="button"
                        onClick={() => toggleAgotado(p)}
                        title={p.agotado_hoy ? 'Marcar como disponible' : 'Marcar como agotado hoy'}
                        className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                          p.agotado_hoy
                            ? 'bg-red-100 text-red-600 hover:bg-red-200'
                            : 'bg-stone-100 text-stone-400 hover:bg-stone-200'
                        }`}
                      >
                        {p.agotado_hoy ? 'Agotado' : '86'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {showForm && (
        <Modal title="Nuevo producto" onClose={() => setShowForm(false)}>
          <FormProducto onSave={handleCreate} onCancel={() => setShowForm(false)} />
        </Modal>
      )}

      {editing && (
        <Modal title="Editar producto" onClose={() => setEditing(null)}>
          <FormProducto initial={editing} onSave={handleEdit} onCancel={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  )
}
