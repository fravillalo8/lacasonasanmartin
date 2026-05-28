import { useEffect, useState } from 'react'
import { api } from './api/client'
import type { AuditEntry } from './api/client'
import { Download, Shield } from 'lucide-react'

const BASE = import.meta.env.VITE_API_URL ?? ''

const ACCION_BADGE: Record<string, string> = {
  cobrar_mesa:      'bg-emerald-100 text-emerald-700',
  agregar_item:     'bg-blue-100 text-blue-700',
  quitar_item:      'bg-red-100 text-red-700',
  cancelar_comanda: 'bg-red-100 text-red-700',
  abrir_mesa:       'bg-amber-100 text-amber-700',
}

const ROL_BADGE: Record<string, string> = {
  admin:  'bg-violet-100 text-violet-700',
  mozo:   'bg-sky-100 text-sky-700',
  cocina: 'bg-orange-100 text-orange-700',
}

export default function Auditoria() {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [dias, setDias] = useState(7)

  useEffect(() => {
    setLoading(true)
    api.auditoria.list(dias)
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [dias])

  const csvUrl = () => {
    const token = localStorage.getItem('inv_token') || ''
    return `${BASE}/api/auditoria/csv?dias=${dias}&token=${encodeURIComponent(token)}`
  }

  const accionesunicas = [...new Set(logs.map(l => l.accion))].sort()

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-violet-500" />
          <h1 className="text-2xl font-bold text-stone-800">Auditoría</h1>
        </div>
        <a
          href={csvUrl()}
          download
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-medium transition-colors border border-emerald-200"
        >
          <Download size={13} />
          Exportar CSV
        </a>
      </div>

      {/* Filtro días */}
      <div className="flex gap-2 flex-wrap">
        {[1, 3, 7, 14, 30].map(d => (
          <button
            key={d}
            type="button"
            onClick={() => setDias(d)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              dias === d ? 'bg-amber-500 text-stone-900' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {d === 1 ? 'Hoy' : `${d} días`}
          </button>
        ))}
        <span className="ml-auto text-xs text-stone-400 self-center">{logs.length} registros</span>
      </div>

      {/* Resumen por acción */}
      {!loading && logs.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {accionesunicas.map(ac => {
            const count = logs.filter(l => l.accion === ac).length
            return (
              <span key={ac} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${ACCION_BADGE[ac] ?? 'bg-stone-100 text-stone-600'}`}>
                {ac.replace(/_/g, ' ')} <span className="font-bold">({count})</span>
              </span>
            )
          })}
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-stone-400 text-sm text-center py-12">Cargando…</p>
        ) : logs.length === 0 ? (
          <p className="text-stone-400 text-sm text-center py-12">Sin registros en el período.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-400 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Fecha</th>
                <th className="text-left px-4 py-3">Acción</th>
                <th className="text-left px-4 py-3">Detalle</th>
                <th className="text-center px-4 py-3">Rol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {logs.map(l => (
                <tr key={l.id} className="hover:bg-stone-50">
                  <td className="px-4 py-2.5 text-stone-400 text-xs whitespace-nowrap">{l.fecha}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ACCION_BADGE[l.accion] ?? 'bg-stone-100 text-stone-600'}`}>
                      {l.accion.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-stone-600 text-xs">{l.detalle}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ROL_BADGE[l.usuario_rol] ?? 'bg-stone-100 text-stone-500'}`}>
                      {l.usuario_rol}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
