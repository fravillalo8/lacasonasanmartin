import { useState } from 'react'
import {
  ChefHat, UtensilsCrossed, ShieldCheck, ChevronDown, ChevronRight,
  BookOpen, Printer,
} from 'lucide-react'
import { BRAND } from '../../brand'

type Rol = 'mozo' | 'cocina' | 'admin'

const ROL_COLOR: Record<Rol, string> = {
  mozo: 'bg-sky-100 text-sky-800 border-sky-200',
  cocina: 'bg-orange-100 text-orange-800 border-orange-200',
  admin: 'bg-amber-100 text-amber-800 border-amber-200',
}

const ROL_ICON: Record<Rol, React.ReactNode> = {
  mozo: <UtensilsCrossed size={15} />,
  cocina: <ChefHat size={15} />,
  admin: <ShieldCheck size={15} />,
}

function Badge({ rol }: { rol: Rol }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${ROL_COLOR[rol]}`}>
      {ROL_ICON[rol]} {rol.charAt(0).toUpperCase() + rol.slice(1)}
    </span>
  )
}

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-stone-200 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 bg-stone-50 hover:bg-stone-100 transition-colors text-left"
      >
        <span className="font-semibold text-stone-800 text-base">{title}</span>
        {open ? <ChevronDown size={18} className="text-stone-400" /> : <ChevronRight size={18} className="text-stone-400" />}
      </button>
      {open && <div className="px-6 py-5 space-y-4 bg-white">{children}</div>}
    </div>
  )
}

function Paso({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-amber-500 text-stone-900 text-xs font-black flex items-center justify-center mt-0.5">
        {n}
      </span>
      <p className="text-stone-700 text-sm leading-relaxed">{children}</p>
    </div>
  )
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
      💡 {children}
    </div>
  )
}

function Alerta({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800">
      ⚠️ {children}
    </div>
  )
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="font-semibold text-stone-700 text-sm uppercase tracking-wide mt-2">{children}</h3>
}

export default function Manual() {
  const [filtroRol, setFiltroRol] = useState<Rol | 'todos'>('todos')

  function visible(roles: Rol[]) {
    return filtroRol === 'todos' || roles.includes(filtroRol as Rol)
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6 print:px-0 print:py-0">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={22} className="text-amber-500" />
            <h1 className="text-2xl font-bold text-stone-800">Manual de usuario</h1>
          </div>
          <p className="text-stone-400 text-sm">Zentral Gastro · {BRAND.sub}</p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 border border-stone-200 text-stone-600 hover:bg-stone-50 px-3 py-2 rounded-lg text-sm transition-colors print:hidden"
        >
          <Printer size={15} /> Imprimir
        </button>
      </div>

      {/* Filtro de rol */}
      <div className="flex gap-2 print:hidden">
        <span className="text-xs text-stone-500 self-center mr-1">Filtrar por rol:</span>
        {(['todos', 'mozo', 'cocina', 'admin'] as const).map(r => (
          <button
            key={r}
            type="button"
            onClick={() => setFiltroRol(r)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
              filtroRol === r
                ? 'bg-stone-800 text-white border-stone-800'
                : 'bg-white text-stone-500 border-stone-200 hover:border-stone-400'
            }`}
          >
            {r.charAt(0).toUpperCase() + r.slice(1)}
          </button>
        ))}
      </div>

      {/* ── ACCESO ─────────────────────────────────────────────── */}
      <Section title="🔑 Acceso al sistema" defaultOpen>
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge rol="mozo" /><Badge rol="cocina" /><Badge rol="admin" />
        </div>
        <div className="space-y-2">
          <Paso n={1}>Abre el navegador y ve a <strong>lacasonasanmartin.cl/mesa-central</strong></Paso>
          <Paso n={2}>Ingresa tu <strong>PIN de 4 dígitos</strong> según tu rol y presiona Entrar.</Paso>
          <Paso n={3}>El sistema te lleva directamente a tu panel según el rol.</Paso>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { rol: 'Mozo', desc: 'Mesas, ventas, reservas, clientes', color: 'bg-sky-50 border-sky-200' },
            { rol: 'Cocina', desc: 'Vista de comandas activas en tiempo real', color: 'bg-orange-50 border-orange-200' },
            { rol: 'Admin', desc: 'Acceso completo a todos los módulos', color: 'bg-amber-50 border-amber-200' },
          ].map(r => (
            <div key={r.rol} className={`rounded-xl border p-3 ${r.color}`}>
              <p className="font-semibold text-sm text-stone-800">{r.rol}</p>
              <p className="text-xs text-stone-500 mt-0.5">{r.desc}</p>
            </div>
          ))}
        </div>
        <Tip>Si olvidaste tu PIN, pide al administrador que lo resetee en Configuración.</Tip>
      </Section>

      {/* ── MESAS ─────────────────────────────────────────────── */}
      {visible(['mozo', 'admin']) && (
        <Section title="🍽️ Mesas y comandas" defaultOpen>
          <div className="flex flex-wrap gap-2 mb-4"><Badge rol="mozo" /><Badge rol="admin" /></div>

          <H3>Abrir una mesa</H3>
          <div className="space-y-2">
            <Paso n={1}>Ve a <strong>Mesas</strong> en el menú lateral.</Paso>
            <Paso n={2}>La pantalla muestra todas las mesas con su estado actual:
              <span className="mx-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">Libre</span>
              <span className="mx-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">Ocupada</span>
              <span className="mx-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">Cuenta</span>
            </Paso>
            <Paso n={3}>Haz clic en una mesa libre para abrirla. Se abre el panel de comanda.</Paso>
          </div>

          <H3 >Agregar productos</H3>
          <div className="space-y-2">
            <Paso n={1}>En el panel de comanda, la mitad izquierda muestra el catálogo de productos por categoría.</Paso>
            <Paso n={2}>Haz clic en un producto. Aparece un cuadro de <strong>nota para cocina</strong>.</Paso>
            <Paso n={3}>Si no hay nota, presiona <strong>Enter</strong> directamente — el producto se agrega al instante.</Paso>
            <Paso n={4}>Si necesitas aclarar algo (ej: "sin cebolla"), escríbelo antes de presionar Enter.</Paso>
          </div>
          <Tip>El botón <strong>"86"</strong> sobre cada producto lo marca como Agotado hoy. El producto se deshabilita en la carta digital y en el POS.</Tip>

          <H3>Modificar cantidades</H3>
          <div className="space-y-2">
            <Paso n={1}>En la lista de la comanda (columna derecha), cada ítem tiene botones <strong>−</strong> y <strong>+</strong>.</Paso>
            <Paso n={2}>Presionar <strong>−</strong> cuando la cantidad llega a 0 elimina el ítem automáticamente.</Paso>
          </div>

          <H3>Pedir cuenta</H3>
          <div className="space-y-2">
            <Paso n={1}>Cuando el cliente pide la cuenta, presiona el botón naranja <strong>"Pedir cuenta"</strong>.</Paso>
            <Paso n={2}>La tarjeta de la mesa cambia a estado rojo <strong>Cuenta</strong> — señal visual para el cajero.</Paso>
            <Paso n={3}>El panel se cierra. El cajero abre la mesa y procede al cobro.</Paso>
          </div>

          <H3>Cobrar</H3>
          <div className="space-y-2">
            <Paso n={1}>Haz clic en <strong>"Cobrar mesa"</strong>.</Paso>
            <Paso n={2}>Aplica descuento (%) o propina si corresponde. Usa los botones <strong>5% / 10% / 15%</strong> para propina rápida.</Paso>
            <Paso n={3}>Selecciona el tipo de pago: <strong>Efectivo, Débito, Crédito, Transferencia</strong> o <strong>Terminal MP</strong>.</Paso>
            <Paso n={4}>Para efectivo: ingresa el monto recibido — el sistema calcula el vuelto automáticamente.</Paso>
            <Paso n={5}>Presiona <strong>"Confirmar"</strong>. Puedes imprimir la boleta desde la pantalla de éxito.</Paso>
          </div>
          <Alerta>Al cobrar, el sistema descuenta automáticamente los ingredientes del inventario según la receta de cada producto vendido.</Alerta>

          <H3>Para llevar (Delivery)</H3>
          <div className="space-y-2">
            <Paso n={1}>Presiona el botón <strong>"Para llevar"</strong> en la parte superior de Mesas.</Paso>
            <Paso n={2}>Ingresa el nombre del cliente o número de pedido.</Paso>
            <Paso n={3}>Agrega los productos y cobra igual que una mesa normal.</Paso>
          </div>
        </Section>
      )}

      {/* ── TERMINAL MP ─────────────────────────────────────── */}
      {visible(['mozo', 'admin']) && (
        <Section title="📱 Terminal Mercado Pago Point">
          <div className="flex flex-wrap gap-2 mb-4"><Badge rol="mozo" /><Badge rol="admin" /></div>
          <div className="space-y-2">
            <Paso n={1}>En el panel de cobro, selecciona <strong>Terminal</strong> como tipo de pago.</Paso>
            <Paso n={2}>La primera vez, presiona <strong>"Configurar"</strong> — el sistema detecta los terminales disponibles.</Paso>
            <Paso n={3}>Selecciona tu terminal de la lista. Queda guardado para próximas veces.</Paso>
            <Paso n={4}>Presiona <strong>"Enviar al terminal $X.XXX"</strong>.</Paso>
            <Paso n={5}>El terminal vibra y muestra el monto. El cliente toca o inserta su tarjeta.</Paso>
            <Paso n={6}>El sistema detecta automáticamente si fue débito o crédito y cierra la comanda.</Paso>
          </div>
          <Tip>El terminal debe estar en <strong>modo PDV</strong> (Punto de Venta). Se activa en la app Mercado Pago del celular vinculado: Cobrar → ícono terminal → Modo punto de venta.</Tip>
        </Section>
      )}

      {/* ── COCINA ─────────────────────────────────────────────── */}
      {visible(['cocina', 'admin']) && (
        <Section title="🔥 Vista Cocina" defaultOpen={filtroRol === 'cocina'}>
          <div className="flex flex-wrap gap-2 mb-4"><Badge rol="cocina" /><Badge rol="admin" /></div>
          <div className="space-y-2">
            <Paso n={1}>Accede desde el menú: <strong>Cocina</strong>. La pantalla es oscura, optimizada para ambiente de cocina.</Paso>
            <Paso n={2}>Aparecen todas las comandas abiertas ordenadas por hora de apertura.</Paso>
            <Paso n={3}>El borde de cada tarjeta cambia de color según el tiempo:
              <span className="ml-1 text-xs text-stone-500">(gris = reciente · naranja = +10 min · rojo = +20 min)</span>
            </Paso>
            <Paso n={4}>Cuando terminas de preparar un ítem, presiona el <strong>botón ✓</strong> a su derecha.</Paso>
            <Paso n={5}>El ítem aparece tachado en verde. La barra de progreso muestra cuántos ítems están listos.</Paso>
            <Paso n={6}>La pantalla se actualiza automáticamente cada 30 segundos. Si llega una nueva comanda, suena un <strong>beep de alerta</strong>.</Paso>
          </div>
          <Tip>Puedes actualizar manualmente en cualquier momento con el botón de refresco (↻) en la esquina superior derecha.</Tip>
        </Section>
      )}

      {/* ── RESERVAS ─────────────────────────────────────────────── */}
      {visible(['mozo', 'admin']) && (
        <Section title="📅 Reservas">
          <div className="flex flex-wrap gap-2 mb-4"><Badge rol="mozo" /><Badge rol="admin" /></div>
          <div className="space-y-2">
            <Paso n={1}>Ve a <strong>Reservas</strong> en el menú lateral.</Paso>
            <Paso n={2}>Presiona <strong>"Nueva reserva"</strong> e ingresa: fecha, hora, nombre del cliente, teléfono, número de personas y mesa asignada (opcional).</Paso>
            <Paso n={3}>Los estados disponibles son: <em>Pendiente, Confirmada, Completada, Cancelada</em>.</Paso>
            <Paso n={4}>Actualiza el estado de la reserva a medida que avanza (ej: confirmada por teléfono → Confirmada).</Paso>
          </div>
        </Section>
      )}

      {/* ── ADMIN: PRODUCTOS ─────────────────────────────── */}
      {visible(['admin']) && (
        <Section title="📋 Gestión de carta (Productos)">
          <div className="flex flex-wrap gap-2 mb-4"><Badge rol="admin" /></div>
          <div className="space-y-2">
            <Paso n={1}>Ve a <strong>Carta</strong> en el menú.</Paso>
            <Paso n={2}>Para agregar un producto: <strong>"Nuevo producto"</strong> → nombre, precio, categoría, descripción y foto (URL de imagen).</Paso>
            <Paso n={3}><strong>Receta vinculada</strong>: selecciona qué receta corresponde a este producto. Esto activa el descuento automático de ingredientes al vender.</Paso>
            <Paso n={4}>El botón <strong>Agotado hoy</strong> en la tabla deshabilita el producto en el POS y en la carta digital del QR.</Paso>
          </div>
          <Tip>Los precios de la carta pública en <strong>lacasonasanmartin.cl/carta</strong> se actualizan inmediatamente al guardar.</Tip>
        </Section>
      )}

      {/* ── ADMIN: INGREDIENTES ─────────────────────────── */}
      {visible(['admin']) && (
        <Section title="🧂 Ingredientes e inventario">
          <div className="flex flex-wrap gap-2 mb-4"><Badge rol="admin" /></div>
          <div className="space-y-2">
            <Paso n={1}>Ve a <strong>Ingredientes</strong>. El badge rojo en el menú lateral indica cuántos ingredientes están bajo el mínimo.</Paso>
            <Paso n={2}>Para registrar un ingrediente: nombre, unidad de medida (kg, lt, unidad…), stock actual, stock mínimo y costo unitario.</Paso>
            <Paso n={3}>Para ajustar stock manualmente: botón <strong>Ajustar</strong> → indica cantidad positiva (entrada) o negativa (corrección).</Paso>
            <Paso n={4}>Todo movimiento queda registrado en <strong>Reportes → Movimientos</strong>.</Paso>
          </div>
          <Alerta>El stock se descuenta automáticamente cuando se cobra una comanda que contiene productos con receta. No es necesario ajustarlo manualmente tras cada venta.</Alerta>
        </Section>
      )}

      {/* ── ADMIN: RECETAS ─────────────────────────────── */}
      {visible(['admin']) && (
        <Section title="👨‍🍳 Recetas">
          <div className="flex flex-wrap gap-2 mb-4"><Badge rol="admin" /></div>
          <div className="space-y-2">
            <Paso n={1}>Ve a <strong>Recetas</strong> → <strong>"Nueva receta"</strong>.</Paso>
            <Paso n={2}>Ingresa el nombre, cuántas porciones rinde (ej: 1 porción, 10 empanadas…) y la lista de ingredientes con su cantidad.</Paso>
            <Paso n={3}>Guarda la receta y luego vincúlala al producto en <strong>Carta → editar producto → Receta vinculada</strong>.</Paso>
            <Paso n={4}>El sistema calcula automáticamente el costo de la receta según el precio actual de cada ingrediente.</Paso>
          </div>
          <Tip>Si una receta rinde 10 porciones, al vender 1 shawarma se descuenta 1/10 de cada ingrediente.</Tip>
        </Section>
      )}

      {/* ── ADMIN: COMPRAS ─────────────────────────────── */}
      {visible(['admin']) && (
        <Section title="🛒 Compras (actualizar stock)">
          <div className="flex flex-wrap gap-2 mb-4"><Badge rol="admin" /></div>
          <div className="space-y-2">
            <Paso n={1}>Ve a <strong>Compras</strong> → <strong>"Registrar compra"</strong>.</Paso>
            <Paso n={2}>Ingresa proveedor, fecha y monto total. Agrega los ítems indicando qué ingrediente corresponde a cada línea.</Paso>
            <Paso n={3}>Al guardar, el stock de cada ingrediente sube automáticamente según la cantidad comprada.</Paso>
            <Paso n={4}>Puedes importar facturas SII en formato XML desde el botón <strong>"Importar XML"</strong>.</Paso>
          </div>
        </Section>
      )}

      {/* ── ADMIN: CIERRE CAJA ─────────────────────────── */}
      {visible(['admin']) && (
        <Section title="💰 Cierre de caja">
          <div className="flex flex-wrap gap-2 mb-4"><Badge rol="admin" /></div>
          <div className="space-y-2">
            <Paso n={1}>Ve a <strong>Cierre caja</strong> al final del día.</Paso>
            <Paso n={2}>La pantalla muestra el total de ventas, desglosado por tipo de pago (efectivo, débito, crédito, transferencia).</Paso>
            <Paso n={3}>Registra los gastos del día (personal, servicios, insumos…) con el botón <strong>"Agregar gasto"</strong>.</Paso>
            <Paso n={4}>El resultado neto = ventas − gastos. Si es positivo, el día fue rentable.</Paso>
          </div>
          <Tip>Puedes consultar el cierre de cualquier día pasado seleccionando la fecha en el selector.</Tip>
        </Section>
      )}

      {/* ── ADMIN: REPORTES ─────────────────────────────── */}
      {visible(['admin']) && (
        <Section title="📊 Reportes">
          <div className="flex flex-wrap gap-2 mb-4"><Badge rol="admin" /></div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { nombre: 'Dashboard', desc: 'Resumen general: ventas, alertas, compras del mes' },
              { nombre: 'Top productos', desc: 'Los más vendidos por período' },
              { nombre: 'Horarios pico', desc: 'Mapa de calor de ventas por día y hora' },
              { nombre: 'P&L mensual', desc: 'Ingresos vs egresos mes a mes' },
              { nombre: 'Costos de recetas', desc: 'Costo real vs precio de venta, margen %' },
              { nombre: 'Movimientos stock', desc: 'Entradas y salidas de cada ingrediente' },
            ].map(r => (
              <div key={r.nombre} className="bg-stone-50 border border-stone-100 rounded-xl p-3">
                <p className="font-semibold text-stone-800">{r.nombre}</p>
                <p className="text-xs text-stone-500 mt-0.5">{r.desc}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── ADMIN: COTIZADOR ─────────────────────────────── */}
      {visible(['admin']) && (
        <Section title="🧮 Cotizador de compras">
          <div className="flex flex-wrap gap-2 mb-4"><Badge rol="admin" /></div>
          <div className="space-y-2">
            <Paso n={1}>Ve a <strong>Cotizador</strong>. Muestra una tabla comparativa de precios por proveedor para cada ingrediente.</Paso>
            <Paso n={2}><strong>Pedido óptimo</strong>: selecciona los ingredientes que necesitas y el sistema arma el pedido asignando cada ítem al proveedor más barato.</Paso>
            <Paso n={3}><strong>Predicción de compras</strong>: basado en el consumo histórico, estima qué ingredientes necesitarás en los próximos días.</Paso>
          </div>
        </Section>
      )}

      {/* ── MERMA ─────────────────────────────────────── */}
      {visible(['admin']) && (
        <Section title="🗑️ Merma">
          <div className="flex flex-wrap gap-2 mb-4"><Badge rol="admin" /></div>
          <div className="space-y-2">
            <Paso n={1}>Ve a <strong>Merma</strong> cuando un ingrediente se pierde (vencimiento, accidente, cocción excesiva…).</Paso>
            <Paso n={2}>Registra el ingrediente, la cantidad perdida y el motivo.</Paso>
            <Paso n={3}>El stock se ajusta automáticamente y el costo estimado se suma a los egresos del período.</Paso>
          </div>
        </Section>
      )}

      {/* ── QR CARTA ─────────────────────────────────────── */}
      {visible(['mozo', 'admin']) && (
        <Section title="📲 Carta digital (QR) — multilingüe + alérgenos">
          <div className="flex flex-wrap gap-2 mb-4"><Badge rol="mozo" /><Badge rol="admin" /></div>
          <div className="space-y-2">
            <Paso n={1}>Ve a <strong>QR Menú</strong> para generar el código QR — puedes crear uno <strong>por mesa</strong> (abre la carta apuntando a esa mesa) o uno general del local.</Paso>
            <Paso n={2}>Imprímelo o ponlo en la mesa. Los clientes lo escanean y ven la carta en <strong>lacasonasanmartin.cl/carta</strong>.</Paso>
            <Paso n={3}>La carta se actualiza sola con los precios y productos activos; lo marcado como Agotado no aparece.</Paso>
          </div>
          <H3>Lo nuevo para el comensal</H3>
          <div className="space-y-2">
            <Paso n={1}><strong>3 idiomas</strong>: el cliente cambia entre Español / English / Português con un botón — ideal para turistas.</Paso>
            <Paso n={2}><strong>Alérgenos y dietético</strong>: cada plato muestra sus etiquetas (sin gluten, vegetariano…) y hay un filtro para ver solo lo apto.</Paso>
            <Paso n={3}><strong>Aviso de alergia</strong>: la casilla “⚠️ Tengo alergia / soy celíaco” se antepone al pedido para que cocina lo vea primero.</Paso>
          </div>
          <Tip>Las etiquetas de alérgenos se cargan por producto en <strong>Carta → editar producto → Etiquetas</strong>. La traducción a inglés/portugués la hace la IA y queda cacheada; sin IA se muestra en español.</Tip>
        </Section>
      )}

      {/* ── AUTO-PEDIDO QR ─────────────────────────────────── */}
      {visible(['mozo', 'cocina', 'admin']) && (
        <Section title="🛒 Auto-Pedido desde la mesa (QR)" defaultOpen={filtroRol === 'cocina'}>
          <div className="flex flex-wrap gap-2 mb-4"><Badge rol="mozo" /><Badge rol="cocina" /><Badge rol="admin" /></div>
          <p className="text-stone-600 text-sm">El comensal pide sin esperar al garzón: escanea el QR de su mesa, arma el carrito y envía a cocina.</p>
          <div className="space-y-2 mt-2">
            <Paso n={1}>El QR de la mesa abre <strong>lacasonasanmartin.cl/carta?mesa=N</strong> (N = número de mesa).</Paso>
            <Paso n={2}>El cliente agrega productos al carrito y presiona <strong>“Enviar a cocina”</strong>.</Paso>
            <Paso n={3}>El pedido cae en <strong>Cocina</strong> marcado <strong>“📱 Pedido del cliente (QR)”</strong> para que el garzón lo confirme.</Paso>
            <Paso n={4}><strong>Llamar al garzón</strong>: un botón en la carta avisa a piso/cocina con sonido y un banner, sin levantar la mano.</Paso>
          </div>
          <Alerta>El precio siempre lo pone el sistema (no el cliente) y hay topes anti-abuso por pedido. El garzón valida antes de cobrar.</Alerta>
          <Tip>Para probarlo en la demo: abre <strong>/carta?mesa=1</strong> en el teléfono, manda un pedido y míralo aparecer solo en <strong>Cocina</strong>.</Tip>
        </Section>
      )}

      {/* ── INTELIGENCIA (PANEL DEL DUEÑO) ─────────────────── */}
      {visible(['admin']) && (
        <Section title="🧠 Inteligencia del dueño (Zentral Gastro)">
          <div className="flex flex-wrap gap-2 mb-4"><Badge rol="admin" /></div>
          <p className="text-stone-600 text-sm">Lo que hace a Zentral Gastro más que una caja: te dice qué platos ganan plata, a quién reactivar y dónde se te escapa la caja.</p>

          <H3>Margen Vivo</H3>
          <div className="space-y-2">
            <Paso n={1}>Ve a <strong>Margen Vivo</strong>: muestra el <strong>margen real por plato al día</strong> (precio − costo de receta).</Paso>
            <Paso n={2}>Clasifica el menú por popularidad × margen: <em>Estrella</em> (vende y gana), <em>Caballo</em> (vende poco margen), <em>Dilema</em> (gana pero no vende) y <em>Perro</em> (ni vende ni gana).</Paso>
            <Paso n={3}>Los platos <strong>sin receta cargada</strong> salen avisados — cárgales receta para que entren al cálculo.</Paso>
          </div>

          <H3>Coach del día</H3>
          <div className="space-y-2">
            <Paso n={1}>Ve a <strong>Coach</strong>: recomendaciones concretas del día (qué empujar, qué subir de precio, qué platos no tienen receta).</Paso>
            <Paso n={2}>Con la IA activada el consejo lo redacta Claude; sin IA funciona por reglas.</Paso>
          </div>

          <H3>Fidelización</H3>
          <div className="space-y-2">
            <Paso n={1}>Ve a <strong>Fidelización</strong>: “Puntos que Vuelven” + detección de <strong>clientes dormidos</strong>.</Paso>
            <Paso n={2}>Genera un <strong>mensaje de win-back</strong> listo para copiar y enviar por WhatsApp.</Paso>
          </div>

          <H3>Anulaciones</H3>
          <div className="space-y-2">
            <Paso n={1}>Ve a <strong>Anulaciones</strong>: control anti-fuga — qué se anula, cuánto y por quién.</Paso>
            <Paso n={2}>Es el hueco por donde se va la plata; revísalo seguido.</Paso>
          </div>

          <Tip>El interruptor <strong>modo simple / pro</strong> (arriba en el menú) oculta lo avanzado y deja solo lo esencial para el garzón, o lo muestra todo para el dueño.</Tip>
        </Section>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-stone-400 pt-4 pb-8 print:pb-0">
        Zentral Gastro · {BRAND.sub}
        <br />
        Soporte técnico: <span className="text-stone-500">fravillalo@gmail.com</span>
      </div>
    </div>
  )
}
