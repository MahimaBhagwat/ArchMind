/**
 * components/AuthModal.jsx - Sign-in / register modal.
 *
 * Replaces the inlined AuthModal from App.jsx. Two modes:
 *   - 'login': email + password → POST /api/auth/login
 *   - 'register': email + password → POST /api/auth/register
 *
 * On success, calls onAuth({ token, user }). Errors are routed through
 * `friendlyError` and rendered inline.
 */

import { useEffect, useState } from 'react'
import { Button } from './Button.jsx'
import { login, register } from '../lib/api.js'
import { friendlyError } from '../errorMessages.js'

export function AuthModal({ defaultMode = 'login', prefillEmail, onClose, onAuth }) {
  const [mode, setMode] = useState(defaultMode)
  const [email, setEmail] = useState(prefillEmail || '')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const data = mode === 'login'
        ? await login({ email, password })
        : await register({ email, password })
      onAuth(data)
    } catch (err) {
      setError({ ...err, friendlyMessage: friendlyError(err, 'Authentication failed.') })
    } finally {
      setBusy(false)
    }
  }

  const isRegister = mode === 'register'

  return (
    <div
      className="auth-modal-bg"
      role="dialog"
      aria-modal="true"
      aria-label={isRegister ? 'Create account' : 'Sign in'}
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose() }}
    >
      <div className="auth-modal auth-modal-v2">
        <button className="auth-modal-close" onClick={onClose} aria-label="Close">×</button>
        <div className="eyebrow">{isRegister ? 'Create account' : 'Sign in'}</div>
        <h2>{isRegister ? 'Save your projects' : 'Welcome back'}</h2>
        <p className="auth-modal-sub">
          {isRegister
            ? 'ArchMind only saves your work if you create an account. Anonymous analyze works without sign-up.'
            : 'Sign in to access your saved projects.'}
        </p>

        <form onSubmit={handleSubmit} className="auth-form-v2">
          <label htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={busy}
            autoFocus
          />
          <label htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            type="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={isRegister ? 6 : 1}
            required
            disabled={busy}
          />

          {error && <div className="auth-modal-error">{error.friendlyMessage}</div>}

          <Button type="submit" variant="primary" size="lg" loading={busy}>
            {busy ? (isRegister ? 'Creating account...' : 'Signing in...') : (isRegister ? 'Create account' : 'Sign in')}
          </Button>
        </form>

        <div className="auth-modal-switch">
          {isRegister ? (
            <>Already have an account?{' '}
              <button type="button" className="auth-modal-switch-link" onClick={() => setMode('login')} disabled={busy}>
                Sign in
              </button>
            </>
          ) : (
            <>No account?{' '}
              <button type="button" className="auth-modal-switch-link" onClick={() => setMode('register')} disabled={busy}>
                Create one
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}