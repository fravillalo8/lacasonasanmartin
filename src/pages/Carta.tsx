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
  etiquetas: string
}

function clp(n: number) {
  return `$${Math.round(n).toLocaleString('es-CL')}`
}

const CAT_ORDER = ['Shawarma', 'Bandeja', 'Entradas', 'Acompañamientos', 'Combos', 'Bebidas']

// Idiomas de la carta
const LANGS = [
  { code: 'es', flag: '🇨🇱', label: 'Español' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'pt', flag: '🇧🇷', label: 'Português' },
]

const DIET_ICON: Record<string, string> = {
  vegetariano: '🌱', vegano: 'Ⓥ', sin_gluten: '🌾', sin_lactosa: '🥛', picante: '🌶️',
}
const DIET_LABEL: Record<string, Record<string, string>> = {
  es: { vegetariano: 'Vegetariano', vegano: 'Vegano', sin_gluten: 'Sin gluten', sin_lactosa: 'Sin lactosa', picante: 'Picante' },
  en: { vegetariano: 'Vegetarian', vegano: 'Vegan', sin_gluten: 'Gluten-free', sin_lactosa: 'Lactose-free', picante: 'Spicy' },
  pt: { vegetariano: 'Vegetariano', vegano: 'Vegano', sin_gluten: 'Sem glúten', sin_lactosa: 'Sem lactose', picante: 'Picante' },
}
const DIET_KEYS = ['vegetariano', 'vegano', 'sin_gluten', 'sin_lactosa', 'picante']

// Textos de la interfaz por idioma
const UI: Record<string, Record<string, string>> = {
  es: { abierto: 'Abierto', carta: 'Carta digital', hint: '📱 Escanea el QR de tu mesa para pedir directo desde aquí.', todos: 'Todos', ver: 'Ver mi pedido', item: 'ítem', items: 'ítems', pedido: 'Tu pedido', total: 'Total', enviar: 'Enviar a cocina 🔥', enviando: 'Enviando…', indic: '¿Alguna indicación? (sin cebolla, bien cocido…)', confirma: 'Un garzón confirmará tu pedido en la mesa.', garzon: 'Garzón', llamando: 'Llamando…', avisado: '🙌 Ya le avisamos al garzón', agregar: '+ Agregar', enviado: '¡Pedido enviado a la cocina! 🔥', preparando: 'Ya se está preparando. Un garzón pasará a confirmar y cobrar en tu mesa.', otro: 'Pedir algo más', alergia: '⚠️ Tengo alergia / soy celíaco', nodisp: 'producto(s) ya no estaban disponibles y no se agregaron.', agotado: 'Agotado hoy', novacio: 'Carta no disponible por el momento.' },
  en: { abierto: 'Open', carta: 'Digital menu', hint: '📱 Scan your table QR to order right from here.', todos: 'All', ver: 'View my order', item: 'item', items: 'items', pedido: 'Your order', total: 'Total', enviar: 'Send to kitchen 🔥', enviando: 'Sending…', indic: 'Any notes? (no onion, well done…)', confirma: 'A waiter will confirm your order at the table.', garzon: 'Waiter', llamando: 'Calling…', avisado: '🙌 We let the waiter know', agregar: '+ Add', enviado: 'Order sent to the kitchen! 🔥', preparando: 'It is being prepared. A waiter will confirm and charge at your table.', otro: 'Order more', alergia: '⚠️ I have an allergy / I am celiac', nodisp: 'item(s) were no longer available and were not added.', agotado: 'Sold out today', novacio: 'Menu not available right now.' },
  pt: { abierto: 'Aberto', carta: 'Cardápio digital', hint: '📱 Escaneie o QR da sua mesa para pedir daqui.', todos: 'Todos', ver: 'Ver meu pedido', item: 'item', items: 'itens', pedido: 'Seu pedido', total: 'Total', enviar: 'Enviar à cozinha 🔥', enviando: 'Enviando…', indic: 'Alguma observação? (sem cebola, bem passado…)', confirma: 'Um garçom confirmará seu pedido na mesa.', garzon: 'Garçom', llamando: 'Chamando…', avisado: '🙌 Já avisamos o garçom', agregar: '+ Adicionar', enviado: 'Pedido enviado à cozinha! 🔥', preparando: 'Já está sendo preparado. Um garçom vai confirmar e cobrar na sua mesa.', otro: 'Pedir mais', alergia: '⚠️ Tenho alergia / sou celíaco', nodisp: 'item(ns) não estavam mais disponíveis e não foram adicionados.', agotado: 'Esgotado hoje', novacio: 'Cardápio indisponível no momento.' },
}

