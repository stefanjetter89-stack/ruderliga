import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseTwoStepConfirm {
  armed: boolean
  handleClick: () => void
  cancel: () => void
}

/**
 * Two-step confirmation for destructive actions: the first click arms it, a
 * second click within the window carries it out, and a timeout disarms it.
 *
 * Deliberately not wired to mouseleave — a pointer drifting off the button
 * between the two clicks would silently cancel the confirmation, and on touch
 * devices there is no hover to leave in the first place.
 */
export function useTwoStepConfirm(onConfirm: () => void, windowMs = 4000): UseTwoStepConfirm {
  const [armed, setArmed] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const onConfirmRef = useRef(onConfirm)
  onConfirmRef.current = onConfirm

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const cancel = useCallback(() => {
    clearTimeout(timerRef.current)
    setArmed(false)
  }, [])

  const handleClick = useCallback(() => {
    if (armed) {
      clearTimeout(timerRef.current)
      setArmed(false)
      onConfirmRef.current()
      return
    }
    setArmed(true)
    timerRef.current = setTimeout(() => setArmed(false), windowMs)
  }, [armed, windowMs])

  return { armed, handleClick, cancel }
}
