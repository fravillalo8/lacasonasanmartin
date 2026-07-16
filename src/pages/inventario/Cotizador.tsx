import { useEffect, useRef, useState } from 'react'
import {
  RefreshCw, ShoppingCart, TrendingDown, X, ChevronDown, ChevronUp,
  Phone, Globe, Camera, AlertTriangle, Clock, CheckCircle2, Upload,
} from 'lucide-react'
import { api } from './api/client'
import type { ComparacionData, PedidoOptimo, PrediccionCompras, PrediccionIngrediente } from './api/client'

const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api'
function getToken() { return localStorage.getItem('inv_token') || '' }

function clp(n: number) {
  return n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })
}

function diasDesde(iso: string | null | undefined): number {
  if (!iso) return 999
  const d = new Date(iso)
  return Math.floor((Date.now() - d.getTime()) / 86400000)
}

// ─── Modal lector de boleta ───────────────────────────────────────────────────
function ModalBoleta({
  proveedores,
  onClose,
  onDone,
}: {
  proveedores: { id: number; nombre: string }[]
  onClose: () => void
  onDone: (msg: string) => void
}) {
  const [provId, setProvId] = useState(proveedores[0]?.id ?? 0)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<null | { total_guardados: number; guardados: {ingrediente:string;precio:number;confianza:string;cantidad_ingresada:number|null}[]; no_encontrados: string[]; stock_actualizado: {ingrediente:string;cantidad:number;unidad:string;stock_nuevo:number}[] }>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(f: File) {
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setResult(null)
  }

  async function handleUpload() {
    if (!file || !provId) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${BASE}/cotizador/leer-boleta?proveedor_id=${provId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail || 'Error procesando boleta')
      }
      const data = await res.json()
      setResult(data)
      onDone(`✓ ${data.total_guardados} precios extraídos de la boleta`)
    } catch (e: unknown) {
      onDone(e instanceof Error ? e.message : 'Error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-amber-500" />
            <h2 className="font-semibold text-stone-800">Leer precios de boleta</h2>
          </div>
          <button type="button" onClick={onClose} title="Cerrar"><X size={18} className="text-stone-400" /></button>
        </div>

        {!result ? (
          <>
            <div className="mb-4">
              <label className="block text-xs text-stone-500 mb-1">Proveedor de esta boleta</label>
              <select
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                value={provId}
                onChange={e => setProvId(Number(e.target.value))}
                title="Proveedor"
              >
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>

            <div
              className="border-2 border-dashed border-stone-200 rounded-xl p-6 text-center cursor-pointer hover:border-amber-400 transition-colors"
              onClick={() => inputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            >
              {preview ? (
                <img src={preview} alt="boleta" className="max-h-48 mx-auto rounded-lg object-contain" />
              ) : (
                <div className="text-stone-400">
                  <Upload size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Arrastra la foto de la boleta aquí</p>
                  <p className="text-xs mt-1">o haz clic para seleccionar</p>
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                title="Seleccionar imagen"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
            </div>

            <div className="flex gap-3 mt-5">
              <button type="button" onClick={onClose} className="flex-1 border border-stone-200 text-stone-600 py-2 rounded-lg text-sm hover:bg-stone-50">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={!file || uploading}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-900 font-semibold py-2 rounded-lg text-sm flex items-center justify-center gap-2"
              >
                <Camera size={15} />
                {uploading ? 'Analizando con IA…' : 'Extraer precios'}
              </button>
            </div>
          </>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-4 text-green-600">
              <CheckCircle2 size={18} />
              <span className="font-semibold">{result.total_guardados} precios guardados</span>
              {result.stock_actualizado?.length > 0 && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  +{result.stock_actualizado.length} en inventario
                </span>
              )}
            </div>
            {result.guardados.length > 0 && (
              <div className="space-y-1.5 mb-4">
                {result.guardados.map((g, i) => (
                  <div key={i} className="flex justify-between text-sm bg-green-50 rounded-lg px-3 py-1.5">
                    <div>
                      <span className="text-stone-700">{g.ingrediente}</span>
                      {g.cantidad_ingresada != null && (
                        <span className="text-xs text-blue-600 ml-2">+{g.cantidad_ingresada} al stock</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-stone-800">{clp(g.precio)}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${g.confianza === 'alta' ? 'bg-green-100 text-green-700' : g.confianza === 'media' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {g.confianza}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {result.no_encontrados.length > 0 && (
              <p className="text-xs text-stone-400 mb-4">
                No encontrados: {result.no_encontrados.join(', ')}
              </p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-amber-500 hover:bg-amber-400 text-stone-900 font-semibold py-2 rounded-lg text-sm"
            >
              Listo
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Predicción de compras ────────────────────────────────────────────────────
const URGENCIA_CFG = {
  critico:   { label: 'Crítico',    cls: 'bg-red-100 text-red-700' },
  alto:      { label: 'Urgente',    cls: 'bg-orange-100 text-orange-700' },
  medio:     { label: 'Pronto',     cls: 'bg-amber-100 text-amber-700' },
  ok:        { label: 'OK',         cls: 'bg-green-100 text-green-700' },
  sin_datos: { label: 'Sin datos',  cls: 'bg-stone-100 text-stone-400' },
} as const

function PrediccionView({
  prediccion,
  loading,
  onRefresh,
  onAgregarPedido,
}: {
  prediccion: PrediccionCompras | null
  loading: boolean
  onRefresh: () => void
  onAgregarPedido: (ing: PrediccionIngrediente) => void
}) {
  if (loading) return <div className="p-8 text-center text-stone-400 text-sm">Calculando predicción…</div>
  if (!prediccion) return null

  const { ingredientes, resumen, periodo_dias, dias_objetivo } = prediccion
  const activos = ingredientes.filter(i => i.urgencia !== 'sin_datos')

  return (
    <div>
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-bold text-red-600">{resumen.criticos}</p>
          <p className="text-xs text-red-500 mt-0.5">Críticos (&lt;3 días)</p>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-bold text-orange-600">{resumen.altos}</p>
          <p className="text-xs text-orange-500 mt-0.5">Urgentes (&lt;7 días)</p>
        </div>
        <div className="bg-stone-50 border border-stone-100 rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-bold text-stone-600">{resumen.con_datos}</p>
          <p className="text-xs text-stone-400 mt-0.5">Con historial ({periodo_dias}d)</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-stone-400">
          Basado en {periodo_dias} días de ventas · Meta: {dias_objetivo} días de stock
        </p>
        <button
          type="button"
          onClick={onRefresh}
          title="Recalcular"
          className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 border border-stone-200 rounded-lg px-2.5 py-1"
        >
          <RefreshCw size={11} /> Recalcular
        </button>
      </div>

      {activos.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-10 text-center text-stone-400 text-sm">
          No hay historial de ventas aún. Los datos aparecerán después de procesar pedidos.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 text-xs text-stone-500">
                <th className="text-left px-4 py-3 font-semibold">Ingrediente</th>
                <th className="text-right px-3 py-3 font-semibold">Stock</th>
                <th className="text-right px-3 py-3 font-semibold">Consumo/día</th>
                <th className="text-center px-3 py-3 font-semibold">Días restantes</th>
                <th className="text-right px-3 py-3 font-semibold">Sugerido pedir</th>
                <th className="px-3 py-3" aria-label="Acciones">Acción</th>
              </tr>
            </thead>
            <tbody>
              {activos.map((ing, idx) => {
                const cfg = URGENCIA_CFG[ing.urgencia]
                return (
                  <tr key={ing.ingrediente_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'}>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-stone-800">{ing.nombre}</div>
                      <div className="text-xs text-stone-400">por {ing.unidad}</div>
                    </td>
                    <td className="px-3 py-2.5 text-right text-stone-700">
                      {ing.stock_actual.toFixed(2)}
                      <span className="text-stone-400 text-xs ml-1">{ing.unidad}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-stone-500 text-xs">
                      {ing.consumo_diario > 0 ? ing.consumo_diario.toFixed(3) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {ing.dias_hasta_agotarse != null ? (
                        <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${cfg.cls}`}>
                          {cfg.label} · {ing.dias_hasta_agotarse.toFixed(0)}d
                        </span>
                      ) : (
                        <span className="text-stone-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-stone-700">
                      {ing.cantidad_sugerida > 0 ? (
                        <span>{ing.cantidad_sugerida.toFixed(2)} <span className="text-stone-400 text-xs">{ing.unidad}</span></span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {ing.cantidad_sugerida > 0 && (
                        <button
                          type="button"
                          onClick={() => onAgregarPedido(ing)}
                          className="text-xs text-amber-600 border border-amber-200 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg whitespace-nowrap"
                          title="Agregar al pedido óptimo"
                        >
                          + Pedido
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Cotizador() {
  const [data, setData] = useState<ComparacionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [cantidades, setCantidades] = useState<Record<number, string>>({})
  const [pedido, setPedido] = useState<PedidoOptimo | null>(null)
  const [calculando, setCalculando] = useState(false)
  const [showPedido, setShowPedido] = useState(false)

  const [filtro, setFiltro] = useState('')
  const [soloConPrecio, setSoloConPrecio] = useState(false)

  const [showBoleta, setShowBoleta] = useState(false)
  const [scrapingIds, setScrapingIds] = useState<number[]>([])
  const [scrapingAll, setScrapingAll] = useState(false)
  const [_scrapingResult, setScrapingResult] = useState<{actualizados:number;total:number} | null>(null)

  const [tab, setTab] = useState<'comparar' | 'prediccion'>('comparar')
  const [prediccion, setPrediccion] = useState<PrediccionCompras | null>(null)
  const [loadingPred, setLoadingPred] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError('')
    try {
      setData(await api.cotizador.comparar())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error cargando datos')
    } finally {
      setLoading(false)
    }
  }

  async function calcularPedido() {
    const items = Object.entries(cantidades)
      .map(([id, qty]) => ({ ingrediente_id: Number(id), cantidad: parseFloat(qty) }))
      .filter(i => !isNaN(i.cantidad) && i.cantidad > 0)
    if (!items.length) return
    setCalculando(true)
    try {
      const result = await api.cotizador.pedidoOptimo(items)
      setPedido(result)
      setShowPedido(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error calculando pedido')
    } finally {
      setCalculando(false)
    }
  }

  async function loadPrediccion() {
    setLoadingPred(true)
    try {
      setPrediccion(await api.cotizador.prediccion())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error cargando predicción')
    } finally {
      setLoadingPred(false)
    }
  }

  function switchTab(t: 'comparar' | 'prediccion') {
    setTab(t)
    if (t === 'prediccion' && !prediccion) loadPrediccion()
  }

  async function actualizarWeb(ids: number[]) {
    const all = ids.length === 0
    if (all) setScrapingAll(true)
    else setScrapingIds(ids)
    setScrapingResult(null)
    try {
      const res = await fetch(`${BASE}/cotizador/actualizar-precios-web`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ingrediente_ids: ids }),
      })
      if (!res.ok) throw new Error((await res.json().catch(()=>({detail:res.statusText}))).detail)
      const data = await res.json()
      setScrapingResult(data)
      const cadenas = data.cadenas?.join(', ') ?? 'supermercados'
      setSuccessMsg(`✓ ${data.actualizados} precios actualizados desde ${cadenas}`)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error consultando web')
    } finally {
      setScrapingAll(false)
      setScrapingIds([])
    }
  }

  if (loading) return <div className="p-6 text-stone-400 text-sm">Cargando cotizador…</div>
  if (!data) return <div className="p-6 text-red-500 text-sm">{error}</div>

  const { proveedores, filas } = data

  // Alertas de precios viejos
  const preciosViejos = filas.flatMap(f =>
    proveedores.filter(p => {
      const fecha = (f as any).fechas?.[p.id]
      return f.precios[p.id] != null && diasDesde(fecha) >= 7
    }).map(p => ({ ingrediente: f.ingrediente, proveedor: p.nombre }))
  )

  const filasFiltradas = filas.filter(f => {
    if (soloConPrecio && f.min_precio === null) return false
    if (filtro && !f.ingrediente.toLowerCase().includes(filtro.toLowerCase())) return false
    return true
  })

  const itemsEnPedido = Object.values(cantidades).filter(v => parseFloat(v) > 0).length

  return (
    <div className="p-6 max-w-full">
      {showBoleta && (
        <ModalBoleta
          proveedores={proveedores}
          onClose={() => setShowBoleta(false)}
          onDone={msg => { setSuccessMsg(msg); setShowBoleta(false); load() }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-stone-800">Cotizador de compras</h1>
          <p className="text-sm text-stone-400 mt-0.5">Compara precios, lee boletas y predice reposición</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowBoleta(true)}
            className="flex items-center gap-1.5 text-sm border border-stone-200 rounded-lg px-3 py-1.5 text-stone-600 hover:bg-stone-50"
          >
            <Camera size={14} /> Leer boleta
          </button>
          <button
            type="button"
            onClick={() => actualizarWeb([])}
            disabled={scrapingAll}
            className="flex items-center gap-1.5 text-sm border border-amber-300 bg-amber-50 rounded-lg px-3 py-1.5 text-amber-700 hover:bg-amber-100 disabled:opacity-50"
          >
            <Globe size={14} />
            {scrapingAll ? 'Consultando supermercados…' : 'Actualizar precios web'}
          </button>
          <button
            type="button"
            onClick={load}
            title="Refrescar datos"
            className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 border border-stone-200 rounded-lg px-3 py-1.5"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600 flex justify-between items-center">
          {error}
          <button type="button" onClick={() => setError('')} title="Cerrar"><X size={14} /></button>
        </div>
      )}
      {successMsg && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 flex justify-between items-center">
          {successMsg}
          <button type="button" onClick={() => setSuccessMsg('')} title="Cerrar"><X size={14} /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-stone-100 rounded-xl p-1 w-fit">
        <button
          type="button"
          onClick={() => switchTab('comparar')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'comparar' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
        >
          Comparar precios
        </button>
        <button
          type="button"
          onClick={() => switchTab('prediccion')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${tab === 'prediccion' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
        >
          <TrendingDown size={13} /> Predicción de compras
          {prediccion && prediccion.resumen.criticos > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full leading-none">{prediccion.resumen.criticos}</span>
          )}
        </button>
      </div>

      {/* ── Vista Predicción de compras ── */}
      {tab === 'prediccion' && (
        <PrediccionView
          prediccion={prediccion}
          loading={loadingPred}
          onRefresh={loadPrediccion}
          onAgregarPedido={(ing: PrediccionIngrediente) => {
            setCantidades(prev => ({ ...prev, [ing.ingrediente_id]: String(ing.cantidad_sugerida) }))
            setTab('comparar')
          }}
        />
      )}

      {tab === 'comparar' && (
      <>

      {/* Alerta precios viejos */}
      {preciosViejos.length > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={15} className="text-amber-600" />
            <p className="text-sm font-semibold text-amber-700">
              {preciosViejos.length} precios sin actualizar hace más de 7 días
            </p>
          </div>
          <p className="text-xs text-amber-600">
            Usa <strong>Leer boleta</strong> o <strong>Actualizar precios web</strong> para mantenerlos al día.
          </p>
        </div>
      )}

      {proveedores.length === 0 ? (
        <div className="mt-6 bg-white rounded-xl border border-stone-200 p-12 text-center">
          <p className="text-stone-500 text-sm">No hay proveedores activos.</p>
          <p className="text-stone-400 text-xs mt-1">Ve a <strong>Proveedores</strong> y crea al menos uno.</p>
        </div>
      ) : (
        <>
          {/* Filters + CTA */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <input
              type="text"
              placeholder="Buscar ingrediente…"
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
              className="border border-stone-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-400 w-52"
            />
            <label className="flex items-center gap-1.5 text-sm text-stone-500 cursor-pointer select-none">
              <input type="checkbox" checked={soloConPrecio} onChange={e => setSoloConPrecio(e.target.checked)} className="rounded" />
              Solo con precio
            </label>
            <div className="flex-1" />
            {itemsEnPedido > 0 && (
              <button
                type="button"
                onClick={() => { setCantidades({}); setPedido(null); setShowPedido(false) }}
                className="flex items-center gap-1.5 text-sm text-stone-500 border border-stone-200 rounded-lg px-3 py-1.5 hover:bg-stone-50"
              >
                <X size={14} /> Limpiar
              </button>
            )}
            <button
              type="button"
              onClick={calcularPedido}
              disabled={calculando || itemsEnPedido === 0}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-900 font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
            >
              <ShoppingCart size={16} />
              {calculando ? 'Calculando…' : `Pedido óptimo${itemsEnPedido > 0 ? ` (${itemsEnPedido})` : ''}`}
            </button>
          </div>

          {/* Tabla comparativa */}
          <div className="bg-white rounded-xl border border-stone-200 overflow-x-auto">
            <table className="w-full text-sm min-w-max">
              <thead>
                <tr className="border-b border-stone-100">
                  <th className="text-left px-4 py-3 font-semibold text-stone-600 sticky left-0 bg-white z-10 min-w-[180px]">
                    Ingrediente
                  </th>
                  <th className="text-right px-3 py-3 font-semibold text-stone-400 text-xs whitespace-nowrap">
                    Precio actual
                  </th>
                  {proveedores.map(prov => (
                    <th key={prov.id} className="text-right px-3 py-3 font-semibold text-stone-600 text-xs whitespace-nowrap">
                      <div>{prov.nombre}</div>
                      <div className="text-stone-400 font-normal">{prov.tipo}</div>
                    </th>
                  ))}
                  <th className="text-right px-3 py-3 font-semibold text-stone-600 text-xs whitespace-nowrap">
                    Cantidad a pedir
                  </th>
                  <th className="px-3 py-3 text-xs text-stone-400 whitespace-nowrap" aria-label="Acciones">Web</th>
                </tr>
              </thead>
              <tbody>
                {filasFiltradas.map((fila, idx) => (
                  <tr key={fila.ingrediente_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'}>
                    <td className="px-4 py-2.5 sticky left-0 z-10 bg-inherit">
                      <div className="font-medium text-stone-800">{fila.ingrediente}</div>
                      <div className="text-xs text-stone-400">por {fila.unidad}</div>
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs text-stone-400">
                      {fila.costo_actual > 0 ? clp(fila.costo_actual) : '—'}
                    </td>
                    {proveedores.map(prov => {
                      const precio = fila.precios[prov.id]
                      const fecha  = fila.fechas?.[prov.id]
                      const nota   = fila.notas?.[prov.id]
                      const esMejor = precio != null && precio === fila.min_precio
                      const dias = diasDesde(fecha)
                      const viejo = precio != null && dias >= 7
                      return (
                        <td key={prov.id} className="px-3 py-2.5 text-right">
                          {precio != null ? (
                            <div className="inline-flex flex-col items-end gap-0.5">
                              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${esMejor ? 'bg-green-100 text-green-700' : 'text-stone-600'}`}>
                                {esMejor && <TrendingDown size={10} />}
                                {clp(precio)}
                              </span>
                              {nota && (
                                <span className="text-[10px] text-stone-400 max-w-[130px] truncate text-right leading-tight" title={nota}>
                                  {nota}
                                </span>
                              )}
                              {viejo && (
                                <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
                                  <Clock size={9} />{dias}d
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-stone-300 text-xs">—</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="px-3 py-2.5 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="0"
                        value={cantidades[fila.ingrediente_id] ?? ''}
                        onChange={e => setCantidades(prev => ({ ...prev, [fila.ingrediente_id]: e.target.value }))}
                        className="w-20 border border-stone-200 rounded px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-amber-400 text-right"
                      />
                    </td>
                    <td className="px-2 py-2.5">
                      <button
                        type="button"
                        title="Actualizar precios web"
                        onClick={() => actualizarWeb([fila.ingrediente_id])}
                        disabled={scrapingIds.includes(fila.ingrediente_id)}
                        className="p-1 rounded hover:bg-amber-50 text-stone-300 hover:text-amber-500 disabled:opacity-40"
                      >
                        {scrapingIds.includes(fila.ingrediente_id)
                          ? <RefreshCw size={12} className="animate-spin" />
                          : <Globe size={12} />}
                      </button>
                    </td>
                  </tr>
                ))}
                {filasFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={proveedores.length + 4} className="px-4 py-8 text-center text-stone-400 text-sm">
                      Sin ingredientes que coincidan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-stone-400 mt-2 flex items-center gap-3">
            <span className="flex items-center gap-1"><TrendingDown size={11} className="text-green-500" /> Verde = precio más bajo</span>
            <span className="flex items-center gap-1"><Clock size={11} className="text-amber-400" /> Número en naranja = días sin actualizar</span>
            <span className="flex items-center gap-1"><Globe size={11} className="text-stone-400" /> Globo = actualizar ese ingrediente desde web</span>
          </p>

          {/* Pedido óptimo */}
          {pedido && showPedido && (
            <div className="mt-6 bg-white rounded-xl border border-stone-200 overflow-hidden">
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-stone-50"
                onClick={() => setShowPedido(v => !v)}
              >
                <div className="flex items-center gap-3">
                  <ShoppingCart size={18} className="text-amber-500" />
                  <div>
                    <h2 className="font-semibold text-stone-800">Pedido óptimo</h2>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Total: <strong className="text-stone-700">{clp(pedido.total_general)}</strong>
                      {pedido.ahorro_estimado > 0 && (
                        <span className="ml-2 text-green-600 font-medium">
                          · Ahorro estimado {clp(pedido.ahorro_estimado)} vs precio actual
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                {showPedido ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
              </div>

              <div className="border-t border-stone-100 divide-y divide-stone-100">
                {pedido.grupos.map(grupo => (
                  <div key={grupo.proveedor_id} className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-semibold text-stone-800">{grupo.proveedor}</span>
                      <span className="text-xs text-stone-400">{grupo.tipo}</span>
                      {grupo.telefono && (
                        <span className="flex items-center gap-1 text-xs text-stone-400 ml-auto">
                          <Phone size={11} /> {grupo.telefono}
                        </span>
                      )}
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-stone-400 border-b border-stone-100">
                          <th className="text-left pb-1.5 font-medium">Ingrediente</th>
                          <th className="text-right pb-1.5 font-medium">Cant.</th>
                          <th className="text-right pb-1.5 font-medium">Precio unit.</th>
                          <th className="text-right pb-1.5 font-medium">Subtotal</th>
                          <th className="text-right pb-1.5 font-medium text-green-600">Ahorro</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grupo.items.map(item => (
                          <tr key={item.ingrediente_id} className="border-b border-stone-50 last:border-0">
                            <td className="py-1.5 text-stone-700">
                              {item.nombre}<span className="text-stone-400 text-xs ml-1">/{item.unidad}</span>
                            </td>
                            <td className="py-1.5 text-right text-stone-600">{item.cantidad}</td>
                            <td className="py-1.5 text-right text-stone-600">{clp(item.precio_unitario)}</td>
                            <td className="py-1.5 text-right font-medium text-stone-800">{clp(item.subtotal)}</td>
                            <td className="py-1.5 text-right text-green-600 text-xs">
                              {item.ahorro_vs_actual > 0 ? clp(item.ahorro_vs_actual) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={3} className="pt-2 text-xs text-stone-400">Total {grupo.proveedor}</td>
                          <td className="pt-2 text-right font-bold text-stone-800">{clp(grupo.total)}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ))}

                {pedido.sin_precio.length > 0 && (
                  <div className="px-5 py-4 bg-amber-50">
                    <p className="text-xs font-semibold text-amber-700 mb-2">
                      Sin precio registrado ({pedido.sin_precio.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {pedido.sin_precio.map(sp => (
                        <span key={sp.ingrediente_id} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                          {sp.nombre} × {sp.cantidad} {sp.unidad}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="px-5 py-4 bg-stone-50 flex justify-between items-center">
                  <div className="text-sm">
                    <span className="text-stone-500">Total general: </span>
                    <span className="font-bold text-stone-800 text-lg">{clp(pedido.total_general)}</span>
                  </div>
                  {pedido.ahorro_estimado > 0 && (
                    <div className="text-sm text-green-600 font-semibold flex items-center gap-1">
                      <TrendingDown size={14} />
                      Ahorro estimado: {clp(pedido.ahorro_estimado)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
      </>
      )}
    </div>
  )
}
