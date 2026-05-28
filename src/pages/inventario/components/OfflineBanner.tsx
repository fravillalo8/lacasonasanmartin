import { useEffect, useState } from 'react'
import { WifiOff, RefreshCw, Check, AlertTriangle, X } from 'lucide-react'
import { useOnlineStatus } from '../../../hooks/useOnlineStatus'
import { offlineQ, syncQueue } from '../api/client'

export default function OfflineBanner() {
  const online = useOnlineStatus()
  const [pending, setPending] = useState(() => offlineQ.count())
  const [syncing, setSyncing] = useState(false)
  const [justSynced, setJustSynced] = useState(false)
  const [failedCount, setFailedCount] = useState(0)
  const [showConflicts, setShowConflicts] = useState(false)

  // Recount queue on every render cycle
  useEffect(() => {
    const tick = setInterval(() => setPending(offlineQ.count()), 1000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    if (!online || offlineQ.count() === 0) return
    setSyncing(true)
    syncQueue().then(({ synced, failed }) => {
      setPending(offlineQ.count())
      setSyncing(false)
      if (failed > 0) {
        setFailedCount(failed)
        setShowConflicts(true)
      }
      if (synced > 0) {
        setJustSynced(true)
        setTimeout(() => setJustSynced(false), 3000)
      }
    })
  }, [online])

  // Conflictos fallidos — banner dismissible
  if (showConflicts && failedCount > 0) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white text-xs flex items-center justify-center gap-2 py-1.5 px-4 shadow-lg">
        <AlertTriangle size={13} className="shrink-0" />
        <span className="font-semibold">
          {failedCount} operación{failedCount > 1 ? 'es' : ''} offline no se pudo{failedCount > 1 ? 'ron' : ''} sincronizar
          {' '}(cambios en conflicto — la versión del servidor prevalece)
        </span>
        <button
          type="button"
          onClick={() => { setShowConflicts(false); setFailedCount(0) }}
          className="ml-2 hover:opacity-80"
          aria-label="Cerrar aviso de conflictos"
        >
          <X size={13} />
        </button>
      </div>
    )
  }

  // Nada que mostrar: online y sin pendientes (y no recién sincronizado)
  if (online && pending === 0 && !syncing && !justSynced) return null

  if (!online) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] bg-stone-800 text-white text-xs flex items-center justify-center gap-2 py-1.5 px-4 shadow-lg">
        <WifiOff size={13} className="shrink-0" />
        <span className="font-semibold">Sin conexión</span>
        {pending > 0 && (
          <span className="bg-amber-500 text-stone-900 font-bold px-2 py-0.5 rounded-full ml-1">
            {pending} pendiente{pending > 1 ? 's' : ''}
          </span>
        )}
      </div>
    )
  }

  if (syncing) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] bg-sky-600 text-white text-xs flex items-center justify-center gap-2 py-1.5 px-4 shadow-lg">
        <RefreshCw size={13} className="animate-spin shrink-0" />
        <span className="font-semibold">Sincronizando {pending} operación{pending > 1 ? 'es' : ''}…</span>
      </div>
    )
  }

  if (justSynced) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] bg-emerald-600 text-white text-xs flex items-center justify-center gap-2 py-1.5 px-4 shadow-lg">
        <Check size={13} className="shrink-0" />
        <span className="font-semibold">Sincronización completada</span>
      </div>
    )
  }

  if (pending > 0) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-stone-900 text-xs flex items-center justify-center gap-2 py-1.5 px-4 shadow-lg">
        <RefreshCw size={13} className="shrink-0" />
        <span className="font-semibold">{pending} operación{pending > 1 ? 'es' : ''} pendiente{pending > 1 ? 's' : ''} de sincronizar</span>
      </div>
    )
  }

  return null
}
