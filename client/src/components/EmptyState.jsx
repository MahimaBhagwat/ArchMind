/**
 * components/EmptyState.jsx - Reusable empty / placeholder state.
 *
 * Used by:
 *   - ProjectsView when no projects saved
 *   - DecisionFlowView when all decisions resolved (the "completion" card)
 *   - DecisionsList when AI returns 0 architectural decisions
 */

import { Button } from './Button.jsx'

export function EmptyState({ icon = '∅', title, body, actionLabel, onAction }) {
  return (
    <div className="empty-state-v2" role="region">
      <div className="empty-state-v2-icon" aria-hidden="true">{icon}</div>
      {title && <h3 className="empty-state-v2-title">{title}</h3>}
      {body && <p className="empty-state-v2-body">{body}</p>}
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction} className="empty-state-v2-action">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}