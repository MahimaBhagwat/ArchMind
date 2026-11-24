/**
 * components/AlternativesComparison.jsx - Side-by-side alternatives table.
 *
 * Replaces the vertical stack of `.alt-card-v2` blocks. Renders a
 * comparison table where each column is one alternative, each row is a
 * dimension (strengths, weaknesses, best-suited). Much more decision-
 * oriented than "scroll 4 cards".
 *
 * Falls back to vertical cards on narrow viewports.
 */

import { Button } from './Button.jsx'

function normalizeAlt(a) {
  // Support v2 (strengths/weaknesses) and legacy (pros/cons/tradeoffs)
  const strengths = Array.isArray(a.strengths) && a.strengths.length
    ? a.strengths
    : Array.isArray(a.pros) ? a.pros : []
  const weaknesses = Array.isArray(a.weaknesses) && a.weaknesses.length
    ? a.weaknesses
    : Array.isArray(a.cons) ? a.cons : []
  return {
    name: a.name || a.label || 'Alternative',
    strengths,
    weaknesses,
    best: a.bestFor || a.bestSuited || a.best_suited || a.tradeoffNote || '',
  }
}

export function AlternativesComparison({ alternatives, chosenName, onPick, disabled }) {
  const alts = (alternatives || []).map(normalizeAlt)
  if (alts.length === 0) {
    return (
      <div className="alts-empty">
        No pre-listed alternatives for this decision. Use "Write my own choice" below.
      </div>
    )
  }

  return (
    <div className="alts-comparison" role="region" aria-label="Alternatives comparison">
      <div
        className="alts-comparison-grid"
        style={{ gridTemplateColumns: `160px repeat(${alts.length}, minmax(180px, 1fr))` }}
      >
        {/* Header row */}
        <div className="alts-comparison-cell alts-label-cell" />
        {alts.map((a, i) => (
          <div key={i} className="alts-comparison-cell alts-header-cell">
            <div className="alts-name">{a.name}</div>
            <Button
              variant={chosenName === a.name ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => onPick(a.name)}
              disabled={disabled}
              data-testid={`alt-pick-${i}`}
            >
              {chosenName === a.name ? 'Selected v' : 'Choose this'}
            </Button>
          </div>
        ))}

        {/* Strengths row */}
        <div className="alts-comparison-cell alts-row-label">Strengths</div>
        {alts.map((a, i) => (
          <div key={i} className="alts-comparison-cell alts-row">
            {a.strengths.length > 0 ? (
              <ul className="alts-list alts-list-pos">
                {a.strengths.map((s, j) => <li key={j}>{s}</li>)}
              </ul>
            ) : <span className="muted-italic">-</span>}
          </div>
        ))}

        {/* Weaknesses row */}
        <div className="alts-comparison-cell alts-row-label">Weaknesses</div>
        {alts.map((a, i) => (
          <div key={i} className="alts-comparison-cell alts-row">
            {a.weaknesses.length > 0 ? (
              <ul className="alts-list alts-list-neg">
                {a.weaknesses.map((s, j) => <li key={j}>{s}</li>)}
              </ul>
            ) : <span className="muted-italic">-</span>}
          </div>
        ))}

        {/* Best-suited row */}
        <div className="alts-comparison-cell alts-row-label">Best when...</div>
        {alts.map((a, i) => (
          <div key={i} className="alts-comparison-cell alts-row alts-best-row">
            {a.best || <span className="muted-italic">-</span>}
          </div>
        ))}
      </div>
    </div>
  )
}