import { useEffect, useState } from 'react'

const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api'

interface Producto {
  id: number
  nombre: string
  descripcion: string
  precio: number
  categoria: string
  foto: string
  activo: boolean
  agotado_hoy: boolean
}

function clp(n: number) {
  return `$${Math.round(n).toLocaleString('es-CL')}`
}

const CAT_ORDER = ['Shawarma', 'Bandeja', 'Entradas', 'Acompañamientos', 'Combos', 'Bebidas']

export default function Carta() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${BASE}/productos/carta`)
      .then(r => r.json())
      .then((data: Producto[]) => {
        setProductos(data.filter(p => p.activo))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const categorias: Record<string, Producto[]> = {}
  for (const p of productos) {
    if (!categorias[p.categoria]) categorias[p.categoria] = []
    categorias[p.categoria].push(p)
  }

  const catsSorted = [
    ...CAT_ORDER.filter(c => categorias[c]),
    ...Object.keys(categorias).filter(c => !CAT_ORDER.includes(c)),
  ]

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      {/* Header */}
      <header className="bg-stone-950 border-b border-stone-800 sticky top-0 z-20 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-amber-400 tracking-wide">La Casona San Martín</h1>
            <p className="text-xs text-stone-400">Cocina árabe · Rinconada, Los Andes</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-stone-500">Carta digital</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400">Abierto</span>
            </div>
          </div>
        </div>

        {/* Category nav */}
        {catsSorted.length > 0 && (
          <div className="max-w-4xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
            {catsSorted.map(cat => (
              <a
                key={cat}
                href={`#cat-${cat}`}
                className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-stone-700 text-stone-400 hover:border-amber-500 hover:text-amber-400 transition-colors"
              >
                {cat}
              </a>
            ))}
          </div>
        )}
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-12">
        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && catsSorted.map(cat => (
          <section key={cat} id={`cat-${cat}`}>
            <h2 className="text-xs uppercase tracking-[0.2em] text-amber-500 font-semibold mb-6 flex items-center gap-3">
              <span className="flex-1 h-px bg-stone-800" />
              {cat}
              <span className="flex-1 h-px bg-stone-800" />
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categorias[cat].map(p => (
                <div
                  key={p.id}
                  className={`group relative bg-stone-900 rounded-2xl overflow-hidden border border-stone-800 hover:border-amber-800/50 transition-all duration-300 ${p.agotado_hoy ? 'opacity-50' : ''}`}
                >
                  {/* Image */}
                  {p.foto ? (
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={p.foto}
                        alt={p.nombre}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/20 to-transparent" />
                      {p.agotado_hoy && (
                        <div className="absolute inset-0 flex items-center justify-center bg-stone-950/60">
                          <span className="bg-red-900/80 text-red-200 text-xs font-semibold px-3 py-1 rounded-full">
                            Agotado hoy
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-32 bg-stone-800 flex items-center justify-center">
                      <span className="text-4xl">🥙</span>
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-stone-100 text-base leading-snug">{p.nombre}</h3>
                      <span className="shrink-0 text-amber-400 font-bold text-lg">{clp(p.precio)}</span>
                    </div>
                    {p.descripcion && (
                      <p className="text-stone-400 text-sm mt-1 leading-relaxed">{p.descripcion}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {!loading && productos.length === 0 && (
          <div className="text-center py-20 text-stone-500">
            <p className="text-4xl mb-4">🥙</p>
            <p>Carta no disponible por el momento.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-800 mt-16 py-8 text-center text-stone-600 text-xs space-y-1">
        <p className="text-stone-400 font-medium">La Casona San Martín</p>
        <p>Cocina árabe · Rinconada de Los Andes</p>
        <p className="mt-3">Los precios incluyen IVA · Carta sujeta a disponibilidad</p>
      </footer>
    </div>
  )
}
