/**
 * lib/priorities.js - Normalize + classify decision priority.
 *
 * Used by client & DecisionFlowView. Mirrors the server-side logic in
 * services/decisionFlow.js - keep them in sync if you ever change one.
 */

const VALID = ['Critical', 'High', 'Medium', 'Low']

export function normalizePriority(v) {
  if (typeof v !== 'string') return 'Medium'
  const norm = v.trim()
  if (VALID.includes(norm)) return norm
  if (/critical|essential|mandatory/i.test(norm)) return 'Critical'
  if (/high|major|important/i.test(norm)) return 'High'
  if (/medium|moderate|standard/i.test(norm)) return 'Medium'
  if (/low|optional|minor/i.test(norm)) return 'Low'
  return 'Medium'
}

export function priorityRank(v) {
  const norm = normalizePriority(v)
  return VALID.indexOf(norm) // 0 = Critical
}

export function comparePriority(a, b) {
  return priorityRank(a) - priorityRank(b)
}