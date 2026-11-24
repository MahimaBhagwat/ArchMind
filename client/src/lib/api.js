/**
 * lib/api.js - Central data layer for the redesigned client.
 *
 * Replaces the inline `authFetch` helper from App.jsx. Preserves the
 * POST-when-body default that prevents the "GET/HEAD method cannot have
 * body" TypeError.
 *
 * Adding per-endpoint helpers here means views don't need to know URL
 * paths or response shapes; they just call `analyze(idea)`, `login(...)`,
 * `loadReport(projectId)`, etc.
 */

const API = import.meta.env.VITE_API_URL || '/api'
const AUTH_URL = `${API}/auth`
const ANALYZE_URL = `${API}/analyze`
const ALTERNATIVES_URL = `${API}/alternatives`
const GENERATE_URL = `${API}/generate`
const PROJECTS_URL = `${API}/projects`

const TOKEN_KEY = 'archmind:token'

/* ─── Token storage ─────────────────────────────────────────────────────── */

export function loadToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function saveToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* private mode / SSR - fall back to window global */
  }
  // Keep window.__token for backward compat with anything reading it.
  window.__token = token || null
}

export function clearToken() {
  saveToken(null)
}

/* ─── Fetch wrapper ─────────────────────────────────────────────────────── */

export async function authFetch(url, { token, body, method, ...opts } = {}) {
  const headers = { ...(opts.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    // Auto-default to POST when body is present (prevents TypeError on
    // missing method). This is the exact behavior the old inline helper had.
    if (!method) method = 'POST'
  }
  const res = await fetch(url, {
    ...opts,
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401 || res.status === 403) {
    window.dispatchEvent(new CustomEvent('archmind:session-expired'))
    throw new Error('Session expired.')
  }
  return res
}

async function readJson(res) {
  if (!res.ok) {
    let payload = null
    try { payload = await res.json() } catch { /* not JSON */ }
    const err = new Error(payload?.error || `Request failed (${res.status}).`)
    if (payload?.classification) err._classification = payload.classification
    if (payload?.retryAfterMs != null) err._retryAfterMs = payload.retryAfterMs
    throw err
  }
  return res.json()
}

/* ─── Auth ──────────────────────────────────────────────────────────────── */

export async function register({ email, password }) {
  const res = await authFetch(`${AUTH_URL}/register`, { body: { email, password } })
  return readJson(res)
}

export async function login({ email, password }) {
  const res = await authFetch(`${AUTH_URL}/login`, { body: { email, password } })
  return readJson(res)
}

/* ─── Analyze flow (public) ─────────────────────────────────────────────── */

export async function analyzeIdea({ idea, clarifyingAnswers }) {
  const res = await authFetch(ANALYZE_URL, {
    body: { idea, clarifyingAnswers: clarifyingAnswers || null },
  })
  return readJson(res)
}

/* ─── Decisions ─────────────────────────────────────────────────────────── */

export async function fetchAlternatives({ idea, decision, clarifyingAnswers }) {
  const res = await authFetch(ALTERNATIVES_URL, {
    token: loadToken(),
    body: { idea, decision },
  })
  return readJson(res)
}

/* ─── Generation ────────────────────────────────────────────────────────── */

export async function generateImplementation({ idea, decisions, analysis }) {
  const res = await authFetch(GENERATE_URL, {
    token: loadToken(),
    body: { idea, decisions, analysis },
  })
  return readJson(res)
}

/* ─── Projects ──────────────────────────────────────────────────────────── */

export async function listProjects() {
  const res = await authFetch(`${PROJECTS_URL}`, {
    token: loadToken(),
    method: 'GET',
  })
  return readJson(res)
}

export async function loadProject(id) {
  const res = await authFetch(`${PROJECTS_URL}/${id}`, {
    token: loadToken(),
    method: 'GET',
  })
  return readJson(res)
}

export async function saveProject({ idea, analysis, decisions, finalPrompt }) {
  const res = await authFetch(PROJECTS_URL, {
    token: loadToken(),
    body: { idea, analysis, decisions, finalPrompt },
  })
  return readJson(res)
}

export async function loadReport(id, { graphDirection = 'TD', perDecisionPrompts } = {}) {
  const res = await authFetch(`${PROJECTS_URL}/${id}/report`, {
    token: loadToken(),
    body: { graphDirection, perDecisionPrompts },
  })
  return readJson(res)
}
