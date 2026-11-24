/**
 * components/ErrorBanner.jsx - Consistent error surface.
 *
 * Replaces inline `.error-banner` divs scattered through App.jsx. Routes
 * through `friendlyError` so AI classification metadata becomes a
 * human-readable message; `onRetry` is optional.
 */

import { friendlyError, friendlyAnalyzeError } from '../errorMessages.js'
import { Button } from './Button.jsx'

export function ErrorBanner({
  error,
  message, // optional explicit-message shortcut (skips friendly routing)
  fallback = 'Something went wrong.',
  kind = 'generic', // 'generic' | 'analyze'
  onRetry,
  onDismiss,
}) {
  const text =
    typeof message === 'string' && message
      ? message
      : kind === 'analyze'
      ? friendlyAnalyzeError(error, fallback)
      : friendlyError(error, fallback)

  return (
    <div className="error-banner-v2" role="alert">
      <div className="error-banner-v2-text">{text}</div>
      <div className="error-banner-v2-actions">
        {onRetry && (
          <Button variant="ghost" onClick={onRetry}>
            Try again
          </Button>
        )}
        {onDismiss && (
          <Button variant="ghost" onClick={onDismiss}>
            Dismiss
          </Button>
        )}
      </div>
    </div>
  )
}