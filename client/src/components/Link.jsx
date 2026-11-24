/**
 * components/Link.jsx - Tiny <button>-as-link primitive.
 *
 * The topbar uses button styling but the semantics of a navigation link.
 * Centralizes the button-vs-link decision and gives us a single place to
 * add keyboard handling / focus styling later.
 */
export function Link({ className = '', as: As = 'button', ...props }) {
  return <As className={`link ${className}`} {...props} />
}