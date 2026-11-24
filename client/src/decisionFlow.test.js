/**
 * decisionFlow.test.js - Pure tests for client/src/decisionFlow.js (browser port).
 *
 * Run: node src/decisionFlow.test.js
 * (Node ≥ 20 supports ESM natively - no transpiler needed.)
 */

import {
  computeFlowState,
  computeNextDecision,
  markResolved,
  markSkipped,
  recordClarifyingAnswers,
  shouldSuggestClarify,
  summarizeProgress,
} from './decisionFlow.js';

let passCount = 0;
let failCount = 0;

function pass(cond, msg) {
  if (cond) {
    console.log('  v', msg);
    passCount++;
  } else {
    console.log('  ✗', msg);
    failCount++;
  }
}

console.log('\n' + '='.repeat(60));
console.log('CLIENT DECISION FLOW TESTS');
console.log('='.repeat(60));

// ─── Suite 1: computeNextDecision ordering ─────────────────────────────

console.log('\nSUITE 1: computeNextDecision ordering');

{
  const decisions = [
    { title: 'Auth', priority: 'High', status: 'unresolved' },
    { title: 'Database', priority: 'Critical', status: 'unresolved' },
    { title: 'UI', priority: 'Medium', status: 'unresolved' },
  ];
  const next = computeNextDecision(decisions);
  pass(next?.title === 'Database', 'Critical priority comes first');
}

// ─── Suite 2: dependency-skip propagation ─────────────────────────────

console.log('\nSUITE 2: dependency-skip propagation');

{
  let decisions = [
    { title: 'Backend', priority: 'Critical', status: 'unresolved' },
    { title: 'Database', priority: 'High', status: 'unresolved', dependsOn: ['Backend'] },
    { title: 'ORM', priority: 'Medium', status: 'unresolved', dependsOn: ['Database'] },
  ];
  decisions = markSkipped(decisions, 'Backend');
  pass(decisions.find((d) => d.title === 'Backend').status === 'skipped', 'Backend skipped');
  pass(decisions.find((d) => d.title === 'Database').status === 'skipped', 'Database auto-skipped');
  pass(decisions.find((d) => d.title === 'ORM').status === 'skipped', 'ORM auto-skipped');
}

// ─── Suite 3: flow state summary ─────────────────────────────────────

console.log('\nSUITE 3: flow state summary');

{
  const decisions = [
    { title: 'D1', priority: 'Critical', status: 'resolved' },
    { title: 'D2', priority: 'High', status: 'unresolved' },
    { title: 'D3', priority: 'Medium', status: 'skipped' },
  ];
  const state = computeFlowState(decisions);
  pass(state.current?.title === 'D2', 'current = D2 (only unresolved)');
  pass(state.upcoming.length === 0, 'no upcoming');
  pass(state.resolved.length === 1, '1 resolved');
  pass(state.skipped.length === 1, '1 skipped');
}

// ─── Suite 4: shouldSuggestClarify ───────────────────────────────────

console.log('\nSUITE 4: shouldSuggestClarify');

{
  pass(shouldSuggestClarify({ missingInfo: ['a', 'b'] }) === true, '2 missing → suggest');
  pass(shouldSuggestClarify({ missingInfo: ['a'] }) === false, '1 missing → dont suggest');
  pass(shouldSuggestClarify({}) === false, 'no missingInfo → dont suggest');
}

// ─── Suite 5: recordClarifyingAnswers ────────────────────────────────

console.log('\nSUITE 5: recordClarifyingAnswers');

{
  const out = recordClarifyingAnswers(
    { title: 'D', status: 'unresolved' },
    [{ question: 'q?', answer: 'a' }]
  );
  pass(out.clarifyingAnswers.length === 1, '1 answer recorded');
  pass(out.clarifyingAnswers[0].answer === 'a', 'answer preserved');
}

// ─── Suite 6: summarizeProgress ──────────────────────────────────────

console.log('\nSUITE 6: summarizeProgress');

{
  const s = summarizeProgress([
    { status: 'resolved' },
    { status: 'unresolved' },
    { status: 'skipped' },
    { status: 'filtered_out' },
  ]);
  pass(s.total === 4, 'total = 4');
  pass(s.resolved === 1, 'resolved = 1');
  pass(s.unresolved === 1, 'unresolved = 1');
  pass(s.skipped === 1, 'skipped = 1');
  pass(s.filtered === 1, 'filtered = 1');
  pass(s.progress === '2 of 3 (67%)', `progress = "${s.progress}"`);
}

// ─── Suite 7: legacy importance field is honored ─────────────────────

console.log('\nSUITE 7: legacy importance field');

{
  const decisions = [
    { title: 'A', importance: 'Critical', status: 'unresolved' },
    { title: 'B', importance: 'Low', status: 'unresolved' },
  ];
  const next = computeNextDecision(decisions);
  pass(next?.title === 'A', 'legacy importance: Critical wins');
}

console.log('\n' + '='.repeat(60));
console.log(`RESULTS: ${passCount} passed, ${failCount} failed`);
console.log('='.repeat(60));
process.exit(failCount === 0 ? 0 : 1);
