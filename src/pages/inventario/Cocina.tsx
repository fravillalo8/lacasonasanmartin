import { useEffect, useState, useCallback, useRef } from 'react'
import { api } from './api/client'
import type { Comanda } from './api/client'
import { RefreshCw, Clock, UtensilsCrossed, CheckCircle2, CheckCheck, History, ChevronDown, ChevronUp } from 'lucide-react'

function minutos(iso: string): string {
  const diff = Date.now() - new Date(iso + 'Z').getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'ahora'
  if (m === 1) return '1 min'
  return `${m} min`
}

// Verde < 10 min · Amarillo 10-20 min · Rojo >= 20 min
function urgencia(iso: string): { card: string; badge: string; mins: number } {
  const mins = Math.floor((Date.now() - new Date(iso + 'Z').getTime()) / 60000)
  if (mins >= 20) return { card: 'border-red-400 bg-red-950',    badge: 'bg-red-500 text-white',    mins }
  if (mins >= 10) return { card: 'border-amber-400 bg-amber-950', badge: 'bg-amber-500 text-stone-900', mins }
  return              { card: 'border-emerald-400 bg-emerald-950', badge: 'bg-emerald-500 text-white', mins }
}

function playBeep() {
  try {
    const ctx = new AudioContext()
    const notas = [660, 880, 660]
    notas.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      const t = ctx.currentTime + i * 0.18
      gain.gain.setValueAtTime(0.45, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
      osc.start(t)
      osc.stop(t + 0.22)
    })
  } catch { }
}

function clpFormat(n: number) {
  return `$${n.toLocaleString('es-CL')}`
}

