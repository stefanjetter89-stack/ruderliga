import { useEffect, useRef } from 'react'

/**
 * Re-runs `refresh` when the tab regains focus or becomes visible again.
 *
 * The crew's whole point is comparing against someone training elsewhere, so a
 * device that only loaded on mount would show a stale board until reloaded by
 * hand. `minIntervalMs` keeps rapid tab-switching from hammering the API.
 */
export function useRefreshOnFocus(refresh: () => void, minIntervalMs = 30000): void {
  const lastRun = useRef(Date.now())
  const refreshRef = useRef(refresh)
  refreshRef.current = refresh

  useEffect(() => {
    function maybeRefresh() {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      if (now - lastRun.current < minIntervalMs) return
      lastRun.current = now
      refreshRef.current()
    }

    window.addEventListener('focus', maybeRefresh)
    document.addEventListener('visibilitychange', maybeRefresh)
    return () => {
      window.removeEventListener('focus', maybeRefresh)
      document.removeEventListener('visibilitychange', maybeRefresh)
    }
  }, [minIntervalMs])
}
