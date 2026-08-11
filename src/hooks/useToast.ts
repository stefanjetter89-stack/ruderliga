import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseToast {
  toastMessage: string | null
  showToast: (message: string) => void
}

export function useToast(durationMs = 2400): UseToast {
  const [message, setMessage] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const showToast = useCallback(
    (next: string) => {
      clearTimeout(timerRef.current)
      setMessage(next)
      timerRef.current = setTimeout(() => setMessage(null), durationMs)
    },
    [durationMs],
  )

  return { toastMessage: message, showToast }
}
