import { useEffect, useState } from 'react'
import { api } from './api/client'
import type { AnulacionesData } from './api/client'
import { ShieldAlert, RefreshCw } from 'lucide-react'

function fechaHora(iso: string | null) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch { return iso }
}

const DIAS = [7, 15, 30]

export default function Anulaciones() {
  const [data, setData] = useState<AnulacionesData | null>(null)
  const [dias, setDias] = useState(7)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function reload(d = dias) {
    setLoading(true); setError('')
    try { setData(await api.panel.anulaciones(d)) }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cargar') }
    finally { setLoading(false) }
  }
  useEffect(() => { reload(dias) /* eslint-disable-next-line */ }, [dias])

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
            <ShieldAlert className="text-amber-500" size={24} /> Ojo con las anulaciones
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Anulaciones, descuentos y cortesías por persona. La fuga más silenciosa.
          </p>
        </div>
        <button
          type="button"
          onClick={() => reload()}
          className="p-2 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100"
          title="Actualizar"
        >
          <RefreshCw size={16} />
        </button>
      </header>

      <div className="flex gap-1.5">
        {DIAS.map(d => (
          <button
            key={d}
            type="button"
            onClick={() => setDias(d)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              dias === d ? 'bg-amber-500 text-stone-900' : 'bg-white border border-stone-200 text-stone-500'
            }`}
          >
            {d} días
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}
      {loading && <div className="text-stone-400 text-sm">Cargando…</div>}

      {data && !loading && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-stone-400 uppercase tracking-wide">Total</p>
              <p className="text-2xl font-bold text-stone-800 mt-1">{data.total}</p>
            </div>
            {data.por_rol.map(r => (
              <div key={r.rol} className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm">
                <p className="text-xs text-stone-400 uppercase tracking-wide capitalize">{r.rol}</p>
                <p className="text-2xl font-bold text-stone-800 mt-1">{r.cantidad}</p>
              </div>
            ))}
          </div>

          <section className="bg-white border border-stone-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100">
              <h2 className="font-bold text-stone-800">Movimientos recientes</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-stone-400 uppercase tracking-wide border-b border-stone-100">
                    <th className="px-5 py-2 font-medium">Cuándo</th>
                    <th className="px-3 py-2 font-medium">Acción</th>
                    <th className="px-3 py-2 font-medium">Quién</th>
                    <th className="px-5 py-2 font-medium">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recientes.map((l, i) => (
                    <tr key={i} className="border-b border-stone-50 last:border-0">
                      <td className="px-5 py-2.5 text-stone-500 whitespace-nowrap tabular-nums">{fechaHora(l.fecha)}</td>
                      <td className="px-3 py-2.5"><span className="text-xs font-semibold bg-red-50 text-red-600 px-2 py-0.5 rounded">{l.accion}</span></td>
                      <td className="px-3 py-2.5 text-stone-600 capitalize">{l.rol || '—'}</td>
                      <td className="px-5 py-2.5 text-stone-500">{l.detalle} {l.referencia && <span className="text-stone-300">· {l.referencia}</span>}</td>
                    </tr>
                  ))}
                  {!data.recientes.length && (
                    <tr><td colSpan={4} className="px-5 py-8 text-center text-stone-400">Sin anulaciones ni descuentos en este período 👌</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
