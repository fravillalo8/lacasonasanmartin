import { useEffect, useState } from 'react'
import { api } from './api/client'
import type { ClientesDormidosData, FidelizacionData, ClienteDormido } from './api/client'
import { Heart, MessageCircle, Star, RefreshCw } from 'lucide-react'

function clp(n: number) { return `$${Math.round(n || 0).toLocaleString('es-CL')}` }

function waLink(telefono: string, texto: string) {
  let d = (telefono || '').replace(/\D/g, '')
  if (!d) return ''
  if (d.length === 9 && d.startsWith('9')) d = '56' + d       // 9 XXXX XXXX → +56
  else if (d.length === 8) d = '569' + d
  return `https://wa.me/${d}?text=${encodeURIComponent(texto)}`
}

function Dormido({ c }: { c: ClienteDormido }) {
  const [loading, setLoading] = useState(false)

  async function extrañar() {
    setLoading(true)
    try {
      const res = await api.panel.winbackMensaje({
        nombre: c.nombre, dias_sin_venir: c.dias_sin_venir ?? undefined, gasto_total: c.gasto_total,
      })
      const link = waLink(c.telefono, res.mensaje)
      if (link) window.open(link, '_blank')
      else window.prompt('Copia el mensaje (este cliente no tiene teléfono):', res.mensaje)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo generar el mensaje')
    } finally { setLoading(false) }
  }

  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-stone-100 last:border-0">
      <div className="min-w-0">
        <p className="font-semibold text-stone-800 truncate">{c.nombre}</p>
        <p className="text-xs text-stone-400">
          {c.dias_sin_venir ?? '?'} días sin venir · {c.visitas} visitas · {clp(c.gasto_total)}
        </p>
      </div>
      <button
        type="button"
        onClick={extrañar}
        disabled={loading}
        className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold px-3 py-2 rounded-xl text-sm whitespace-nowrap"
      >
        <MessageCircle size={15} /> {loading ? 'Generando…' : 'Te extrañamos'}
      </button>
    </div>
  )
}

export default function Fidelizacion() {
  const [dorm, setDorm] = useState<ClientesDormidosData | null>(null)
  const [fid, setFid] = useState<FidelizacionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function reload() {
    setLoading(true); setError('')
    try {
      const [d, f] = await Promise.all([api.panel.clientesDormidos(30), api.panel.fidelizacion()])
      setDorm(d); setFid(f)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar')
    } finally { setLoading(false) }
  }
  useEffect(() => { reload() }, [])

  if (loading) return <div className="p-6 text-stone-400 text-sm">Cargando fidelización…</div>

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
            <Heart className="text-amber-500" size={24} /> Fidelización
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">Recupera a los que no vuelven y premia a los de siempre.</p>
        </div>
        <button
          type="button"
          onClick={reload}
          className="p-2 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100"
          title="Actualizar"
        >
          <RefreshCw size={16} />
        </button>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      {/* Te extrañamos */}
      <section className="bg-white border border-stone-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="font-bold text-stone-800">Te extrañamos</h2>
          <span className="text-xs text-stone-400">{dorm?.total ?? 0} sin venir hace +30 días</span>
        </div>
        <div className="px-5 py-2">
          {dorm?.clientes.length
            ? dorm.clientes.map(c => <Dormido key={c.id} c={c} />)
            : <p className="text-sm text-stone-400 py-6 text-center">Nadie dormido: todos tus frecuentes vienen seguido 🎉</p>}
        </div>
      </section>

      {/* Puntos que vuelven */}
      <section className="bg-white border border-stone-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="font-bold text-stone-800 flex items-center gap-2">
            <Star size={16} className="text-amber-500" /> Puntos que vuelven
          </h2>
          <span className="text-xs text-stone-400">{fid?.regla}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-stone-400 uppercase tracking-wide border-b border-stone-100">
                <th className="px-5 py-2 font-medium">Cliente</th>
                <th className="px-3 py-2 font-medium text-right">Visitas</th>
                <th className="px-3 py-2 font-medium text-right">Gastado</th>
                <th className="px-5 py-2 font-medium text-right">Puntos</th>
              </tr>
            </thead>
            <tbody>
              {fid?.clientes.map(c => (
                <tr key={c.id} className="border-b border-stone-50 last:border-0">
                  <td className="px-5 py-2.5 font-medium text-stone-700">{c.nombre}</td>
                  <td className="px-3 py-2.5 text-right text-stone-500 tabular-nums">{c.visitas}</td>
                  <td className="px-3 py-2.5 text-right text-stone-500 tabular-nums">{clp(c.gasto_total)}</td>
                  <td className="px-5 py-2.5 text-right font-bold text-amber-600 tabular-nums">{c.puntos}</td>
                </tr>
              ))}
              {!fid?.clientes.length && (
                <tr><td colSpan={4} className="px-5 py-6 text-center text-stone-400">Aún no hay clientes registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
