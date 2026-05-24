import { useEffect, useRef, useState } from 'react'
import { api } from './api/client'
import type { Producto } from './api/client'
import { QrCode, Download, ExternalLink, Copy, Check } from 'lucide-react'

const MENU_URL = 'https://lacasonasanmartin.cl/carta'

function clpFormat(n: number) {
  return `$${Math.round(n).toLocaleString('es-CL')}`
}

export default function QRMenu() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [copied, setCopied] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.productos.list(true).then(setProductos)
  }, [])

  function copyLink() {
    navigator.clipboard.writeText(MENU_URL).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // QR using a public API (qrserver.com)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(MENU_URL)}&bgcolor=fff&color=1c1917&qzone=2`

  const categorias: Record<string, Producto[]> = {}
  for (const p of productos.filter(p => !p.agotado_hoy)) {
    if (!categorias[p.categoria]) categorias[p.categoria] = []
    categorias[p.categoria].push(p)
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">QR del menú</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* QR Card */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <QrCode size={18} className="text-amber-500" />
            <h2 className="font-semibold text-stone-700">Código QR de la carta</h2>
          </div>

          <div ref={qrRef} className="flex justify-center p-4 bg-stone-50 rounded-xl">
            <img
              src={qrUrl}
              alt="QR Carta"
              className="w-48 h-48"
            />
          </div>

          <div className="flex items-center gap-2 bg-stone-50 rounded-xl px-3 py-2">
            <p className="flex-1 text-xs text-stone-500 truncate">{MENU_URL}</p>
            <button
              type="button"
              onClick={copyLink}
              className="text-stone-400 hover:text-amber-500 transition-colors shrink-0"
              title="Copiar enlace"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            </button>
          </div>

          <div className="flex gap-3">
            <a
              href={qrUrl}
              download="carta-qr.png"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-900 font-semibold rounded-xl py-2 text-sm transition-colors"
            >
              <Download size={15} /> Descargar QR
            </a>
            <a
              href={MENU_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 border border-stone-200 rounded-xl px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 transition-colors"
            >
              <ExternalLink size={15} /> Ver carta
            </a>
          </div>

          <p className="text-xs text-stone-400 text-center">
            Imprime este QR y ponlo en cada mesa para que los clientes vean el menú digital.
          </p>
        </div>

        {/* Preview de la carta */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 bg-stone-900">
            <p className="text-amber-400 font-bold">La Casona San Martín</p>
            <p className="text-xs text-stone-400">Carta digital — {productos.filter(p => !p.agotado_hoy).length} productos disponibles</p>
          </div>
          <div className="p-4 max-h-[440px] overflow-y-auto space-y-4">
            {Object.entries(categorias).sort().map(([cat, prods]) => (
              <div key={cat}>
                <h3 className="text-xs uppercase tracking-widest text-stone-400 font-semibold mb-2">{cat || 'Sin categoría'}</h3>
                <div className="space-y-1">
                  {prods.map(p => (
                    <div key={p.id} className="flex justify-between items-center py-1.5 border-b border-stone-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-stone-800">{p.nombre}</p>
                        {p.descripcion && <p className="text-xs text-stone-400">{p.descripcion}</p>}
                      </div>
                      <span className="text-sm font-bold text-amber-600 ml-4 shrink-0">{clpFormat(p.precio)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {Object.keys(categorias).length === 0 && (
              <p className="text-center text-stone-400 text-sm py-8">Sin productos activos</p>
            )}
          </div>
        </div>
      </div>

      {/* Agotados */}
      {productos.filter(p => p.agotado_hoy).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-2">Productos agotados hoy (no aparecen en la carta):</p>
          <div className="flex flex-wrap gap-2">
            {productos.filter(p => p.agotado_hoy).map(p => (
              <span key={p.id} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{p.nombre}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
