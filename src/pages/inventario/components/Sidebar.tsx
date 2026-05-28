import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  ChefHat,
  BarChart3,
  LogOut,
  UtensilsCrossed,
  BookOpen,
  Banknote,
  FlameKindling,
  CalendarDays,
  Users,
  Wallet,
  Trash2,
  QrCode,
  Settings,
  Truck,
  Calculator,
  HelpCircle,
  Shield,
} from 'lucide-react'
import type { Role } from '../InventarioApp'

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  mozo: 'Mozo',
  cocina: 'Cocina',
}

const ROLE_COLORS: Record<Role, string> = {
  admin: 'bg-amber-500 text-stone-900',
  mozo: 'bg-sky-500 text-white',
  cocina: 'bg-orange-500 text-white',
}

type NavItem = { to: string; label: string; icon: React.ElementType; end?: boolean; roles: Role[] }

const NAV: NavItem[] = [
  { to: '/mesa-central', label: 'Dashboard', icon: LayoutDashboard, end: true, roles: ['admin', 'mozo', 'cocina'] },
  { to: '/mesa-central/mesas', label: 'Mesas', icon: UtensilsCrossed, roles: ['admin', 'mozo'] },
  { to: '/mesa-central/productos', label: 'Carta', icon: BookOpen, roles: ['admin', 'mozo'] },
  { to: '/mesa-central/ventas', label: 'Ventas', icon: Banknote, roles: ['admin', 'mozo'] },
  { to: '/mesa-central/cocina', label: 'Cocina', icon: FlameKindling, roles: ['admin', 'mozo', 'cocina'] },
  { to: '/mesa-central/reservas', label: 'Reservas', icon: CalendarDays, roles: ['admin', 'mozo'] },
  { to: '/mesa-central/clientes', label: 'Clientes', icon: Users, roles: ['admin', 'mozo'] },
  { to: '/mesa-central/qr', label: 'QR Menú', icon: QrCode, roles: ['admin', 'mozo'] },
  { to: '/mesa-central/cierre', label: 'Cierre caja', icon: Wallet, roles: ['admin'] },
  { to: '/mesa-central/merma', label: 'Merma', icon: Trash2, roles: ['admin'] },
  { to: '/mesa-central/compras', label: 'Compras', icon: ShoppingCart, roles: ['admin'] },
  { to: '/mesa-central/ingredientes', label: 'Ingredientes', icon: Package, roles: ['admin'] },
  { to: '/mesa-central/recetas', label: 'Recetas', icon: ChefHat, roles: ['admin'] },
  { to: '/mesa-central/proveedores', label: 'Proveedores', icon: Truck, roles: ['admin'] },
  { to: '/mesa-central/cotizador', label: 'Cotizador', icon: Calculator, roles: ['admin'] },
  { to: '/mesa-central/reportes', label: 'Reportes', icon: BarChart3, roles: ['admin'] },
  { to: '/mesa-central/auditoria', label: 'Auditoría', icon: Shield, roles: ['admin'] },
  { to: '/mesa-central/config', label: 'Configuración', icon: Settings, roles: ['admin'] },
  { to: '/mesa-central/manual', label: 'Manual', icon: HelpCircle, roles: ['admin', 'mozo', 'cocina'] },
]

export default function Sidebar({ role }: { role: Role }) {
  const navigate = useNavigate()
  const visible = NAV.filter(item => item.roles.includes(role))
  const [stockAlertas, setStockAlertas] = useState(0)

  useEffect(() => {
    const fetchAlertas = () =>
      api.ingredientes.alertas().then(a => setStockAlertas(a.length)).catch(() => {})
    fetchAlertas()
    const t = setInterval(fetchAlertas, 60000)
    return () => clearInterval(t)
  }, [])

  function logout() {
    localStorage.removeItem('inv_token')
    localStorage.removeItem('inv_role')
    navigate('/mesa-central/login')
  }

  return (
    <aside className="w-56 min-h-screen bg-stone-900 flex flex-col text-stone-100">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-stone-700">
        <p className="text-amber-400 font-bold text-lg tracking-tight">MesaControl</p>
        <p className="text-xs text-stone-400 leading-tight mt-0.5">La Casona San Martín</p>
        <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-semibold ${ROLE_COLORS[role]}`}>
          {ROLE_LABELS[role]}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visible.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-amber-500 text-stone-900 font-semibold'
                  : 'text-stone-300 hover:bg-stone-800 hover:text-white'
              }`
            }
          >
            <Icon size={17} />
            <span className="flex-1">{label}</span>
            {to === '/mesa-central/ingredientes' && stockAlertas > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-0.5">
                {stockAlertas > 9 ? '9+' : stockAlertas}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-6">
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-stone-400 hover:bg-stone-800 hover:text-red-400 transition-colors"
        >
          <LogOut size={17} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
