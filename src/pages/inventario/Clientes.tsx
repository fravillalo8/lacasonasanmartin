import { useEffect, useState, useCallback } from 'react'
import { api } from './api/client'
import type { ClienteFrecuente, ClienteIn } from './api/client'
import { Users, Plus, Pencil, Trash2, Phone, Mail, Star, Search } from 'lucide-react'

function clpFormat(n: number) {
  return `$${Math.round(n).toLocaleString('es-CL')}`
}

const empty = (): ClienteIn => ({ nombre: '', telefono: '', email: '', notas: '' })

export default function Clientes() {
  const [clientes, setClientes] = useState<ClienteFrecuente[]>([])
  const [loading, setLoading] = useState(true)
  const [buscar, setBuscar] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ClienteFrecuente | null>(null)
  const [form, setForm] = useState<ClienteIn>(empty())
  const [saving, setSaving] = useState(false)

  const reload = useCallback(async (q?: string) => {
    setLoading(true)
    try {
      setClientes(await api.clientes.list(q))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  function openNew() {
    setEditing(null)
    setForm(empty())
    setShowForm(true)
  }

  function openEdit(c: ClienteFrecuente) {
    setEditing(c)
    setForm({ nombre: c.nombre, telefono: c.telefono, email: c.email, notas: c.notas })
    setShowForm(true)
  }

  async function save() {
    if (!form.nombre.trim()) return
    setSaving(true)
    try {
      if (editing) {
        await api.clientes.update(editing.id, form)
      } else {
        await api.clientes.create(form)
      }
      setShowForm(false)
      reload(buscar)
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: number) {
    if (!confirm('¿Eliminar cliente?')) return
    await api.clientes.delete(id)
    reload(buscar)
  }

  function handleSearch(v: string) {
    setBuscar(v)
    reload(v)
  }

  const topClientes = [...clientes].sort((a, b) => b.visitas - a.visitas).slice(0, 3)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">Clientes frecuentes</h1>
        <button
          type="button"
          onClick={openNew}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-900 font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
        >
          <Plus size={16} /> Nuevo cliente
        </button>
      </div>

      {/* Top 3 */}
      {topClientes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {topClientes.map((c, i) => (
            <div key={c.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-black ${
                i === 0 ? 'bg-amber-100 text-amber-600' : i === 1 ? 'bg-stone-100 text-stone-500' : 'bg-orange-50 text-orange-500'
              }`}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-stone-800 truncate">{c.nombre}</p>
                <p className="text-xs text-stone-500">{c.visitas} visita{c.visitas !== 1 ? 's' : ''} · {clpFormat(c.gasto_total)}</p>
              </div>
              <Star size={14} className="text-amber-400" />
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          className="w-full pl-9 pr-4 py-2 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-400"
          placeholder="Buscar por nombre o teléfono…"
          value={buscar}
          onChange={e => handleSearch(e.target.value)}
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-stone-400">Cargando…</div>
      ) : clientes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-stone-400 gap-2">
          <Users size={36} className="opacity-30" />
          <p>Sin clientes registrados</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-stone-400 uppercase tracking-wide border-b border-stone-100">
                <th className="px-4 py-2 text-left font-medium">Nombre</th>
                <th className="px-4 py-2 text-left font-medium">Contacto</th>
                <th className="px-4 py-2 text-center font-medium">Visitas</th>
                <th className="px-4 py-2 text-right font-medium">Gasto total</th>
                <th className="px-4 py-2 text-left font-medium">Última visita</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {clientes.map(c => (
                <tr key={c.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-stone-800 text-sm">{c.nombre}</p>
                    {c.notas && <p className="text-xs text-stone-400 truncate max-w-[180px]">{c.notas}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-500 space-y-0.5">
                    {c.telefono && <p className="flex items-center gap-1"><Phone size={11} />{c.telefono}</p>}
                    {c.email && <p className="flex items-center gap-1"><Mail size={11} />{c.email}</p>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-bold text-amber-600">{c.visitas}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-stone-700">
                    {clpFormat(c.gasto_total)}
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-400">
                    {c.ultima_visita
                      ? new Date(c.ultima_visita).toLocaleDateString('es-CL')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => openEdit(c)} className="text-stone-400 hover:text-amber-500 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button type="button" onClick={() => remove(c.id)} className="text-stone-400 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-bold text-stone-800 text-lg">
              {editing ? 'Editar cliente' : 'Nuevo cliente'}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-stone-500 mb-1 block">Nombre *</label>
                <input
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Juan Pérez"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-stone-500 mb-1 block">Teléfono</label>
                  <input
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                    value={form.telefono}
                    onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                    placeholder="+56 9..."
                  />
                </div>
                <div>
                  <label className="text-xs text-stone-500 mb-1 block">Email</label>
                  <input
                    type="email"
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="juan@..."
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-stone-500 mb-1 block">Notas</label>
                <textarea
                  rows={2}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  value={form.notas}
                  onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  placeholder="Preferencias, alergias..."
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 border border-stone-200 rounded-xl py-2 text-sm text-stone-600 hover:bg-stone-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving || !form.nombre.trim()}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-900 font-semibold rounded-xl py-2 text-sm transition-colors"
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
