/**
 * views/DecisionsList.jsx - Top-level list of decisions on the analysis screen.
 *
 * Replaces the inlined `DecisionsList` from App.jsx. Composed of:
 *   - Heading + intro line
 *   - 2-up grid of DecisionCard (Critical/High first, Medium, then Low)
 *   - "Walk through one at a time" CTA (opens DecisionFlowView)
 *   - "Save & continue" CTA (persists to /api/projects, switches to prompt view)
 *
 * Decisions are sorted by priority so Critical/High surface first.
 */

import { useMemo } from 'react'
import { comparePriority } from '../lib/priorities.js'
import { Button } from '../components/Button.jsx'
import { DecisionCard } from '../components/DecisionCard.jsx'
import { EmptyState } from '../components/EmptyState.jsx'

export function DecisionsList({
  decisions,
  onOpenDecision,
  onWalkFlow,
  onSaveProject,
  savingProject,
  flowComplete,
}) {
  const sorted = useMemo(() => {
    if (!Array.isArray(decisions)) return []
    return [...decisions].sort((a, b) => comparePriority(a.priority, b.priority))
  }, [decisions])

  const summary = useMemo(() => {
    const resolved = sorted.filter(d => d.status === 'resolved').length
    const skipped = sorted.filter(d => d.status === 'skipped').length
    return { resolved, skipped, total: sorted.length }
  }, [sorted])

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon="○"
        title="No architectural decisions required"
        body="Your idea is straightforward enough that ArchMind didn't surface any meaningful architectural trade-offs. You can proceed directly to the implementation prompt."
        actionLabel="Generate prompt"
        onAction={onSaveProject}
      />
    )
  }

  return (
    <section className="decisions-list-v2">
      <header className="decisions-list-v2-header">
        <div className="eyebrow">Engineering decisions</div>
        <h2 className="decisions-list-v2-title">
          {summary.total} {summary.total === 1 ? 'decision' : 'decisions'} to make
        </h2>
        <p className="decisions-list-v2-sub">
          {summary.resolved} resolved · {summary.skipped} skipped · {summary.total - summary.resolved - summary.skipped} open
        </p>
      </header>

      <div className="decisions-list-v2-grid">
        {sorted.map((d, i) => (
          <DecisionCard
            key={d.title || d.category || i}
            decision={d}
            onOpen={() => onOpenDecision(d)}
          />
        ))}
      </div>

      <div className="decisions-list-v2-actions">
        <Button variant="primary" size="lg" onClick={onWalkFlow} data-testid="walk-flow">
          {flowComplete ? 'Re-walk decisions' : 'Walk through decisions'}
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={onSaveProject}
          loading={savingProject}
          disabled={!flowComplete}
          data-testid="save-continue"
        >
          Save project & continue
        </Button>
      </div>
      {!flowComplete && (
        <p className="decisions-list-v2-hint">
          Walk through the decisions (or resolve them in the cards above) to unlock
          saving.
        </p>
      )}
    </section>
  )
}