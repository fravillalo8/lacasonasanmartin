import { useEffect, useState } from 'react'
import { api } from './api/client'
import type { CoachData, SostenibilidadData } from './api/client'
import { Sparkles, TrendingUp, TrendingDown, Leaf, RefreshCw, Zap } from 'lucide-react'

function clp(n: number) { return `$${Math.round(n || 0).toLocaleString('es-CL')}` }

function fechaLarga(iso: string) {
  try {
    const d = new Date(iso + 'T12:00:00')
    return d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
  } catch { return iso }
}

export default function Coach() {
  const [data, setData] = useState<CoachData | null>(null)
  const [sost, setSost] = useState<SostenibilidadData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function reload() {
    setLoading(true); setError('')
    try {
      const [c, s] = await Promise.all([api.panel.coach(), api.panel.sostenibilidad(30)])
      setData(c); setSost(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el coach')
    } finally { setLoading(false) }
  }
  useEffect(() => { reload() }, [])

  if (loading) return <div className="p-6 text-stone-400 text-sm">Cargando el coach del día…</div>

  const r = data?.resumen
  const sube = (r?.variacion_pct ?? 0) >= 0

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
            <Sparkles className="text-amber-500" size={24} /> Coach del día
          </h1>
          <p className="text-sm text-stone-500 capitalize mt-0.5">
            {data ? fechaLarga(data.fecha) : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              data?.disponible_ia ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {data?.disponible_ia ? '● IA activa' : '○ IA apagada'}
          </span>
          <button
            type="button"
            onClick={reload}
            className="p-2 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100"
            title="Actualizar"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      {/* Resumen del día */}
      {r && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-stone-400 uppercase tracking-wide">Ventas hoy</p>
            <p className="text-2xl font-bold text-stone-800 mt-1">{clp(r.ventas_hoy)}</p>
            <p className="text-xs text-stone-400 mt-0.5">{r.num_ventas_hoy} ventas</p>
          </div>
          <div className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-stone-400 uppercase tracking-wide">vs ayer</p>
            <p className={`text-2xl font-bold mt-1 flex items-center gap-1 ${sube ? 'text-emerald-600' : 'text-red-500'}`}>
              {sube ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
              {r.variacion_pct === null ? '—' : `${r.variacion_pct > 0 ? '+' : ''}${r.variacion_pct}%`}
            </p>
            <p className="text-xs text-stone-400 mt-0.5">ayer {clp(r.ventas_ayer)}</p>
          </div>
          <div className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-stone-400 uppercase tracking-wide">Ticket prom.</p>
            <p className="text-2xl font-bold text-stone-800 mt-1">{clp(r.ticket_promedio)}</p>
          </div>
        </div>
      )}

      {/* Acciones del día */}
      <section className="bg-white border border-stone-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="font-bold text-stone-800">Qué hacer hoy</h2>
          {r?.texto && <p className="text-sm text-stone-500 mt-0.5">{r.texto}</p>}
        </div>
        <ul className="divide-y divide-stone-100">
          {data?.acciones.map((a, i) => (
            <li key={i} className="flex gap-3 px-5 py-4">
              <span className="text-xl leading-6 shrink-0">{a.icono}</span>
              <p className="text-sm text-stone-700 leading-relaxed">{a.texto}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Comé sin culpa (sostenibilidad) */}
      {sost && (
        <section className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
          <h2 className="font-bold text-emerald-800 flex items-center gap-2">
            <Leaf size={18} /> Comé sin culpa · últimos {sost.dias} días
          </h2>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div>
              <p className="text-2xl font-bold text-emerald-700">{clp(sost.costo_total)}</p>
              <p className="text-xs text-emerald-700/70">botado en merma</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-700">{sost.kg_estimados} kg</p>
              <p className="text-xs text-emerald-700/70">de comida perdida</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-700">{sost.co2e_kg} kg</p>
              <p className="text-xs text-emerald-700/70">CO₂e estimado</p>
            </div>
          </div>
          <p className="text-xs text-emerald-700/70 mt-3">
            Bajar la merma es plata directa y menos huella. Registra las mermas para que el coach te sugiera
            combos con lo que va a vencer.
          </p>
        </section>
      )}

      {!data?.disponible_ia && (
        <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-sm text-amber-800">
          <Zap size={18} className="shrink-0 mt-0.5" />
          <p>
            El coach está funcionando con reglas. Para consejos redactados por IA (más finos y personalizados),
            configura la variable <code className="font-mono bg-amber-100 px-1 rounded">ANTHROPIC_API_KEY</code> en
            el backend (Railway).
          </p>
        </div>
      )}
    </div>
  )
}
