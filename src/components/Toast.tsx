interface ToastProps {
  message: string | null
}

export default function Toast({ message }: ToastProps) {
  return (
    // aria-live so the confirmation ("Neue Bestzeit!") is announced rather than
    // being a purely visual event. polite: it must not cut off other speech.
    <div className={`toast ${message ? 'show' : ''}`} role="status" aria-live="polite">
      {message}
    </div>
  )
}
