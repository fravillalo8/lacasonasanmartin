import { useEffect, useState } from 'react'
import { api } from './api/client'
import type { MargenVivoData, PlatoMargen, ClasePlato } from './api/client'
import { TrendingUp, RefreshCw } from 'lucide-react'

function clp(n: number) { return `$${Math.round(n || 0).toLocaleString('es-CL')}` }

const CLASE: Record<ClasePlato, { label: string; chip: string; bar: string }> = {
  estrella: { label: '⭐ Estrella', chip: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' },
  caballo: { label: '🐴 Caballo', chip: 'bg-amber-100 text-amber-700', bar: 'bg-amber-500' },
  dilema: { label: '🧩 Dilema', chip: 'bg-violet-100 text-violet-700', bar: 'bg-violet-500' },
  perro: { label: '🐶 Perro', chip: 'bg-red-100 text-red-700', bar: 'bg-red-500' },
  sin_receta: { label: 'Sin receta', chip: 'bg-stone-100 text-stone-500', bar: 'bg-stone-300' },
}

function barColor(fc: number | null) {
  if (fc === null) return 'bg-stone-300'
  if (fc <= 33) return 'bg-emerald-500'
  if (fc <= 42) return 'bg-amber-500'
  return 'bg-red-500'
}

function Plato({ p }: { p: PlatoMargen }) {
  const cls = CLASE[p.clasificacion] ?? CLASE.sin_receta
  return (
    <div className="py-4 border-b border-stone-100 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-stone-800">{p.nombre}</p>
          <p className="text-xs text-stone-400">{p.vendidos} vendidos · últimos 30 días</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${cls.chip}`}>
          {cls.label}
        </span>
      </div>

      {p.sin_receta ? (
        <p className="text-xs text-stone-400 mt-2">
          Precio {clp(p.precio)} · agrega la receta para ver cuánto ganas en este plato.
        </p>
      ) : (
        <>
          <div className="flex gap-4 text-sm mt-2">
            <span className="text-stone-500">Precio <b className="text-stone-800">{clp(p.precio)}</b></span>
            <span className="text-stone-500">Costo <b className="text-stone-800">{clp(p.costo || 0)}</b></span>
            <span className="text-stone-500">
              Ganas <b className={p.clasificacion === 'perro' ? 'text-red-500' : 'text-emerald-600'}>{clp(p.margen || 0)}</b>
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-stone-100 overflow-hidden">
              <div
                className={`h-full rounded-full ${barColor(p.food_cost_pct)}`}
                style={{ width: `${Math.min(p.food_cost_pct || 0, 100)}%` }}
              />
            </div>
            <span className="text-xs text-stone-400 tabular-nums w-14 text-right">FC {p.food_cost_pct}%</span>
          </div>
        </>
      )}
    </div>
  )
}

export default function MargenVivo() {
  const [data, setData] = useState<MargenVivoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function reload() {
    setLoading(true); setError('')
    try { setData(await api.panel.margenVivo(30)) }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cargar') }
    finally { setLoading(false) }
  }
  useEffect(() => { reload() }, [])

  if (loading) return <div className="p-6 text-stone-400 text-sm">Calculando el margen de cada plato…</div>

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
            <TrendingUp className="text-amber-500" size={24} /> Margen Vivo
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">Cuánto ganas en cada plato, con los costos de hoy.</p>
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

      {data && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-stone-400 uppercase tracking-wide">Food cost prom.</p>
            <p className="text-2xl font-bold text-stone-800 mt-1">
              {data.resumen.food_cost_promedio ?? '—'}{data.resumen.food_cost_promedio !== null ? '%' : ''}
            </p>
          </div>
          <div className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-stone-400 uppercase tracking-wide">Platos</p>
            <p className="text-2xl font-bold text-stone-800 mt-1">{data.resumen.total}</p>
          </div>
          <div className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-stone-400 uppercase tracking-wide">Sin receta</p>
            <p className="text-2xl font-bold text-amber-500 mt-1">{data.resumen.sin_receta}</p>
          </div>
        </div>
      )}

      <section className="bg-white border border-stone-100 rounded-2xl shadow-sm px-5 py-2">
        {data?.platos.length
          ? data.platos.map(p => <Plato key={p.id} p={p} />)
          : <p className="text-sm text-stone-400 py-6 text-center">Aún no hay platos con datos.</p>}
      </section>

      <div className="text-xs text-stone-400 flex flex-wrap gap-x-4 gap-y-1">
        <span>⭐ Estrella: se vende y deja</span>
        <span>🐴 Caballo: mucha venta, poco margen</span>
        <span>🧩 Dilema: deja pero se pide poco</span>
        <span>🐶 Perro: ni se vende ni deja</span>
      </div>
    </div>
  )
}
