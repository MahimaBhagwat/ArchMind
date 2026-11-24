// Tests for client/src/errorMessages.js
// Plain Node ESM test runner - no React, no jsdom.

import { friendlyAnalyzeError, friendlyError, errorFromResponse } from './errorMessages.js'

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
    console.log(`  ✗ ${msg}`)
  }
}

console.log('='.repeat(60))
console.log('SUITE 1: friendlyAnalyzeError - classification branches')
console.log('='.repeat(60))

// quota - clear daily-limit message
{
  const err = new Error('quota error')
  err._classification = 'quota'
  const out = friendlyAnalyzeError(err, 'fallback')
  pass(/free-tier limit/i.test(out), `quota → free-tier message (got: ${out})`)
  pass(out !== 'fallback', `quota overrides fallback`)
}

// overload - retryable temporary message
{
  const err = new Error('overload error')
  err._classification = 'overload'
  const out = friendlyAnalyzeError(err, 'fallback')
  pass(/try again/i.test(out) && /busy|moment/i.test(out), `overload → retryable message (got: ${out})`)
}

// malformed - unexpected response
{
  const err = new Error('malformed')
  err._classification = 'malformed'
  const out = friendlyAnalyzeError(err, 'fallback')
  pass(/unexpected response/i.test(out), `malformed → unexpected response message (got: ${out})`)
}

// auth - contact support
{
  const err = new Error('auth')
  err._classification = 'auth'
  const out = friendlyAnalyzeError(err, 'fallback')
  pass(/authentication failed/i.test(out), `auth → auth failed message (got: ${out})`)
}

// network - check connection
{
  const err = new Error('network')
  err._classification = 'network'
  const out = friendlyAnalyzeError(err, 'fallback')
  pass(/can't reach|connection/i.test(out), `network → connection message (got: ${out})`)
}

// unknown - falls through to friendlyError
{
  const err = new Error('something weird')
  err._classification = 'unknown'
  const out = friendlyAnalyzeError(err, 'fallback')
  pass(out === 'something weird' || out === 'fallback', `unknown → falls through to friendlyError (got: ${out})`)
}

// no classification - falls through
{
  const err = new Error('some message')
  const out = friendlyAnalyzeError(err, 'fallback')
  pass(out === 'some message', `no classification → uses error.message (got: ${out})`)
}

console.log('')
console.log('='.repeat(60))
console.log('SUITE 2: friendlyError - network/parse fallbacks')
console.log('='.repeat(60))

{
  const err = new Error('Failed to fetch')
  const out = friendlyError(err, 'fallback')
  pass(/can't reach the server/i.test(out), `Failed to fetch → server-unreachable message (got: ${out})`)
}

{
  const err = new Error('NetworkError when attempting to fetch resource.')
  const out = friendlyError(err, 'fallback')
  pass(/can't reach the server/i.test(out), `NetworkError → server-unreachable message`)
}

{
  const err = new Error('Unexpected token < in JSON at position 0')
  const out = friendlyError(err, 'fallback')
  pass(/unexpected response/i.test(out), `JSON parse error → unexpected response message (got: ${out})`)
}

{
  const err = new Error('Not valid JSON')
  const out = friendlyError(err, 'fallback')
  pass(/unexpected response/i.test(out), `Not valid JSON → unexpected response message`)
}

{
  const err = new Error('Some specific backend message')
  const out = friendlyError(err, 'fallback')
  pass(out === 'Some specific backend message', `plain message → passed through (got: ${out})`)
}

{
  const err = new Error('')
  const out = friendlyError(err, 'fallback')
  pass(out === 'fallback', `empty message → uses fallback`)
}

{
  const err = new Error('xyz')
  const out = friendlyError(err, 'fallback')
  pass(out === 'fallback', `short non-message text → uses fallback`)
}

console.log('')
console.log('='.repeat(60))
console.log('SUITE 3: errorFromResponse - propagation')
console.log('='.repeat(60))

{
  const e = errorFromResponse({ error: 'quota hit', classification: 'quota', retryAfterMs: 44000 })
  pass(e instanceof Error, `returns an Error instance`)
  pass(e.message === 'quota hit', `preserves error.message`)
  pass(e._classification === 'quota', `carries _classification`)
  pass(e._retryAfterMs === 44000, `carries _retryAfterMs`)
}

{
  const e = errorFromResponse({ error: 'bad' })
  pass(e instanceof Error, `missing classification → still an Error`)
  pass(e._classification === undefined, `missing classification → _classification undefined`)
}

{
  const e = errorFromResponse({})
  pass(e instanceof Error, `empty body → still an Error`)
  pass(e.message === 'Analysis failed.', `empty body → default message`)
}

console.log('')
console.log('='.repeat(60))
console.log(`RESULTS: ${passCount} passed, ${failCount} failed`)
console.log('='.repeat(60))

if (failCount > 0) {
  console.log('Failures:')
  for (const f of failures) console.log(`  - ${f}`)
  process.exit(1)
}
process.exit(0)
