import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from './api/client'
import type { DashboardData } from './api/client'
import { AlertTriangle, ChefHat, TrendingUp, ShoppingCart, CheckCircle, Clock, Banknote, Receipt } from 'lucide-react'

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  color: string
  sub?: string
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-stone-400 text-xs uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-stone-800 mt-1">{value}</p>
          {sub && <p className="text-stone-400 text-xs mt-0.5">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}

function clpFormat(n: number) {
  return `$${n.toLocaleString('es-CL')}`
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.reportes
      .dashboard()
      .then(setData)
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

      {/* KPIs — ventas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Ventas hoy"
          value={clpFormat(data.ventas_hoy)}
          icon={Banknote}
          color="bg-emerald-100 text-emerald-600"
          sub={`${data.num_ventas_hoy} mesa${data.num_ventas_hoy !== 1 ? 's' : ''} cobrada${data.num_ventas_hoy !== 1 ? 's' : ''}`}
        />
        <StatCard
          label="Ventas del mes"
          value={clpFormat(data.ventas_mes)}
          icon={Receipt}
          color="bg-violet-100 text-violet-600"
          sub={`${data.num_ventas_mes} cobro${data.num_ventas_mes !== 1 ? 's' : ''}`}
        />
        <StatCard
          label="Compras del mes"
          value={clpFormat(data.compras_mes)}
          icon={ShoppingCart}
          color="bg-blue-100 text-blue-600"
          sub={`${data.num_compras_mes} factura${data.num_compras_mes !== 1 ? 's' : ''}`}
        />
        <StatCard
          label="Alertas stock"
          value={data.alertas_stock}
          icon={AlertTriangle}
          color={data.alertas_stock > 0 ? 'bg-red-100 text-red-600' : 'bg-stone-100 text-stone-400'}
        />
      </div>

      {/* KPIs — inventario */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
