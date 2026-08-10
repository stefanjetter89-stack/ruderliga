import { useCallback, useRef, useState } from 'react'

export function useToast() {
  const [message, setMessage] = useState(null)
  const timerRef = useRef(null)

  const showToast = useCallback((msg) => {
    clearTimeout(timerRef.current)
    setMessage(msg)
    timerRef.current = setTimeout(() => setMessage(null), 2400)
  }, [])

  return { toastMessage: message, showToast }
}
