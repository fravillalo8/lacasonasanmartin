import { useEffect, useState, useCallback } from 'react'
import { api } from './api/client'
import type { Comanda } from './api/client'
import { RefreshCw, Clock, UtensilsCrossed } from 'lucide-react'

function minutos(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'ahora'
  if (m === 1) return '1 min'
  return `${m} min`
}

function urgencia(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m >= 20) return 'border-red-400 bg-red-950'
  if (m >= 10) return 'border-amber-400 bg-amber-950'
  return 'border-stone-600 bg-stone-800'
}

export default function Cocina() {
  const [comandas, setComandas] = useState<Comanda[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  const reload = useCallback(async () => {
    try {
      const data = await api.comandas.cocina()
      setComandas(data)
      setLastUpdate(new Date())
    } catch {
      // silent retry
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
    const interval = setInterval(reload, 30000)
    return () => clearInterval(interval)
  }, [reload])

  return (
    <div className="min-h-screen bg-stone-900 text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
            <UtensilsCrossed size={20} className="text-stone-900" />
          </div>
          <div>
            <p className="font-bold text-lg leading-tight">Vista Cocina</p>
            <p className="text-xs text-stone-400">La Casona San Martín</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-stone-400 text-xs">
          <span>Actualizado: {lastUpdate.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          <button
            type="button"
            onClick={reload}
            className="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center hover:bg-stone-600 transition-colors"
            title="Actualizar"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-stone-400">Cargando…</div>
      ) : comandas.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-stone-500 gap-3">
          <UtensilsCrossed size={40} className="opacity-30" />
          <p className="text-lg font-medium">Sin pedidos activos</p>
          <p className="text-sm">Las nuevas comandas aparecerán aquí automáticamente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {comandas.map(c => (
            <div
              key={c.id}
              className={`rounded-2xl border-2 p-4 space-y-3 transition-colors ${urgencia(c.created_at)}`}
            >
              {/* Mesa + tiempo */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-black text-white">Mesa {c.numero_mesa}</p>
                  <p className="text-xs text-stone-400 mt-0.5">Comanda #{c.id}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-amber-400 font-semibold text-sm">
                    <Clock size={13} />
                    {minutos(c.created_at)}
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {new Date(c.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                {c.items.map(it => (
                  <div key={it.id} className="flex items-start gap-3 bg-stone-700/50 rounded-xl px-3 py-2">
                    <span className="text-2xl font-black text-amber-400 leading-none min-w-[2rem] text-center">
                      {it.cantidad}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white leading-tight">{it.nombre_producto}</p>
                      {it.notas && (
                        <p className="text-xs text-amber-300 mt-0.5">⚠ {it.notas}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Notas de comanda */}
              {c.notas && (
                <div className="bg-amber-500/20 border border-amber-500/40 rounded-lg px-3 py-2 text-xs text-amber-300">
                  📝 {c.notas}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Auto-refresh indicator */}
      <div className="fixed bottom-4 right-4 text-xs text-stone-600 flex items-center gap-1">
        <RefreshCw size={11} className="animate-spin" style={{ animationDuration: '30s' }} />
        Auto-actualiza cada 30s
      </div>
    </div>
  )
}
