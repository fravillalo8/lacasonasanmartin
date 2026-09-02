import { useState } from 'react'
import { Download, Shield, Users, Database, CheckCircle2 } from 'lucide-react'
import { hoyCL } from './api/fecha'

const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api'

function getToken() {
  return localStorage.getItem('inv_token') || ''
}

export default function Configuracion() {
  const [downloading, setDownloading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleBackup() {
    setDownloading(true)
    setError('')
    setDone(false)
    try {
      const res = await fetch(`${BASE}/admin/backup`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) throw new Error('Error al generar backup')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      // El nombre lleva el día CHILENO: un respaldo bajado a las 21:00 se
      // llamaba con la fecha de mañana y no calzaba con el día que respalda.
      a.download = `mesacontrol_backup_${hoyCL()}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setDone(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-semibold text-stone-800 mb-6">Configuración</h1>

      {/* Seguridad */}
      <section className="mb-6 bg-white rounded-xl border border-stone-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={18} className="text-amber-500" />
          <h2 className="font-semibold text-stone-700">Seguridad</h2>
        </div>
        <ul className="space-y-2 text-sm text-stone-600">
          <li className="flex items-start gap-2">
            <CheckCircle2 size={15} className="text-green-500 mt-0.5 shrink-0" />
            CORS restringido a <code className="bg-stone-100 px-1 rounded">lacasonasanmartin.cl</code>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={15} className="text-green-500 mt-0.5 shrink-0" />
            Rate limiting activo: máx. 5 intentos por minuto por IP
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={15} className="text-green-500 mt-0.5 shrink-0" />
            Tokens JWT con expiración de 24h
          </li>
        </ul>
        <p className="mt-4 text-xs text-stone-400">
          Para cambiar PINs, actualiza las variables de entorno en Railway:
          <br />
          <code className="bg-stone-100 px-1 rounded">ADMIN_PIN</code> ·{' '}
          <code className="bg-stone-100 px-1 rounded">MOZO_PIN</code> ·{' '}
          <code className="bg-stone-100 px-1 rounded">COCINA_PIN</code>
        </p>
      </section>

      {/* Roles */}
      <section className="mb-6 bg-white rounded-xl border border-stone-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users size={18} className="text-amber-500" />
          <h2 className="font-semibold text-stone-700">Roles y accesos</h2>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex gap-3 items-start">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500 text-stone-900 shrink-0">Admin</span>
            <span className="text-stone-600">Acceso completo: todas las secciones, reportes, cierre de caja, backup</span>
          </div>
          <div className="flex gap-3 items-start">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-sky-500 text-white shrink-0">Mozo</span>
            <span className="text-stone-600">Mesas, carta, ventas, cocina, reservas, clientes, QR menú</span>
          </div>
          <div className="flex gap-3 items-start">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-500 text-white shrink-0">Cocina</span>
            <span className="text-stone-600">Solo vista de cocina y dashboard</span>
          </div>
        </div>
      </section>

      {/* Backup */}
      <section className="bg-white rounded-xl border border-stone-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Database size={18} className="text-amber-500" />
          <h2 className="font-semibold text-stone-700">Respaldo de datos</h2>
        </div>
        <p className="text-sm text-stone-500 mb-4">
          Descarga un archivo ZIP con todas las tablas de la base de datos en formato JSON.
          Guárdalo en un lugar seguro.
        </p>
        <button
          onClick={handleBackup}
          disabled={downloading}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-900 font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <Download size={16} />
          {downloading ? 'Generando backup…' : 'Descargar backup'}
        </button>
        {done && (
          <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
            <CheckCircle2 size={14} /> Backup descargado correctamente
          </p>
        )}
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </section>
    </div>
  )
}
