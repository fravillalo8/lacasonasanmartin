import { useEffect, useState } from 'react'
import { WifiOff, RefreshCw, Check } from 'lucide-react'
import { useOnlineStatus } from '../../../hooks/useOnlineStatus'
import { offlineQ, syncQueue } from '../api/client'

export default function OfflineBanner() {
  const online = useOnlineStatus()
  const [pending, setPending] = useState(() => offlineQ.count())
  const [syncing, setSyncing] = useState(false)
  const [justSynced, setJustSynced] = useState(false)

  // Recount queue on every render cycle + when going online
  useEffect(() => {
    const tick = setInterval(() => setPending(offlineQ.count()), 1000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    if (!online || offlineQ.count() === 0) return
    setSyncing(true)
    syncQueue().then(({ synced }) => {
      setPending(offlineQ.count())
      setSyncing(false)
      if (synced > 0) {
        setJustSynced(true)
        setTimeout(() => setJustSynced(false), 3000)
      }
    })
  }, [online])

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

  // Online con pendientes pero sin sincronizar aún
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
