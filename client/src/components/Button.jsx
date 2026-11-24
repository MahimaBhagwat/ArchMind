/**
 * components/Button.jsx - Single button primitive, replaces the four
 * parallel classes (.btn-primary / .btn-secondary / .btn-ghost / .btn-generate).
 *
 * Keep the class names around - existing CSS still references them on
 * inline buttons throughout App.jsx. This component is for NEW views.
 */

const VARIANT_TO_CLASS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  generate: 'btn-generate',
  danger: 'btn-danger',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}) {
  const cls = VARIANT_TO_CLASS[variant] || 'btn-primary'
  const sizeCls = size === 'lg' ? ' btn-lg' : ''
  const loadingCls = loading ? ' btn-loading' : ''
  return (
    <button
      className={`${cls}${sizeCls}${loadingCls}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="btn-spinner" aria-hidden="true" />}
      {children}
    </button>
  )
}