/**
 * components/LoadingShell.jsx - Consistent loading state.
 *
 * Replaces the mix of "spinner-row", bare text, and inline CSS animations
 * scattered through App.jsx. Centered, scoped to the page, with an
 * optional helper line.
 */

export function LoadingShell({ label = 'Loading...', helper = '' }) {
  return (
    <div className="loading-shell" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <div className="loading-label">{label}</div>
      {helper && <div className="loading-helper">{helper}</div>}
    </div>
  )
}