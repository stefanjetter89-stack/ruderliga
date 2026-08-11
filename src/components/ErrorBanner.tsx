interface ErrorBannerProps {
  message: string
  onRetry?: (() => void) | undefined
}

/** Surfaces a load failure with a way out, instead of an empty screen. */
export default function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="error-banner" role="alert">
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="error-retry" onClick={onRetry}>
          Erneut versuchen
        </button>
      )}
    </div>
  )
}
