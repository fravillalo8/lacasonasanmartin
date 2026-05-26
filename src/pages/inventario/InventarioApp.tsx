import { createContext, useContext, useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { api } from './api/client'
import Sidebar from './components/Sidebar'
import Login from './Login'
import Dashboard from './Dashboard'
import Compras from './Compras'
import Ingredientes from './Ingredientes'
import Recetas from './Recetas'
import Reportes from './Reportes'
import Productos from './Productos'
import Mesas from './Mesas'
import Ventas from './Ventas'
import Cocina from './Cocina'
import Reservas from './Reservas'
import Clientes from './Clientes'
import CierreCaja from './CierreCaja'
import Merma from './Merma'
import QRMenu from './QRMenu'
import Configuracion from './Configuracion'
import Proveedores from './Proveedores'
import Cotizador from './Cotizador'
import Manual from './Manual'

export type Role = 'admin' | 'mozo' | 'cocina'

const RoleCtx = createContext<Role>('mozo')
export const useRole = () => useContext(RoleCtx)

function Layout({ children, role }: { children: React.ReactNode; role: Role }) {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#fafaf9', color: '#1c1917' }}>
      <Sidebar role={role} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}

function RoleGuard({ allow, children }: { allow: Role[]; children: React.ReactNode }) {
  const role = useRole()
  if (!allow.includes(role)) return <Navigate to="/mesa-central" replace />
  return <>{children}</>
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [role, setRole] = useState<Role>('mozo')

  useEffect(() => {
    api.auth
      .me()
      .then(data => {
        const r = (data.role as Role) || 'admin'
        setRole(r)
        localStorage.setItem('inv_role', r)
        setChecking(false)
      })
      .catch(() => {
        localStorage.removeItem('inv_token')
        localStorage.removeItem('inv_role')
        navigate('/mesa-central/login', { replace: true })
      })
  }, [navigate])

  if (checking) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-400 text-sm">
        Verificando acceso…
      </div>
    )
  }

  return <RoleCtx.Provider value={role}>{children}</RoleCtx.Provider>
}

export default function InventarioApp() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route
        path="*"
        element={
          <AuthGuard>
            <RoleCtx.Consumer>
              {role => (
                <Layout role={role}>
                  <Routes>
                    <Route index element={<Dashboard />} />
                    <Route path="mesas" element={<Mesas />} />
                    <Route path="productos" element={<Productos />} />
                    <Route path="ventas" element={<Ventas />} />
                    <Route path="cocina" element={<Cocina />} />
                    <Route path="reservas" element={<Reservas />} />
                    <Route path="clientes" element={<Clientes />} />
                    <Route path="qr" element={<QRMenu />} />
                    {/* Admin-only */}
                    <Route path="cierre" element={<RoleGuard allow={['admin']}><CierreCaja /></RoleGuard>} />
                    <Route path="merma" element={<RoleGuard allow={['admin']}><Merma /></RoleGuard>} />
                    <Route path="compras" element={<RoleGuard allow={['admin']}><Compras /></RoleGuard>} />
                    <Route path="ingredientes" element={<RoleGuard allow={['admin']}><Ingredientes /></RoleGuard>} />
                    <Route path="recetas" element={<RoleGuard allow={['admin']}><Recetas /></RoleGuard>} />
                    <Route path="reportes" element={<RoleGuard allow={['admin']}><Reportes /></RoleGuard>} />
                    <Route path="proveedores" element={<RoleGuard allow={['admin']}><Proveedores /></RoleGuard>} />
                    <Route path="cotizador" element={<RoleGuard allow={['admin']}><Cotizador /></RoleGuard>} />
                    <Route path="config" element={<RoleGuard allow={['admin']}><Configuracion /></RoleGuard>} />
                    <Route path="manual" element={<Manual />} />
                    <Route path="*" element={<Navigate to="/mesa-central" replace />} />
                  </Routes>
                </Layout>
              )}
            </RoleCtx.Consumer>
          </AuthGuard>
        }
      />
    </Routes>
  )
}
