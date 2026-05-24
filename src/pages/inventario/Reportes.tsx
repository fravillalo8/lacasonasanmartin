import { useEffect, useState } from 'react'
import { api } from './api/client'
import type { CostoReceta, Movimiento, ComprasMes, TopProducto, HorariosPico, PYLMes } from './api/client'

function clp(n: number) {
  return `$${Math.round(n).toLocaleString('es-CL')}`
}

function MargenBar({ pct }: { pct: number }) {
  const color = pct >= 60 ? 'bg-emerald-400' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-stone-100 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs w-10 text-right font-medium">{pct}%</span>
    </div>
  )
}

type Tab = 'costos' | 'movimientos' | 'compras' | 'top' | 'horarios' | 'pyl'

const TABS: [Tab, string][] = [
  ['costos', 'Márgenes'],
  ['top', 'Top ventas'],
  ['pyl', 'P&L mensual'],
  ['horarios', 'Horarios pico'],
  ['movimientos', 'Movimientos'],
  ['compras', 'Compras/mes'],
]

export default function Reportes() {
  const [tab, setTab] = useState<Tab>('costos')
  const [costos, setCostos] = useState<CostoReceta[]>([])
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [comprasPeriodo, setComprasPeriodo] = useState<ComprasMes[]>([])
  const [topProductos, setTopProductos] = useState<TopProducto[]>([])
  const [horarios, setHorarios] = useState<HorariosPico | null>(null)
  const [pyl, setPyl] = useState<PYLMes[]>([])
  const [loading, setLoading] = useState(false)
  const [dias, setDias] = useState(30)

  useEffect(() => {
    setLoading(true)
    const load = async () => {
      if (tab === 'costos') setCostos(await api.reportes.costosRecetas())
      if (tab === 'movimientos') setMovimientos(await api.reportes.movimientos(dias))
      if (tab === 'compras') setComprasPeriodo(await api.reportes.comprasPeriodo(6))
      if (tab === 'top') setTopProductos(await api.reportes.topProductos(dias))
      if (tab === 'horarios') setHorarios(await api.reportes.horariosPico(dias))
      if (tab === 'pyl') setPyl(await api.reportes.pyl(3))
    }
    load().finally(() => setLoading(false))
  }, [tab, dias])

  const maxCompra = Math.max(...comprasPeriodo.map(c => c.total), 1)

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-2xl font-bold text-stone-800">Reportes</h1>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap border-b border-stone-200">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === key ? 'border-amber-500 text-amber-600' : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <p className="text-stone-400 text-sm">Cargando…</p>}

      {/* ── Top ventas ─────────────────────────────────────────────────────── */}
      {tab === 'top' && !loading && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => setDias(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${dias === d ? 'bg-amber-500 text-stone-900' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
                {d} días
              </button>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            {topProductos.length === 0 ? (
              <p className="text-stone-400 text-sm text-center py-12">Sin ventas en el período.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-stone-400 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3">#</th>
                    <th className="text-left px-4 py-3">Producto</th>
                    <th className="text-right px-4 py-3">Vendidos</th>
                    <th className="text-right px-4 py-3">Ingresos</th>
                    <th className="px-4 py-3 w-40">Participación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {topProductos.map((p, i) => {
                    const maxQ = topProductos[0]?.total_cantidad || 1
                    return (
                      <tr key={p.producto_id} className="hover:bg-stone-50">
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                            i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-stone-200 text-stone-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'text-stone-400'
                          }`}>{i + 1}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-stone-700">{p.nombre}</p>
                          {p.categoria && <p className="text-xs text-stone-400">{p.categoria}</p>}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-stone-800">{p.total_cantidad}</td>
                        <td className="px-4 py-3 text-right text-emerald-600 font-semibold">{clp(p.total_ingresos)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-stone-100 rounded-full h-1.5">
                              <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${(p.total_cantidad / maxQ) * 100}%` }} />
                            </div>
                            <span className="text-xs text-stone-400 w-8 text-right">{Math.round((p.total_cantidad / maxQ) * 100)}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── P&L mensual ────────────────────────────────────────────────────── */}
      {tab === 'pyl' && !loading && (
        <div className="space-y-4">
          {pyl.length === 0 ? (
            <p className="text-stone-400 text-sm text-center py-12">Sin datos suficientes.</p>
          ) : (
            <div className="space-y-3">
              {pyl.map(row => (
                <div key={row.mes} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-stone-800">{row.mes}</h3>
                    <span className={`font-bold text-lg ${row.resultado >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {row.resultado >= 0 ? '+' : ''}{clp(row.resultado)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-stone-400 mb-0.5">Ingresos</p>
                      <p className="font-semibold text-emerald-600">{clp(row.ingresos)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-stone-400 mb-0.5">Compras</p>
                      <p className="font-semibold text-red-500">{clp(row.compras)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-stone-400 mb-0.5">Gastos</p>
                      <p className="font-semibold text-red-500">{clp(row.gastos)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-stone-400 mb-0.5">Mermas</p>
                      <p className="font-semibold text-orange-500">{clp(row.mermas)}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-stone-100">
                    <div className="flex justify-between text-xs text-stone-400">
                      <span>Egresos totales</span>
                      <span className="font-semibold text-stone-600">{clp(row.egresos)}</span>
                    </div>
                    <div className="mt-1.5 bg-stone-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${row.resultado >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`}
                        style={{ width: `${Math.min(100, row.ingresos > 0 ? (row.resultado / row.ingresos) * 100 + 50 : 0)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Horarios pico ──────────────────────────────────────────────────── */}
      {tab === 'horarios' && !loading && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => setDias(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${dias === d ? 'bg-amber-500 text-stone-900' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
                {d} días
              </button>
            ))}
          </div>
          {!horarios ? (
            <p className="text-stone-400 text-sm text-center py-12">Sin datos suficientes.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Por hora */}
              <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
                <h3 className="font-semibold text-stone-700 mb-3">Ventas por hora del día</h3>
                <div className="space-y-1">
                  {horarios.por_hora.filter(h => h.hora >= 9 && h.hora <= 23).map(h => {
                    const max = Math.max(...horarios.por_hora.map(x => x.total), 1)
                    return (
                      <div key={h.hora} className="flex items-center gap-2">
                        <span className="text-xs text-stone-400 w-10 text-right">{String(h.hora).padStart(2, '0')}:00</span>
                        <div className="flex-1 bg-stone-100 rounded-full h-4 overflow-hidden">
                          <div
                            className={`h-4 rounded-full transition-all ${h.total > 0 ? 'bg-amber-400' : ''}`}
                            style={{ width: `${(h.total / max) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-stone-600 w-6 text-right">{h.total}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Por día de semana */}
              <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
                <h3 className="font-semibold text-stone-700 mb-3">Ventas por día de la semana</h3>
                <div className="space-y-2">
                  {horarios.por_dia.map(d => {
                    const max = Math.max(...horarios.por_dia.map(x => x.total), 1)
                    return (
                      <div key={d.dia} className="flex items-center gap-3">
                        <span className="text-sm text-stone-500 w-8">{d.dia}</span>
                        <div className="flex-1 bg-stone-100 rounded-full h-5 overflow-hidden">
                          <div
                            className={`h-5 rounded-full flex items-center pl-2 text-xs font-medium transition-all ${d.total > 0 ? 'bg-amber-400 text-stone-900' : ''}`}
                            style={{ width: `${Math.max((d.total / max) * 100, d.total > 0 ? 8 : 0)}%` }}
                          >
                            {d.total > 0 ? d.total : ''}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Costos de recetas ──────────────────────────────────────────────── */}
      {tab === 'costos' && !loading && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          {costos.length === 0 ? (
            <p className="text-stone-400 text-sm text-center py-12">No hay recetas con datos de costo.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-stone-400 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Plato</th>
                  <th className="text-right px-4 py-3">Precio venta</th>
                  <th className="text-right px-4 py-3">Costo porción</th>
                  <th className="text-right px-4 py-3">Margen $</th>
                  <th className="px-4 py-3 w-40">Margen %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {costos.map(r => (
                  <tr key={r.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-700">{r.nombre}</p>
                      {r.categoria && <p className="text-xs text-stone-400">{r.categoria}</p>}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-700">{clp(r.precio_venta)}</td>
                    <td className="px-4 py-3 text-right text-stone-500">{clp(r.costo_porcion)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${r.margen >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {clp(r.margen)}
                    </td>
                    <td className="px-4 py-3"><MargenBar pct={r.margen_pct} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Movimientos de stock ───────────────────────────────────────────── */}
      {tab === 'movimientos' && !loading && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {[7, 30, 60, 90].map(d => (
              <button key={d} onClick={() => setDias(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${dias === d ? 'bg-amber-500 text-stone-900' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
                {d} días
              </button>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            {movimientos.length === 0 ? (
              <p className="text-stone-400 text-sm text-center py-12">Sin movimientos en los últimos {dias} días.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-stone-400 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3">Fecha</th>
                    <th className="text-left px-4 py-3">Ingrediente</th>
                    <th className="text-center px-4 py-3">Tipo</th>
                    <th className="text-right px-4 py-3">Cantidad</th>
                    <th className="text-left px-4 py-3">Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {movimientos.map(m => (
                    <tr key={m.id} className="hover:bg-stone-50">
                      <td className="px-4 py-2.5 text-stone-400 text-xs whitespace-nowrap">{m.fecha}</td>
                      <td className="px-4 py-2.5 text-stone-700 font-medium">{m.ingrediente}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          m.tipo === 'ENTRADA' ? 'bg-emerald-100 text-emerald-700' :
                          m.tipo === 'SALIDA' ? 'bg-red-100 text-red-700' :
                          'bg-stone-100 text-stone-600'
                        }`}>{m.tipo}</span>
                      </td>
                      <td className={`px-4 py-2.5 text-right font-semibold ${m.cantidad >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {m.cantidad > 0 ? '+' : ''}{m.cantidad} {m.unidad}
                      </td>
                      <td className="px-4 py-2.5 text-stone-400 text-xs">{m.motivo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Compras por mes ────────────────────────────────────────────────── */}
      {tab === 'compras' && !loading && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          {comprasPeriodo.length === 0 ? (
            <p className="text-stone-400 text-sm text-center py-12">Sin compras registradas.</p>
          ) : (
            <div className="space-y-3">
              {comprasPeriodo.map(c => (
                <div key={c.mes} className="flex items-center gap-4">
                  <span className="text-sm text-stone-500 w-20 shrink-0">{c.mes}</span>
                  <div className="flex-1 bg-stone-100 rounded-full h-5 relative overflow-hidden">
                    <div className="bg-amber-400 h-5 rounded-full transition-all duration-500"
                      style={{ width: `${(c.total / maxCompra) * 100}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-stone-700 w-28 text-right shrink-0">{clp(c.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