export default function Carta() {
  const [lang, setLang] = useState('es')
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [diet, setDiet] = useState('')   // filtro dietético ('' = todos)

  const t = (k: string) => UI[lang]?.[k] ?? UI.es[k]

  const mesaId = useMemo(() => {
    const m = new URLSearchParams(window.location.search).get('mesa')
    return m && /^\d+$/.test(m) ? Number(m) : null
  }, [])
  const [mesa, setMesa] = useState<{ numero: number; nombre: string } | null>(null)
  const [cart, setCart] = useState<Record<number, number>>({})
  const [open, setOpen] = useState(false)
  const [comentario, setComentario] = useState('')
  const [alergia, setAlergia] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<{ numero_mesa: number; numero_ticket: number; total: number; no_disponibles: number } | null>(null)
  const [error, setError] = useState('')
  const [llamando, setLlamando] = useState(false)
  const [llamado, setLlamado] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`${BASE}/carta/menu?lang=${lang}`)
      .then(r => r.json())
      .then((d: { productos?: Producto[] }) => { setProductos((d.productos || []).filter(p => p.activo)); setLoading(false) })
      .catch(() => setLoading(false))
  }, [lang])

  useEffect(() => {
    if (mesaId == null) return
    fetch(`${BASE}/carta/mesa/${mesaId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) setMesa({ numero: d.numero, nombre: d.nombre || '' }) })
      .catch(() => {})
  }, [mesaId])

  const ordering = mesaId != null && mesa != null
  const byId = (id: number) => productos.find(p => p.id === id)
  const tagsOf = (p: Producto) => (p.etiquetas || '').split(',').map(s => s.trim()).filter(Boolean)
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
      const coment = (alergia ? '⚠️ ALERGIA/CELÍACO. ' : '') + comentario
      const res = await fetch(`${BASE}/carta/pedido`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mesa_id: mesaId, items, comentario: coment }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.detail || 'No se pudo enviar el pedido')
      setSent({ numero_mesa: d.numero_mesa, numero_ticket: d.numero_ticket, total: d.total, no_disponibles: d.no_disponibles || 0 })
      setCart({}); setComentario(''); setAlergia(false); setOpen(false)
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
      setLlamado(true); setTimeout(() => setLlamado(false), 4000)
    } catch { /* silencioso */ } finally { setLlamando(false) }
  }

  const shown = diet ? productos.filter(p => tagsOf(p).includes(diet)) : productos
  const categorias: Record<string, Producto[]> = {}
  for (const p of shown) {
    if (!categorias[p.categoria]) categorias[p.categoria] = []
    categorias[p.categoria].push(p)
  }
  const catsSorted = [
    ...CAT_ORDER.filter(c => categorias[c]),
    ...Object.keys(categorias).filter(c => !CAT_ORDER.includes(c)),
  ]

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 pb-24">
      <header className="bg-stone-950 border-b border-stone-800 sticky top-0 z-20 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-amber-400 tracking-wide">La Casona San Martín</h1>
            <p className="text-xs text-stone-400">Cocina árabe · Rinconada, Los Andes</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {ordering ? (
              <>
                <span className="text-xs font-bold bg-amber-500 text-stone-900 px-2.5 py-1 rounded-full">Mesa {mesa!.numero}</span>
                <button type="button" onClick={llamar} disabled={llamando}
                  className="text-xs text-amber-300 border border-amber-700/50 rounded-full px-2.5 py-1 hover:bg-amber-500/10 disabled:opacity-50 transition-colors">
                  🔔 {llamando ? t('llamando') : t('garzon')}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-400">{t('abierto')}</span>
              </div>
            )}
            {/* Selector de idioma */}
            <div className="flex gap-1">
              {LANGS.map(l => (
                <button key={l.code} type="button" onClick={() => setLang(l.code)} title={l.label}
                  className={`text-base leading-none rounded-md px-1 transition-opacity ${lang === l.code ? 'opacity-100' : 'opacity-40 hover:opacity-80'}`}>
                  {l.flag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filtro dietético */}
        {productos.some(p => tagsOf(p).length > 0) && (
          <div className="max-w-4xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
            <button type="button" onClick={() => setDiet('')}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${diet === '' ? 'bg-amber-500 border-amber-500 text-stone-900 font-semibold' : 'border-stone-700 text-stone-400'}`}>
              {t('todos')}
            </button>
            {DIET_KEYS.filter(k => productos.some(p => tagsOf(p).includes(k))).map(k => (
              <button key={k} type="button" onClick={() => setDiet(diet === k ? '' : k)}
                className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${diet === k ? 'bg-emerald-500 border-emerald-500 text-white font-semibold' : 'border-stone-700 text-stone-400'}`}>
                {DIET_ICON[k]} {DIET_LABEL[lang][k]}
              </button>
            ))}
          </div>
        )}
      </header>

      {mesaId == null && !loading && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <p className="text-center text-xs text-stone-500 bg-stone-900 border border-stone-800 rounded-xl py-2 px-3">{t('hint')}</p>
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
              <span className="flex-1 h-px bg-stone-800" />{cat}<span className="flex-1 h-px bg-stone-800" />
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categorias[cat].map(p => {
                const qty = cart[p.id] || 0
                const ptags = tagsOf(p)
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
                            <span className="bg-red-900/80 text-red-200 text-xs font-semibold px-3 py-1 rounded-full">{t('agotado')}</span>
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

                      {ptags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {ptags.map(k => DIET_LABEL[lang][k] && (
                            <span key={k} className="text-[10px] bg-stone-800 text-emerald-300 border border-emerald-900/50 px-2 py-0.5 rounded-full">
                              {DIET_ICON[k]} {DIET_LABEL[lang][k]}
                            </span>
                          ))}
                        </div>
                      )}

                      {ordering && !p.agotado_hoy && (
                        <div className="mt-3 flex items-center justify-end">
                          {qty === 0 ? (
                            <button type="button" onClick={() => inc(p.id)}
                              className="bg-amber-500 hover:bg-amber-400 text-stone-900 font-semibold text-sm px-4 py-1.5 rounded-full transition-colors">
                              {t('agregar')}
                            </button>
                          ) : (
                            <div className="flex items-center gap-3">
                              <button type="button" onClick={() => dec(p.id)} className="w-8 h-8 rounded-full bg-stone-800 text-amber-400 text-xl font-bold leading-none flex items-center justify-center">−</button>
                              <span className="font-bold text-amber-400 w-5 text-center tabular-nums">{qty}</span>
                              <button type="button" onClick={() => inc(p.id)} className="w-8 h-8 rounded-full bg-amber-500 text-stone-900 text-xl font-bold leading-none flex items-center justify-center">+</button>
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

        {!loading && shown.length === 0 && (
          <div className="text-center py-20 text-stone-500">
            <p className="text-4xl mb-4">🥙</p>
            <p>{t('novacio')}</p>
          </div>
        )}
      </main>

      <footer className="border-t border-stone-800 mt-16 py-8 text-center text-stone-600 text-xs space-y-1">
        <p className="text-stone-400 font-medium">La Casona San Martín</p>
        <p>Cocina árabe · Rinconada de Los Andes</p>
        <p className="mt-3">Los precios incluyen IVA · Carta sujeta a disponibilidad</p>
      </footer>

      {llamado && (
        <div className="fixed top-4 inset-x-0 z-50 flex justify-center px-4">
          <div className="bg-emerald-500 text-stone-900 font-semibold text-sm px-4 py-2 rounded-full shadow-lg">{t('avisado')}</div>
        </div>
      )}

      {ordering && cartCount > 0 && !open && !sent && (
        <div className="fixed bottom-0 inset-x-0 z-30 p-3 bg-gradient-to-t from-stone-950 via-stone-950/90 to-transparent">
          <button type="button" onClick={() => setOpen(true)}
            className="max-w-4xl mx-auto w-full flex items-center justify-between bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold rounded-2xl px-5 py-3.5 shadow-xl transition-colors">
            <span>🛒 {t('ver')} · {cartCount} {cartCount === 1 ? t('item') : t('items')}</span>
            <span className="tabular-nums">{clp(cartTotal)}</span>
          </button>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-40 flex items-end">
          <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-4xl mx-auto bg-stone-900 rounded-t-3xl border-t border-stone-700 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800">
              <div>
                <p className="font-bold text-amber-400">{t('pedido')}</p>
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

              <div className="py-3 space-y-2">
                <label className="flex items-center gap-2 text-sm text-amber-300 cursor-pointer">
                  <input type="checkbox" checked={alergia} onChange={e => setAlergia(e.target.checked)} className="accent-amber-500 w-4 h-4" />
                  {t('alergia')}
                </label>
                <textarea value={comentario} onChange={e => setComentario(e.target.value)}
                  placeholder={t('indic')} rows={2}
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none" />
              </div>
            </div>

            {error && <p className="px-5 text-sm text-red-400">{error}</p>}

            <div className="px-5 py-4 border-t border-stone-800 space-y-3">
              <div className="flex justify-between text-lg font-bold">
                <span className="text-stone-300">{t('total')}</span>
                <span className="text-amber-400 tabular-nums">{clp(cartTotal)}</span>
              </div>
              <button type="button" onClick={enviar} disabled={sending || cartCount === 0}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-900 font-bold py-3.5 rounded-2xl transition-colors">
                {sending ? t('enviando') : t('enviar')}
              </button>
              <p className="text-center text-xs text-stone-500">{t('confirma')}</p>
            </div>
          </div>
        </div>
      )}

      {sent && (
        <div className="fixed inset-0 z-50 bg-stone-950/97 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center text-4xl mb-5">✓</div>
          <h2 className="text-2xl font-bold text-stone-100">{t('enviado')}</h2>
          <p className="text-stone-400 mt-2">Mesa {sent.numero_mesa} · Ticket #{sent.numero_ticket}</p>
          <p className="text-amber-400 font-bold text-xl mt-1 tabular-nums">{clp(sent.total)}</p>
          {sent.no_disponibles > 0 && (
            <p className="text-amber-400/90 text-xs mt-3 max-w-xs">{sent.no_disponibles} {t('nodisp')}</p>
          )}
          <p className="text-stone-500 text-sm mt-4 max-w-xs">{t('preparando')}</p>
          <button type="button" onClick={() => setSent(null)}
            className="mt-8 border border-stone-700 text-stone-200 font-semibold px-6 py-2.5 rounded-2xl hover:bg-stone-900 transition-colors">
            {t('otro')}
          </button>
        </div>
      )}
    </div>
  )
}
