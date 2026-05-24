import { useEffect, useState, useRef } from 'react'
import { api } from './api/client'
import type { Compra, DTEImportado, Ingrediente } from './api/client'
import {
  Upload,
  Search,
  CheckCircle,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react'

const TIPOS_DTE: Record<number, string> = {
  33: 'Factura Electrónica',
  34: 'Factura No Afecta/Exenta',
  39: 'Boleta Electrónica',
  52: 'Guía de Despacho',
  61: 'Nota de Crédito',
}

function clp(n: number) {
  return `$${n.toLocaleString('es-CL')}`
}

export default function Compras() {
  const [compras, setCompras] = useState<Compra[]>([])
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [tab, setTab] = useState<'lista' | 'importar' | 'verificar'>('lista')

  // XML Import state
  const fileRef = useRef<HTMLInputElement>(null)
  const [dte, setDte] = useState<DTEImportado | null>(null)
  const [dteMap, setDteMap] = useState<Record<number, number | null>>({}) // item idx → ingrediente_id
  const [importing, setImporting] = useState(false)

  // Verificar DTE state
  const [verForm, setVerForm] = useState({
    rut_emisor: '',
    dv_emisor: '',
    tipo_dte: 33,
    folio: '',
    fecha: '',
    monto: '',
  })
  const [verResult, setVerResult] = useState<null | { verificado: boolean | null; estado_codigo: string; estado_glosa: string }>(null)
  const [verLoading, setVerLoading] = useState(false)

  useEffect(() => {
    Promise.all([api.compras.list(), api.ingredientes.list()])
      .then(([c, i]) => {
        setCompras(c)
        setIngredientes(i)
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const result = await api.compras.importarXML(file)
      setDte(result)
      setDteMap({})
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error importando XML')
    }
  }

  async function confirmarImport() {
    if (!dte) return
    setImporting(true)
    try {
      const items = dte.items.map((item, idx) => ({
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        monto_item: item.monto_item,
        ingrediente_id: dteMap[idx] ?? null,
      }))
      const nueva = await api.compras.create({
        folio_sii: dte.folio_sii,
        tipo_dte: dte.tipo_dte,
        rut_proveedor: dte.rut_proveedor,
        nombre_proveedor: dte.nombre_proveedor,
        fecha: dte.fecha,
        monto_neto: dte.monto_neto,
        iva: dte.iva,
        monto_total: dte.monto_total,
        items,
      })
      setCompras(prev => [nueva, ...prev])
      setDte(null)
      setTab('lista')
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error guardando compra')
    } finally {
      setImporting(false)
    }
  }

  async function eliminar(id: number) {
    if (!confirm('¿Eliminar esta compra?')) return
    await api.compras.delete(id)
    setCompras(prev => prev.filter(c => c.id !== id))
  }

  async function verificar(e: React.FormEvent) {
    e.preventDefault()
    setVerLoading(true)
    setVerResult(null)
    try {
      const res = await api.compras.verificarSII({
        rut_emisor: verForm.rut_emisor,
        dv_emisor: verForm.dv_emisor,
        tipo_dte: verForm.tipo_dte,
        folio: parseInt(verForm.folio),
        fecha: verForm.fecha,
        monto: parseInt(verForm.monto),
      })
      setVerResult(res)
    } catch (err: unknown) {
      setVerResult({ verificado: null, estado_codigo: 'ERROR', estado_glosa: err instanceof Error ? err.message : 'Error' })
    } finally {
      setVerLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">Compras</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-stone-200">
        {([['lista', 'Historial'], ['importar', 'Importar XML DTE'], ['verificar', 'Verificar en SII']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: Historial ─────────────────────────────────────────────────── */}
      {tab === 'lista' && (
        <div className="space-y-3">
          {loading && <p className="text-stone-400 text-sm">Cargando…</p>}
          {!loading && compras.length === 0 && (
            <div className="text-center py-12 text-stone-400">
              <p>No hay compras registradas.</p>
              <p className="text-sm mt-1">Importa un XML del SII para comenzar.</p>
            </div>
          )}
          {compras.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-stone-100 shadow-sm overflow-hidden">
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-stone-50"
                onClick={() => setExpanded(expanded === c.id ? null : c.id)}
              >
                <div className="flex items-center gap-3">
                  {c.verificado_sii ? (
                    <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                  ) : (
                    <HelpCircle size={16} className="text-stone-300 shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-stone-700">
                      {c.nombre_proveedor}
                      {c.folio_sii && (
                        <span className="ml-2 text-xs text-stone-400 font-normal">
                          Folio {c.folio_sii}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-stone-400">
                      {c.fecha} · {TIPOS_DTE[c.tipo_dte] || `DTE ${c.tipo_dte}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-stone-800">{clp(c.monto_total)}</span>
                  <button
                    onClick={e => { e.stopPropagation(); eliminar(c.id) }}
                    className="text-stone-300 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                  {expanded === c.id ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
                </div>
              </div>

              {expanded === c.id && (
                <div className="border-t border-stone-50 px-4 py-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-stone-400">
                        <th className="text-left pb-1">Descripción</th>
                        <th className="text-right pb-1">Cant.</th>
                        <th className="text-right pb-1">Precio unit.</th>
                        <th className="text-right pb-1">Monto</th>
                        <th className="text-left pb-1 pl-3">Ingrediente</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                      {c.items.map(item => (
                        <tr key={item.id}>
                          <td className="py-1.5 pr-2 text-stone-600">{item.descripcion}</td>
                          <td className="py-1.5 text-right text-stone-600">{item.cantidad}</td>
                          <td className="py-1.5 text-right text-stone-600">{clp(item.precio_unitario)}</td>
                          <td className="py-1.5 text-right text-stone-700 font-medium">{clp(item.monto_item)}</td>
                          <td className="py-1.5 pl-3 text-emerald-600">{item.ingrediente_nombre || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex justify-end gap-4 mt-2 text-xs text-stone-500">
                    <span>Neto: {clp(c.monto_neto)}</span>
                    <span>IVA: {clp(c.iva)}</span>
                    <span className="font-semibold text-stone-700">Total: {clp(c.monto_total)}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: Importar XML ──────────────────────────────────────────────── */}
      {tab === 'importar' && (
        <div className="space-y-5">
          {!dte ? (
            <div
              className="border-2 border-dashed border-stone-200 rounded-2xl p-12 text-center cursor-pointer hover:border-amber-400 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={32} className="text-stone-300 mx-auto mb-3" />
              <p className="text-stone-600 font-medium">Sube el XML del DTE</p>
              <p className="text-stone-400 text-sm mt-1">
                El proveedor te envía el archivo XML por correo o el SII te lo reenvía automáticamente
              </p>
              <input ref={fileRef} type="file" accept=".xml" className="hidden" onChange={handleFile} />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Resumen DTE */}
              <div className="bg-stone-50 rounded-xl p-4 text-sm space-y-1">
                <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                  <p><span className="text-stone-400">Proveedor:</span> <span className="font-medium">{dte.nombre_proveedor}</span></p>
                  <p><span className="text-stone-400">RUT:</span> {dte.rut_proveedor}</p>
                  <p><span className="text-stone-400">Tipo DTE:</span> {dte.tipo_nombre}</p>
                  <p><span className="text-stone-400">Folio:</span> {dte.folio_sii}</p>
                  <p><span className="text-stone-400">Fecha:</span> {dte.fecha}</p>
                  <p><span className="text-stone-400">Total:</span> <span className="font-bold">{clp(dte.monto_total)}</span></p>
                </div>
              </div>

              {/* Mapeo ingredientes */}
              <div>
                <p className="text-sm font-semibold text-stone-600 mb-2">
                  Mapea cada ítem a un ingrediente del inventario (opcional):
                </p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-stone-400 text-xs border-b border-stone-100">
                      <th className="text-left py-1">Descripción DTE</th>
                      <th className="text-right py-1">Cant.</th>
                      <th className="text-right py-1">Precio</th>
                      <th className="text-left py-1 pl-3">→ Ingrediente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    {dte.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2 pr-2 text-stone-700">{item.descripcion}</td>
                        <td className="py-2 text-right text-stone-500">{item.cantidad} {item.unidad}</td>
                        <td className="py-2 text-right text-stone-500">{clp(item.precio_unitario)}</td>
                        <td className="py-2 pl-3">
                          <select
                            value={dteMap[idx] ?? ''}
                            onChange={e => setDteMap(prev => ({ ...prev, [idx]: e.target.value ? parseInt(e.target.value) : null }))}
                            className="text-xs border border-stone-200 rounded px-2 py-1 bg-white text-stone-700 w-full"
                          >
                            <option value="">— sin vincular —</option>
                            {ingredientes.map(ing => (
                              <option key={ing.id} value={ing.id}>
                                {ing.nombre} ({ing.unidad})
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={confirmarImport}
                  disabled={importing}
                  className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-900 font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
                >
                  {importing ? 'Guardando…' : 'Confirmar y guardar compra'}
                </button>
                <button
                  onClick={() => { setDte(null); if (fileRef.current) fileRef.current.value = '' }}
                  className="text-stone-500 hover:text-stone-700 px-4 py-2.5 text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Verificar SII ─────────────────────────────────────────────── */}
      {tab === 'verificar' && (
        <div className="max-w-md space-y-4">
          <p className="text-stone-500 text-sm">
            Verifica si un DTE existe y es válido en el SII. Requiere certificado digital configurado en el backend.
          </p>
          <form onSubmit={verificar} className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-stone-500 mb-1">RUT emisor (sin DV)</label>
                <input
                  value={verForm.rut_emisor}
                  onChange={e => setVerForm(p => ({ ...p, rut_emisor: e.target.value }))}
                  placeholder="76123456"
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">DV</label>
                <input
                  value={verForm.dv_emisor}
                  onChange={e => setVerForm(p => ({ ...p, dv_emisor: e.target.value }))}
                  placeholder="7"
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-stone-500 mb-1">Tipo DTE</label>
                <select
                  value={verForm.tipo_dte}
                  onChange={e => setVerForm(p => ({ ...p, tipo_dte: parseInt(e.target.value) }))}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  {Object.entries(TIPOS_DTE).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Folio</label>
                <input
                  type="number"
                  value={verForm.folio}
                  onChange={e => setVerForm(p => ({ ...p, folio: e.target.value }))}
                  placeholder="12345"
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-stone-500 mb-1">Fecha emisión (DD/MM/YYYY)</label>
                <input
                  value={verForm.fecha}
                  onChange={e => setVerForm(p => ({ ...p, fecha: e.target.value }))}
                  placeholder="15/01/2024"
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Monto total</label>
                <input
                  type="number"
                  value={verForm.monto}
                  onChange={e => setVerForm(p => ({ ...p, monto: e.target.value }))}
                  placeholder="119000"
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={verLoading}
              className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              <Search size={15} />
              {verLoading ? 'Consultando SII…' : 'Verificar en SII'}
            </button>
          </form>

          {verResult && (
            <div className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm ${
              verResult.verificado === true
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : verResult.verificado === false
                ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-amber-50 border border-amber-200 text-amber-800'
            }`}>
              {verResult.verificado === true ? (
                <CheckCircle size={18} className="shrink-0 mt-0.5" />
              ) : verResult.verificado === false ? (
                <XCircle size={18} className="shrink-0 mt-0.5" />
              ) : (
                <HelpCircle size={18} className="shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">{verResult.estado_codigo}</p>
                <p>{verResult.estado_glosa}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
