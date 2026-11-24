/**
 * components/DecisionCard.jsx - Structured decision summary card.
 *
 * Replaces `.decision-card` from App.css. Designed to make priority
 * visible at a glance without being noisy:
 *   - Colored left-rail by priority (replaces border tinting which got
 *     lost on dark backgrounds)
 *   - Title + question + 1-line tradeoff + status footer
 *   - Compact "Open" action that hovers to accent
 *
 * Used in:
 *   - DecisionsList (understood-product analysis screen)
 *   - ProjectsView (read-only summaries)
 */

import { PriorityBadge, ResolutionBadge } from './PriorityBadge.jsx'

export function DecisionCard({ decision, onOpen, dimmed = false }) {
  const title = decision.title || decision.category || 'Untitled decision'
  const status = decision.status || 'unresolved'
  const tradeoffs = decision.tradeoffs || decision.summary || ''
  const question = decision.question || ''
  const chosen = decision.chosen || decision.alternative
  const reasoning = decision.reasoning

  return (
    <button
      className={`decision-card-v2${status === 'resolved' ? ' resolved' : ''}${status === 'skipped' ? ' skipped' : ''}${dimmed ? ' dimmed' : ''}`}
      onClick={onOpen}
      data-testid={`decision-card-${title}`}
      type="button"
    >
      <div className="decision-card-v2-head">
        <div className="decision-card-v2-title-wrap">
          <PriorityBadge priority={decision.priority || decision.importance} size="sm" />
          <h3 className="decision-card-v2-title">{title}</h3>
        </div>
        <ResolutionBadge status={status} />
      </div>

      {question && <p className="decision-card-v2-q">{question}</p>}

      {tradeoffs && (
        <p className="decision-card-v2-tradeoffs">
          <span className="muted-label">Trade-off:</span> {tradeoffs}
        </p>
      )}

      {(decision.reversibility || decision.blastRadius) && (
        <div className="decision-card-v2-scope">
          {decision.reversibility && (
            <span><span className="muted-label">Reversibility</span> {decision.reversibility}</span>
          )}
          {decision.blastRadius && (
            <span><span className="muted-label">Blast radius</span> {decision.blastRadius}</span>
          )}
        </div>
      )}

      <div className="decision-card-v2-foot">
        {chosen ? (
          <div className="decision-card-v2-chosen">
            <span className="muted-label">Choice:</span>
            <strong>{chosen}</strong>
            {reasoning && <span className="decision-card-v2-reasoning">- {reasoning}</span>}
          </div>
        ) : (
          <div className="decision-card-v2-chosen empty">
            <span className="muted-label">Awaiting decision</span>
          </div>
        )}
        <span className="decision-card-v2-action">Open →</span>
      </div>
    </button>
  )
}