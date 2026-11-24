// Tests for client/src/lib/api.js request body shape.
// Regression coverage for the analyze-idea double-nesting bug where
// `handleAnalyze({ idea })` was passing the wrapper object instead of
// destructuring, causing the server to receive { idea: { idea: '...' } }.

import { analyzeIdea } from './lib/api.js'

let passCount = 0
let failCount = 0
const failures = []

function pass(cond, msg) {
  if (cond) {
    passCount++
    console.log(`  v ${msg}`)
  } else {
    failCount++
    failures.push(msg)
    console.log(`  x ${msg}`)
  }
}

// Mock global fetch - we only care about the request shape.
const captured = []
globalThis.fetch = async (url, init) => {
  captured.push({ url, init })
  // Return a minimal valid analyze response.
  return new Response(JSON.stringify({
    analysis: { product: {}, goals: '', requirements: [], decisions: [], productUnderstanding: {} },
    ambiguity: { state: 'decisions' },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

console.log('='.repeat(60))
console.log('SUITE: analyzeIdea request body shape')
console.log('='.repeat(60))

{
  await analyzeIdea({ idea: 'A simple car game' })
  pass(captured.length === 1, `analyzeIdea fires exactly one fetch (got ${captured.length})`)
  const body = JSON.parse(captured[0].init.body)
  pass(typeof body.idea === 'string',
    `body.idea is a string, not nested (got typeof=${typeof body.idea})`)
  pass(body.idea === 'A simple car game', `body.idea equals input verbatim`)
  pass(captured[0].init.method === 'POST' || captured[0].init.method === undefined,
    `method is POST-or-default (got ${captured[0].init.method})`)
}

{
  captured.length = 0
  await analyzeIdea({ idea: 'Test idea', clarifyingAnswers: [{ q: 'a', a: 'b' }] })
  const body = JSON.parse(captured[0].init.body)
  pass(typeof body.idea === 'string', `clarifying-answers variant: idea is still a string`)
  pass(Array.isArray(body.clarifyingAnswers), `clarifyingAnswers is passed through as array`)
}

console.log('='.repeat(60))
console.log(`RESULTS: ${passCount} passed, ${failCount} failed`)
console.log('='.repeat(60))
if (failCount > 0) {
  console.log('Failures:')
  failures.forEach((f) => console.log(`  - ${f}`))
  process.exit(1)
}
