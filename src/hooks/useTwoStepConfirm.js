import { useEffect, useRef, useState } from 'react'

// Generic two-step "are you sure" for destructive actions (session delete,
// leaving a crew): first click arms it, second click within the window
// confirms, anything else (timeout, click elsewhere) disarms it again.
export function useTwoStepConfirm(onConfirm, windowMs = 4000) {
  const [armed, setArmed] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  function handleClick() {
    if (armed) {
      clearTimeout(timerRef.current)
      setArmed(false)
      onConfirm()
      return
    }
    setArmed(true)
    timerRef.current = setTimeout(() => setArmed(false), windowMs)
  }

  function cancel() {
    clearTimeout(timerRef.current)
    setArmed(false)
  }

  return { armed, handleClick, cancel }
}
