import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from './api/client'
import type { DashboardData, HorariosPico } from './api/client'
import {
  AlertTriangle, ChefHat, TrendingUp, TrendingDown, ShoppingCart, CheckCircle,
  Clock, Banknote, Receipt, Flame, ArrowUpRight, ArrowDownRight, Ticket, BarChart2,
} from 'lucide-react'

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
  delta,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  color: string
  sub?: string
  delta?: { pct: number; label: string }
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-stone-400 text-xs uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-stone-800 mt-1">{value}</p>
          {sub && <p className="text-stone-400 text-xs mt-0.5">{sub}</p>}
          {delta !== undefined && (
            <div className={`flex items-center gap-1 mt-1 text-xs font-semibold ${delta.pct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {delta.pct >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(delta.pct)}% {delta.label}
            </div>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}

function clpFormat(n: number) {
  return `$${n.toLocaleString('es-CL')}`
}

function deltaPct(current: number, prev: number): number {
  if (prev === 0) return current > 0 ? 100 : 0
  return Math.round(((current - prev) / prev) * 100)
}

// Mini bar chart de hora pico
function HoraPicoChart({ data }: { data: { hora: number; total: number }[] }) {
  const max = Math.max(...data.map(d => d.total), 1)
  const HORAS = ['8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23']
  const visible = data.filter(d => d.hora >= 8 && d.hora <= 23)
  if (visible.every(d => d.total === 0)) return (
    <p className="text-stone-400 text-xs text-center py-4">Sin datos de ventas aún.</p>
  )
  return (
    <div className="flex items-end gap-0.5 h-16 px-1">
      {visible.map(d => {
        const pct = (d.total / max) * 100
        const isPeak = d.total === max && d.total > 0
        return (
          <div key={d.hora} className="flex-1 flex flex-col items-center gap-0.5" title={`${d.hora}h: ${d.total} ventas`}>
            <div
              className={`w-full rounded-t transition-all ${isPeak ? 'bg-amber-500' : 'bg-stone-200'}`}
              style={{ height: `${Math.max(pct, 4)}%` }}
            />
            {([8, 12, 14, 18, 22] as number[]).includes(d.hora) && (
              <span className="text-[9px] text-stone-400">{d.hora}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [pico, setPico] = useState<HorariosPico | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.reportes.dashboard(),
      api.reportes.horariosPico(30).catch(() => null),
    ])
      .then(([d, p]) => { setData(d); setPico(p) })
      .catch(() => setError('Error cargando datos'))
      .finally(() => setLoading(false))
  }, [])

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-stone-400">
        Cargando…
      </div>
    )
  if (error || !data)
    return <p className="text-red-500 p-6">{error || 'Sin datos'}</p>

  const delta7d = deltaPct(data.ventas_7d ?? 0, data.ventas_7d_prev ?? 0)

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">Dashboard</h1>

      {/* Alerta de stock */}
      {data.alertas_stock > 0 && (
        <Link
          to="/mesa-central/ingredientes"
          className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm hover:bg-red-100 transition-colors"
        >
          <AlertTriangle size={18} />
          <span>
            <strong>{data.alertas_stock} ingrediente{data.alertas_stock > 1 ? 's' : ''}</strong> con
            stock bajo el mínimo. Click para ver.
          </span>
        </Link>
      )}

      {/* KPIs — ventas del día */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Ventas hoy"
          value={clpFormat(data.ventas_hoy)}
          icon={Banknote}
          color="bg-emerald-100 text-emerald-600"
          sub={`${data.num_ventas_hoy} mesa${data.num_ventas_hoy !== 1 ? 's' : ''} cobrada${data.num_ventas_hoy !== 1 ? 's' : ''}`}
        />
        <StatCard
          label="Ticket promedio"
          value={data.ticket_promedio_hoy ? clpFormat(data.ticket_promedio_hoy) : '—'}
          icon={Ticket}
          color="bg-sky-100 text-sky-600"
          sub="Por comanda de hoy"
        />
        <StatCard
          label="Ventas del mes"
          value={clpFormat(data.ventas_mes)}
          icon={Receipt}
          color="bg-violet-100 text-violet-600"
          sub={`${data.num_ventas_mes} cobro${data.num_ventas_mes !== 1 ? 's' : ''}`}
        />
        <StatCard
          label="Alertas stock"
          value={data.alertas_stock}
          icon={AlertTriangle}
          color={data.alertas_stock > 0 ? 'bg-red-100 text-red-600' : 'bg-stone-100 text-stone-400'}
        />
      </div>

      {/* KPIs — comparativa semanal + inventario */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Últimos 7 días"
          value={clpFormat(data.ventas_7d ?? 0)}
          icon={delta7d >= 0 ? TrendingUp : TrendingDown}
          color={delta7d >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}
          delta={data.ventas_7d_prev != null ? { pct: delta7d, label: 'vs semana ant.' } : undefined}
        />
        <StatCard
          label="Compras del mes"
          value={clpFormat(data.compras_mes)}
          icon={ShoppingCart}
          color="bg-blue-100 text-blue-600"
          sub={`${data.num_compras_mes} factura${data.num_compras_mes !== 1 ? 's' : ''}`}
        />
        <StatCard
          label="Valor inventario"
          value={clpFormat(data.valor_inventario)}
          icon={TrendingUp}
          color="bg-amber-100 text-amber-600"
        />
        <StatCard
          label="Recetas activas"
          value={data.total_recetas}
          icon={ChefHat}
          color="bg-orange-100 text-orange-600"
        />
      </div>

      {/* Hora pico */}
      {pico && (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-stone-100">
            <BarChart2 size={16} className="text-sky-500" />
            <h2 className="font-semibold text-stone-700">Hora pico (últimos 30 días)</h2>
            <span className="ml-auto text-xs text-stone-400">
              Pico: {pico.por_hora.reduce((a, b) => b.total > a.total ? b : a, pico.por_hora[0])?.hora ?? 0}h
            </span>
          </div>
          <div className="px-4 pb-4 pt-3">
            <HoraPicoChart data={pico.por_hora} />
          </div>
          {/* Por día de la semana */}
          <div className="flex gap-1 px-4 pb-4">
            {pico.por_dia.map(d => {
              const maxDia = Math.max(...pico.por_dia.map(x => x.total), 1)
              const isPeak = d.total === maxDia && d.total > 0
              return (
                <div key={d.dia} className="flex-1 text-center" title={`${d.dia}: ${d.total} ventas`}>
                  <div className={`text-xs font-bold ${isPeak ? 'text-amber-600' : 'text-stone-400'}`}>
                    {d.dia}
                  </div>
                  <div className={`text-xs ${isPeak ? 'text-amber-700 font-semibold' : 'text-stone-400'}`}>
                    {d.total}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Top platos de hoy */}
      {data.top_hoy && data.top_hoy.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-stone-100">
            <Flame size={16} className="text-amber-500" />
            <h2 className="font-semibold text-stone-700">Más pedidos hoy</h2>
          </div>
          <div className="divide-y divide-stone-50">
            {data.top_hoy.map((p, i) => {
              const max = data.top_hoy[0].cantidad
              return (
                <div key={p.nombre} className="flex items-center gap-3 px-5 py-3">
                  <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-stone-200 text-stone-600' : 'bg-orange-50 text-orange-500'
                  }`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-700 truncate">{p.nombre}</p>
                    <div className="mt-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-1.5 bg-amber-400 rounded-full" style={{ width: `${(p.cantidad / max) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-stone-700 shrink-0">{p.cantidad}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Últimas compras */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-700">Últimas compras</h2>
          <Link to="/mesa-central/compras" className="text-amber-600 text-sm hover:underline">
            Ver todas →
          </Link>
        </div>
        {data.ultimas_compras.length === 0 ? (
          <p className="text-stone-400 text-sm px-5 py-6 text-center">
            No hay compras registradas aún.
          </p>
        ) : (
          <ul className="divide-y divide-stone-50">
            {data.ultimas_compras.map(c => (
              <li key={c.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  {c.verificado_sii ? (
                    <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                  ) : (
                    <Clock size={16} className="text-stone-300 shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-stone-700">{c.nombre_proveedor}</p>
                    <p className="text-xs text-stone-400">{c.fecha}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-stone-700">
                  {clpFormat(c.monto_total)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
