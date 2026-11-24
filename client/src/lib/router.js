/**
 * lib/router.js - minimal URL → view bridge for ArchMind.
 *
 * Maps the in-memory view state to URL paths so:
 *   - Deep-links work: /decision/real-time-sync, /projects/:id/report, etc.
 *   - Browser back/forward move through the user's flow.
 *   - Refresh on a non-persistent view falls back to landing.
 *
 * Avoids pulling in a full router dependency for a 10-route state graph.
 * Persisted views (anything that points at a saved project) survive
 * refresh; session-state views (flow, decisionDetail) lose state on
 * refresh and re-enter through landing - that's the right behavior.
 */

import { useEffect, useState, useCallback } from 'react'

// View → path (and reverse) tables.
// Path params use :name syntax.
const ROUTES = [
  { view: 'home', path: '/' },
  { view: 'landing', path: '/start' },
  { view: 'clarify', path: '/clarify' },
  { view: 'analysis', path: '/analysis' },
  { view: 'flow', path: '/flow' },
  // decisionDetail carries a stable decision key (title or category)
  { view: 'decisionDetail', path: '/decision/:decisionKey' },
  { view: 'prompt', path: '/prompt' },
  { view: 'no-decisions', path: '/no-decisions' },
  { view: 'projects', path: '/projects' },
  // projectDetail + report both carry the project id
  { view: 'projectDetail', path: '/projects/:id' },
  { view: 'report', path: '/projects/:id/report' },
]

// Compiles a route pattern like '/decision/:decisionKey' into a RegExp
// and returns the param names in order.
function compilePattern(pattern) {
  const paramNames = []
  const regex = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/:(\w+)/g, (_, name) => {
      paramNames.push(name)
      return '([^/]+)'
    })
  return { regex: new RegExp(`^${regex}$`), paramNames }
}

const COMPILED = ROUTES.map((r) => ({
  ...r,
  ...compilePattern(r.path),
}))

// Convert a view + params to a URL path. Params is an object whose keys
// must match the param names in the route's path.
export function viewToPath(view, params = {}) {
  const route = ROUTES.find((r) => r.view === view)
  if (!route) return '/'
  return Object.entries(params).reduce(
    (path, [key, val]) => path.replace(`:${key}`, encodeURIComponent(val)),
    route.path
  )
}

// Parse a URL path into { view, params } or null if no match.
export function pathToView(pathname) {
  for (const route of COMPILED) {
    const m = route.regex.exec(pathname)
    if (m) {
      const params = {}
      route.paramNames.forEach((name, i) => {
        params[name] = decodeURIComponent(m[i + 1])
      })
      return { view: route.view, params }
    }
  }
  return null
}

// Hook: returns [path, navigate] where path is the current pathname and
// navigate(toPath) pushes a new history entry.
export function usePath() {
  const [path, setPath] = useState(() => window.location.pathname)
  useEffect(() => {
    function onPop() {
      setPath(window.location.pathname)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  const navigate = useCallback((nextPath, { replace = false } = {}) => {
    if (nextPath === window.location.pathname) return
    if (replace) {
      window.history.replaceState({}, '', nextPath)
    } else {
      window.history.pushState({}, '', nextPath)
    }
    setPath(nextPath)
  }, [])
  return [path, navigate]
}

// Replace current path without adding a history entry (for syncing URL
// with in-memory view changes triggered by state, not user clicks).
export function syncPath(nextPath) {
  if (nextPath !== window.location.pathname) {
    window.history.replaceState({}, '', nextPath)
  }
}
