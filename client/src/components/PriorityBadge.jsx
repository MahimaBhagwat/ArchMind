/**
 * components/PriorityBadge.jsx - Status / priority pill.
 *
 * Single source of truth for "Critical / High / Medium / Low" rendering.
 * Replaces the four near-duplicate `.decision-card-importance.critical`
 * etc. blocks and the `.meta-chip.importance.*` blocks.
 */

import { normalizePriority } from '../lib/priorities.js'

export function PriorityBadge({ priority, size = 'md', resolved = false }) {
  const norm = normalizePriority(priority)
  const cls = `priority-badge priority-${norm.toLowerCase()}${size === 'sm' ? ' small' : ''}${resolved ? ' resolved' : ''}`
  return (
    <span className={cls} aria-label={`${norm} priority`}>
      {norm}
    </span>
  )
}

export function ResolutionBadge({ status }) {
  if (status === 'resolved') {
    return <span className="resolution-badge resolved">Resolved</span>
  }
  if (status === 'skipped') {
    return <span className="resolution-badge skipped">Skipped</span>
  }
  return <span className="resolution-badge unresolved">Open</span>
}