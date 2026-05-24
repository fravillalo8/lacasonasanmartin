import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from './api/client'
import { Lock } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { token, role } = await api.auth.login(pin)
      localStorage.setItem('inv_token', token)
      localStorage.setItem('inv_role', role)
      navigate('/mesa-central')
    } catch {
      setError('PIN incorrecto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafaf9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500 mb-4">
            <Lock size={26} className="text-stone-900" />
          </div>
          <h1 className="text-stone-900 text-xl font-semibold">MesaControl</h1>
          <p className="text-stone-500 text-sm mt-1">La Casona San Martín</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 space-y-4 shadow-sm border border-stone-200">
          <div>
            <label className="block text-stone-600 text-sm mb-1.5">PIN de acceso</label>
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="••••"
              className="w-full bg-stone-100 text-stone-900 rounded-lg px-4 py-3 text-lg tracking-widest outline-none focus:ring-2 focus:ring-amber-500 placeholder-stone-400"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !pin}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-900 font-semibold py-3 rounded-lg transition-colors"
          >
            {loading ? 'Verificando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
