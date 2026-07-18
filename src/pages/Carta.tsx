import { useEffect, useMemo, useState } from 'react'

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

  // Auto-Pedido: activo sólo si la URL trae ?mesa=<id> válido y la mesa existe
  const mesaId = useMemo(() => {
    const m = new URLSearchParams(window.location.search).get('mesa')
    return m && /^\d+$/.test(m) ? Number(m) : null
  }, [])
  const [mesa, setMesa] = useState<{ numero: number; nombre: string } | null>(null)
  const [cart, setCart] = useState<Record<number, number>>({})
  const [open, setOpen] = useState(false)
  const [comentario, setComentario] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<{ numero_mesa: number; numero_ticket: number; total: number; no_disponibles: number } | null>(null)
  const [error, setError] = useState('')
  const [llamando, setLlamando] = useState(false)
  const [llamado, setLlamado] = useState(false)

  useEffect(() => {
    fetch(`${BASE}/productos/carta`)
      .then(r => r.json())
      .then((data: Producto[]) => { setProductos(data.filter(p => p.activo)); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (mesaId == null) return
    fetch(`${BASE}/carta/mesa/${mesaId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) setMesa({ numero: d.numero, nombre: d.nombre || '' }) })
      .catch(() => {})
  }, [mesaId])

  const ordering = mesaId != null && mesa != null
  const byId = (id: number) => productos.find(p => p.id === id)
  const inc = (id: number) => setCart(c => ({ ...c, [id]: (c[id] || 0) + 1 }))
  const dec = (id: number) => setCart(c => {
    const n = (c[id] || 0) - 1
    const cc = { ...c }
    if (n <= 0) delete cc[id]; else cc[id] = n
    return cc
  })
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0)
  const cartTotal = Object.entries(cart).reduce((a, [id, q]) => a + (byId(Number(id))?.precio || 0) * q, 0)

  async function enviar() {
    setSending(true); setError('')
    try {
      const items = Object.entries(cart).map(([id, q]) => ({ producto_id: Number(id), cantidad: q }))
      const res = await fetch(`${BASE}/carta/pedido`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mesa_id: mesaId, items, comentario }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.detail || 'No se pudo enviar el pedido')
      setSent({ numero_mesa: d.numero_mesa, numero_ticket: d.numero_ticket, total: d.total, no_disponibles: d.no_disponibles || 0 })
      setCart({}); setComentario(''); setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar. Revisa tu conexión.')
    } finally { setSending(false) }
  }

  async function llamar() {
    if (mesaId == null || llamando) return
    setLlamando(true)
    try {
      await fetch(`${BASE}/carta/llamar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mesa_id: mesaId }),
      })
      setLlamado(true)
      setTimeout(() => setLlamado(false), 4000)
    } catch { /* silencioso */ } finally { setLlamando(false) }
  }

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
    <div className="min-h-screen bg-stone-950 text-stone-100 pb-24">
      {/* Header */}
      <header className="bg-stone-950 border-b border-stone-800 sticky top-0 z-20 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-amber-400 tracking-wide">La Casona San Martín</h1>
            <p className="text-xs text-stone-400">Cocina árabe · Rinconada, Los Andes</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {ordering ? (
              <>
                <span className="text-xs font-bold bg-amber-500 text-stone-900 px-2.5 py-1 rounded-full">
                  Mesa {mesa!.numero}
                </span>
                <button type="button" onClick={llamar} disabled={llamando}
                  className="text-xs text-amber-300 border border-amber-700/50 rounded-full px-2.5 py-1 hover:bg-amber-500/10 disabled:opacity-50 transition-colors">
                  🔔 {llamando ? 'Llamando…' : 'Garzón'}
                </button>
              </>
            ) : (
              <>
                <span className="text-xs text-stone-500">Carta digital</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-emerald-400">Abierto</span>
                </div>
              </>
            )}
          </div>
        </div>

        {catsSorted.length > 0 && (
          <div className="max-w-4xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
            {catsSorted.map(cat => (
              <a key={cat} href={`#cat-${cat}`}
                className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-stone-700 text-stone-400 hover:border-amber-500 hover:text-amber-400 transition-colors">
                {cat}
              </a>
            ))}
          </div>
        )}
      </header>

      {/* Hint cuando NO hay mesa (solo ver) */}
      {mesaId == null && !loading && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <p className="text-center text-xs text-stone-500 bg-stone-900 border border-stone-800 rounded-xl py-2 px-3">
            📱 Escanea el QR de tu mesa para pedir directo desde aquí.
          </p>
        </div>
      )}

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
              {categorias[cat].map(p => {
                const qty = cart[p.id] || 0
                return (
                  <div key={p.id}
                    className={`group relative bg-stone-900 rounded-2xl overflow-hidden border transition-all duration-300 ${qty > 0 ? 'border-amber-600' : 'border-stone-800 hover:border-amber-800/50'} ${p.agotado_hoy ? 'opacity-50' : ''}`}>
                    {p.foto ? (
                      <div className="relative h-48 overflow-hidden">
                        <img src={p.foto} alt={p.nombre} loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/20 to-transparent" />
                        {p.agotado_hoy && (
                          <div className="absolute inset-0 flex items-center justify-center bg-stone-950/60">
                            <span className="bg-red-900/80 text-red-200 text-xs font-semibold px-3 py-1 rounded-full">Agotado hoy</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-32 bg-stone-800 flex items-center justify-center"><span className="text-4xl">🥙</span></div>
                    )}

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-stone-100 text-base leading-snug">{p.nombre}</h3>
                        <span className="shrink-0 text-amber-400 font-bold text-lg">{clp(p.precio)}</span>
                      </div>
                      {p.descripcion && <p className="text-stone-400 text-sm mt-1 leading-relaxed">{p.descripcion}</p>}

                      {ordering && !p.agotado_hoy && (
                        <div className="mt-3 flex items-center justify-end">
                          {qty === 0 ? (
                            <button type="button" onClick={() => inc(p.id)}
                              className="bg-amber-500 hover:bg-amber-400 text-stone-900 font-semibold text-sm px-4 py-1.5 rounded-full transition-colors">
                              + Agregar
                            </button>
                          ) : (
                            <div className="flex items-center gap-3">
                              <button type="button" onClick={() => dec(p.id)}
                                className="w-8 h-8 rounded-full bg-stone-800 text-amber-400 text-xl font-bold leading-none flex items-center justify-center">−</button>
                              <span className="font-bold text-amber-400 w-5 text-center tabular-nums">{qty}</span>
                              <button type="button" onClick={() => inc(p.id)}
                                className="w-8 h-8 rounded-full bg-amber-500 text-stone-900 text-xl font-bold leading-none flex items-center justify-center">+</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
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

      <footer className="border-t border-stone-800 mt-16 py-8 text-center text-stone-600 text-xs space-y-1">
        <p className="text-stone-400 font-medium">La Casona San Martín</p>
        <p>Cocina árabe · Rinconada de Los Andes</p>
        <p className="mt-3">Los precios incluyen IVA · Carta sujeta a disponibilidad</p>
      </footer>

      {/* Toast: llamado al garzón */}
      {llamado && (
        <div className="fixed top-4 inset-x-0 z-50 flex justify-center px-4">
          <div className="bg-emerald-500 text-stone-900 font-semibold text-sm px-4 py-2 rounded-full shadow-lg">
            🙌 Ya le avisamos al garzón
          </div>
        </div>
      )}

      {/* Barra flotante del pedido */}
      {ordering && cartCount > 0 && !open && !sent && (
        <div className="fixed bottom-0 inset-x-0 z-30 p-3 bg-gradient-to-t from-stone-950 via-stone-950/90 to-transparent">
          <button type="button" onClick={() => setOpen(true)}
            className="max-w-4xl mx-auto w-full flex items-center justify-between bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold rounded-2xl px-5 py-3.5 shadow-xl transition-colors">
            <span>🛒 Ver mi pedido · {cartCount} {cartCount === 1 ? 'ítem' : 'ítems'}</span>
            <span className="tabular-nums">{clp(cartTotal)}</span>
          </button>
        </div>
      )}

      {/* Drawer del pedido */}
      {open && (
        <div className="fixed inset-0 z-40 flex items-end">
          <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-4xl mx-auto bg-stone-900 rounded-t-3xl border-t border-stone-700 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800">
              <div>
                <p className="font-bold text-amber-400">Tu pedido</p>
                <p className="text-xs text-stone-400">Mesa {mesa!.numero}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-stone-400 text-2xl leading-none px-2">×</button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3 divide-y divide-stone-800">
              {Object.entries(cart).map(([id, q]) => {
                const p = byId(Number(id))
                if (!p) return null
                return (
                  <div key={id} className="flex items-center gap-3 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-100 truncate">{p.nombre}</p>
                      <p className="text-xs text-stone-400">{clp(p.precio)} c/u</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button type="button" onClick={() => dec(p.id)} className="w-7 h-7 rounded-full bg-stone-800 text-amber-400 text-lg leading-none">−</button>
                      <span className="font-bold text-amber-400 w-4 text-center tabular-nums">{q}</span>
                      <button type="button" onClick={() => inc(p.id)} className="w-7 h-7 rounded-full bg-amber-500 text-stone-900 text-lg leading-none">+</button>
                    </div>
                    <span className="w-16 text-right font-semibold text-stone-200 tabular-nums">{clp(p.precio * q)}</span>
                  </div>
                )
              })}

              <div className="py-3">
                <textarea value={comentario} onChange={e => setComentario(e.target.value)}
                  placeholder="¿Alguna indicación? (sin cebolla, bien cocido…)" rows={2}
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none" />
              </div>
            </div>

            {error && <p className="px-5 text-sm text-red-400">{error}</p>}

            <div className="px-5 py-4 border-t border-stone-800 space-y-3">
              <div className="flex justify-between text-lg font-bold">
                <span className="text-stone-300">Total</span>
                <span className="text-amber-400 tabular-nums">{clp(cartTotal)}</span>
              </div>
              <button type="button" onClick={enviar} disabled={sending || cartCount === 0}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-900 font-bold py-3.5 rounded-2xl transition-colors">
                {sending ? 'Enviando…' : 'Enviar a cocina 🔥'}
              </button>
              <p className="text-center text-xs text-stone-500">Un garzón confirmará tu pedido en la mesa.</p>
            </div>
          </div>
        </div>
      )}

      {/* Éxito */}
      {sent && (
        <div className="fixed inset-0 z-50 bg-stone-950/97 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center text-4xl mb-5">✓</div>
          <h2 className="text-2xl font-bold text-stone-100">¡Pedido enviado a la cocina! 🔥</h2>
          <p className="text-stone-400 mt-2">Mesa {sent.numero_mesa} · Ticket #{sent.numero_ticket}</p>
          <p className="text-amber-400 font-bold text-xl mt-1 tabular-nums">{clp(sent.total)}</p>
          {sent.no_disponibles > 0 && (
            <p className="text-amber-400/90 text-xs mt-3 max-w-xs">
              Nota: {sent.no_disponibles} producto(s) ya no estaban disponibles y no se agregaron.
            </p>
          )}
          <p className="text-stone-500 text-sm mt-4 max-w-xs">Ya se está preparando. Un garzón pasará a confirmar y cobrar en tu mesa.</p>
          <button type="button" onClick={() => setSent(null)}
            className="mt-8 border border-stone-700 text-stone-200 font-semibold px-6 py-2.5 rounded-2xl hover:bg-stone-900 transition-colors">
            Pedir algo más
          </button>
        </div>
      )}
    </div>
  )
}