// ─── Tarjeta de comanda (usada tanto en activo como en historial) ───────────
function ComandaCard({
  c,
  compact = false,
  onToggle,
  onTodoListo,
  toggling,
  todoing,
}: {
  c: Comanda
  compact?: boolean
  onToggle?: (comanda_id: number, item_id: number) => void
  onTodoListo?: (comanda_id: number) => void
  toggling: number | null
  todoing: number | null
}) {
  const { card, badge, mins } = urgencia(c.created_at)

  if (compact) {
    // Vista reducida para "listos esperando mozo" o historial cerradas
    const cerrada = c.estado === 'cerrada'
    return (
      <div className={`rounded-xl border px-3 py-2 flex items-center gap-3 ${cerrada ? 'border-stone-600 bg-stone-800/60' : 'border-emerald-600 bg-emerald-900/40'}`}>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">
            {c.tipo === 'delivery' ? `🛍 ${c.cliente_nombre || 'Para llevar'}` : `Mesa ${c.numero_mesa}`}
          </p>
          <p className="text-xs text-stone-400">
            {c.numero_ticket ? `#${c.numero_ticket}` : `Comanda #${c.id}`}
            {' · '}
            {c.items.length} ítem{c.items.length !== 1 ? 's' : ''}
            {' · '}
            {clpFormat(c.total)}
          </p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cerrada ? 'bg-stone-600 text-stone-300' : 'bg-emerald-600 text-white'}`}>
          {cerrada ? 'Cobrada' : `${mins} min`}
        </span>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl border-2 p-4 space-y-3 transition-colors ${card}`}>
      {/* Mesa + tiempo */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-black text-white">
            {c.tipo === 'delivery' ? `🛍 ${c.cliente_nombre || 'Para llevar'}` : `Mesa ${c.numero_mesa}`}
          </p>
          <p className="text-xs text-stone-400 mt-0.5">
            {c.numero_ticket ? `Ticket #${c.numero_ticket}` : `Comanda #${c.id}`}
          </p>
        </div>
        <div className="text-right">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${badge}`}>
            <Clock size={11} />
            {minutos(c.created_at)}
          </span>
          <p className="text-xs text-stone-500 mt-0.5">
            {new Date(c.created_at + 'Z').toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {c.items.map(it => (
          <div
            key={it.id}
            className={`flex items-start gap-3 rounded-xl px-3 py-2 transition-colors ${
              it.listo ? 'bg-emerald-900/40 border border-emerald-700/50' : 'bg-stone-700/50'
            }`}
          >
            <span className={`text-2xl font-black leading-none min-w-[2rem] text-center ${it.listo ? 'text-emerald-400' : 'text-amber-400'}`}>
              {it.cantidad}
            </span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold leading-tight ${it.listo ? 'line-through text-stone-400' : 'text-white'}`}>
                {it.nombre_producto}
              </p>
              {it.notas && (
                <p className="text-xs text-amber-300 mt-0.5">⚠ {it.notas}</p>
              )}
            </div>
            {onToggle && (
              <button
                type="button"
                onClick={() => onToggle(c.id, it.id)}
                disabled={toggling === it.id}
                className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                  it.listo
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-stone-600 hover:bg-emerald-600 text-stone-300 hover:text-white'
                }`}
                title={it.listo ? 'Desmarcar' : 'Marcar listo'}
              >
                <CheckCircle2 size={15} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Progreso + Todo listo */}
      {c.items.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-stone-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${(c.items.filter(i => i.listo).length / c.items.length) * 100}%` }}  // eslint-disable-line
              />
            </div>
            <span className="text-xs text-stone-400 shrink-0">
              {c.items.filter(i => i.listo).length}/{c.items.length}
            </span>
          </div>
          {onTodoListo && (
            <button
              type="button"
              onClick={() => onTodoListo(c.id)}
              disabled={todoing === c.id}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2 rounded-xl text-sm transition-colors"
            >
              <CheckCheck size={15} />
              {todoing === c.id ? 'Marcando…' : '✓ Todo listo'}
            </button>
          )}
        </div>
      )}

      {/* Notas de comanda */}
      {c.notas && (
        <div className="bg-amber-500/20 border border-amber-500/40 rounded-lg px-3 py-2 text-xs text-amber-300">
          📝 {c.notas}
        </div>
      )}
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────
export default function Cocina() {
  const [comandas, setComandas] = useState<Comanda[]>([])
  const [historial, setHistorial] = useState<Comanda[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchErr, setFetchErr] = useState('')
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [toggling, setToggling] = useState<number | null>(null)
  const [todoing, setTodoing] = useState<number | null>(null)
  const [showHistorial, setShowHistorial] = useState(false)
  const prevIdsRef = useRef<Set<number>>(new Set())

  const reload = useCallback(async () => {
    try {
      const [data, hist] = await Promise.all([
        api.comandas.cocina(),
        api.comandas.historialCocina(),
      ])
      const newIds = new Set(data.map(c => c.id))
      if (prevIdsRef.current.size > 0 && data.some(c => !prevIdsRef.current.has(c.id))) {
        playBeep()
      }
      prevIdsRef.current = newIds
      setComandas(data)
      setHistorial(hist)
      setLastUpdate(new Date())
      setFetchErr('')
    } catch (e: unknown) {
      setFetchErr(e instanceof Error ? e.message : 'Error al conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }, [])

  async function todoListo(comanda_id: number) {
    setTodoing(comanda_id)
    try {
      const updated = await api.comandas.todoListo(comanda_id)
      setComandas(prev => prev.map(c => c.id === comanda_id ? updated : c))
    } catch {
      // silent
    } finally {
      setTodoing(null)
    }
  }

  async function toggleListo(comanda_id: number, item_id: number) {
    setToggling(item_id)
    try {
      const updated = await api.comandas.toggleListo(comanda_id, item_id)
      setComandas(prev => prev.map(c => c.id === comanda_id ? updated : c))
    } catch {
      // silent
    } finally {
      setToggling(null)
    }
  }

  useEffect(() => {
    reload()
    const interval = setInterval(reload, 10000)
    return () => clearInterval(interval)
  }, [reload])

  // Separar en queue activo vs listos esperando mozo
  const enCocina = comandas.filter(c => !c.lista_para_servir)
  const esperandoMozo = comandas.filter(c => c.lista_para_servir)

  // Historial: comandas cerradas de hoy (las abiertas ya están en las listas de arriba)
  const historialHoy = historial.filter(c => c.estado === 'cerrada')

  return (
    <div className="min-h-screen bg-stone-900 text-white p-4 pb-16">
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
          {/* Leyenda de colores */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>&lt;10 min</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ml-2" />
            <span>10-20 min</span>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 ml-2" />
            <span>&gt;20 min</span>
          </div>
          <span>
            {lastUpdate.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
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

      {fetchErr && (
        <div className="mb-4 rounded-xl bg-red-900/60 border border-red-500/50 px-4 py-3 text-sm text-red-300 flex items-center gap-2">
          <span className="font-bold">Error:</span> {fetchErr}
          <button type="button" onClick={reload} className="ml-auto underline text-red-200 text-xs">Reintentar</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48 text-stone-400">Cargando…</div>
      ) : (
        <>
          {/* ── Queue activo: en preparación ── */}
          {enCocina.length === 0 && esperandoMozo.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-stone-500 gap-3">
              <UtensilsCrossed size={40} className="opacity-30" />
              <p className="text-lg font-medium">Sin pedidos activos</p>
              <p className="text-sm">Las nuevas comandas aparecerán aquí automáticamente.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {enCocina.map(c => (
                <ComandaCard
                  key={c.id}
                  c={c}
                  onToggle={toggleListo}
                  onTodoListo={todoListo}
                  toggling={toggling}
                  todoing={todoing}
                />
              ))}
            </div>
          )}

          {/* ── Listos — esperando mozo ── */}
          {esperandoMozo.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <CheckCheck size={14} />
                Listos — esperando mozo ({esperandoMozo.length})
              </p>
              <div className="space-y-2">
                {esperandoMozo.map(c => (
                  <ComandaCard
                    key={c.id}
                    c={c}
                    compact
                    toggling={toggling}
                    todoing={todoing}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Historial del día ── */}
          {historialHoy.length > 0 && (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowHistorial(v => !v)}
                className="flex items-center gap-2 text-xs font-bold text-stone-400 hover:text-stone-200 uppercase tracking-widest mb-3 transition-colors"
              >
                <History size={14} />
                Historial hoy ({historialHoy.length} cobradas)
                {showHistorial ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
              {showHistorial && (
                <div className="space-y-2">
                  {historialHoy.map(c => (
                    <ComandaCard
                      key={c.id}
                      c={c}
                      compact
                      toggling={null}
                      todoing={null}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Auto-refresh indicator */}
      <div className="fixed bottom-4 right-4 text-xs text-stone-600 flex items-center gap-1">
        <RefreshCw size={11} className="animate-spin" style={{ animationDuration: '10s' }} />
        Auto-actualiza cada 10s
      </div>
    </div>
  )
}
