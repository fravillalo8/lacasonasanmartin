import { useEffect, useState } from 'react'
import { api } from './api/client'
import type { Reserva, ReservaIn } from './api/client'
import { CalendarDays, Plus, Pencil, Trash2, Users, Phone, Clock } from 'lucide-react'

const ESTADOS = ['pendiente', 'confirmada', 'cancelada', 'completada']
const ESTADO_COLOR: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  confirmada: 'bg-emerald-100 text-emerald-700',
  cancelada: 'bg-red-100 text-red-700',
  completada: 'bg-stone-100 text-stone-500',
}

function toLocalISOString(dt: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
}

const empty = (): ReservaIn => ({
  fecha: toLocalISOString(new Date()),
  cliente_nombre: '',
  cliente_telefono: '',
  num_personas: 2,
  mesa_id: null,
  estado: 'pendiente',
  notas: '',
})

export default function Reservas() {
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Reserva | null>(null)
  const [form, setForm] = useState<ReservaIn>(empty())
  const [saving, setSaving] = useState(false)

  async function reload() {
    setLoading(true)
    try {
      setReservas(await api.reservas.list())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [])

  function openNew() {
    setEditing(null)
    setForm(empty())
    setShowForm(true)
  }

  function openEdit(r: Reserva) {
    setEditing(r)
    setForm({
      fecha: r.fecha.slice(0, 16),
      cliente_nombre: r.cliente_nombre,
      cliente_telefono: r.cliente_telefono,
      num_personas: r.num_personas,
      mesa_id: r.mesa_id,
      estado: r.estado,
      notas: r.notas,
    })
    setShowForm(true)
  }

  async function save() {
    if (!form.cliente_nombre.trim()) return
    setSaving(true)
    try {
      if (editing) {
        await api.reservas.update(editing.id, form)
      } else {
        await api.reservas.create(form)
      }
      setShowForm(false)
      await reload()
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: number) {
    if (!confirm('¿Eliminar reserva?')) return
    await api.reservas.delete(id)
    await reload()
  }

  // Group by date
  const grouped: Record<string, Reserva[]> = {}
  for (const r of reservas) {
    const key = r.fecha.slice(0, 10)
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(r)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">Reservas</h1>
        <button
          type="button"
          onClick={openNew}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-900 font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
        >
          <Plus size={16} /> Nueva reserva
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-stone-400">Cargando…</div>
      ) : reservas.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-stone-400 gap-2">
          <CalendarDays size={36} className="opacity-30" />
          <p>Sin reservas registradas</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).sort().map(([fecha, list]) => (
            <div key={fecha}>
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays size={15} className="text-amber-500" />
                <h2 className="font-semibold text-stone-700 text-sm">
                  {new Date(fecha + 'T12:00').toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </h2>
                <span className="text-xs text-stone-400">({list.length} reserva{list.length !== 1 ? 's' : ''})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {list.map(r => (
                  <div key={r.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-stone-800">{r.cliente_nombre}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="flex items-center gap-1 text-xs text-stone-500">
                            <Clock size={12} />
                            {new Date(r.fecha).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-stone-500">
                            <Users size={12} /> {r.num_personas} personas
                          </span>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_COLOR[r.estado] ?? 'bg-stone-100 text-stone-600'}`}>
                        {r.estado}
                      </span>
                    </div>
                    {r.cliente_telefono && (
                      <p className="flex items-center gap-1 text-xs text-stone-500">
                        <Phone size={12} /> {r.cliente_telefono}
                      </p>
                    )}
                    {r.notas && <p className="text-xs text-stone-400 italic">{r.notas}</p>}
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        className="flex items-center gap-1 text-xs text-stone-500 hover:text-amber-600 transition-colors"
                      >
                        <Pencil size={12} /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(r.id)}
                        className="flex items-center gap-1 text-xs text-stone-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={12} /> Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-bold text-stone-800 text-lg">
              {editing ? 'Editar reserva' : 'Nueva reserva'}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-stone-500 mb-1 block">Nombre del cliente *</label>
                <input
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                  value={form.cliente_nombre}
                  onChange={e => setForm(f => ({ ...f, cliente_nombre: e.target.value }))}
                  placeholder="Juan Pérez"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-stone-500 mb-1 block">Teléfono</label>
                  <input
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                    value={form.cliente_telefono}
                    onChange={e => setForm(f => ({ ...f, cliente_telefono: e.target.value }))}
                    placeholder="+56 9..."
                  />
                </div>
                <div>
                  <label className="text-xs text-stone-500 mb-1 block">Personas</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                    value={form.num_personas}
                    onChange={e => setForm(f => ({ ...f, num_personas: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-stone-500 mb-1 block">Fecha y hora</label>
                <input
                  type="datetime-local"
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                  value={form.fecha}
                  onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-stone-500 mb-1 block">Estado</label>
                <select
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                  value={form.estado}
                  onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}
                >
                  {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-stone-500 mb-1 block">Notas</label>
                <textarea
                  rows={2}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  value={form.notas}
                  onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  placeholder="Cumpleaños, preferencias, alérgenos..."
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
                disabled={saving || !form.cliente_nombre.trim()}
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
