/**
 * DecisionFlowView.jsx - Interactive one-decision-at-a-time view.
 *
 * Walks the user through their decisions in priority order. Uses
 * client/src/decisionFlow.js for deterministic ordering, dependency-skip
 * propagation, and "I'm not sure" clarifying questions.
 *
 * Three actions per decision:
 *   - Pick an alternative  → resolve, advance
 *   - I'm not sure         → record clarifying answers, advance
 *   - Skip                 → mark skipped, propagate to dependents
 */

import { useState, useMemo } from 'react'
import {
  computeFlowState,
  markResolved,
  markSkipped,
  recordClarifyingAnswers,
  shouldSuggestClarify,
  summarizeProgress,
} from './decisionFlow.js'

export default function DecisionFlowView({ decisions, onUpdate, onBack, onOpenDetail }) {
  const [choiceMode, setChoiceMode] = useState('pick') // 'pick' | 'custom' | 'clarify'
  const [customText, setCustomText] = useState('')
  const [reasoning, setReasoning] = useState('')
  const [clarifyAnswers, setClarifyAnswers] = useState({}) // { "question text": "answer" }

  const state = useMemo(() => computeFlowState(decisions), [decisions])
  const summary = useMemo(() => summarizeProgress(decisions), [decisions])
  const current = state.current

  if (!current) {
    return (
      <div className="flow-complete">
        <div className="flow-complete-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 12 10 18 20 6" />
          </svg>
        </div>
        <h2>All decisions walked through</h2>
        <p className="body">
          You've addressed {summary.resolved + summary.skipped} of {summary.resolved + summary.unresolved + summary.skipped} engineering decisions.
          Go back to your product and generate the implementation prompt.
        </p>
        <button className="btn-primary" onClick={onBack}>
          Back to overview
        </button>
      </div>
    )
  }

  const { current: _, ...rest } = state
  const upcomingCount = (state.upcoming?.length || 0) + (state.skipped?.length || 0)
  const priorityLabel = current.priority || current.importance || 'Medium'

  function handlePick(name) {
    onUpdate(markResolved(decisions, current.title, name, reasoning))
    resetForm()
  }

  function handleCustom() {
    if (!customText.trim()) return
    onUpdate(markResolved(decisions, current.title, customText.trim(), reasoning))
    resetForm()
  }

  function handleSkip() {
    onUpdate(markSkipped(decisions, current.title, reasoning || 'Skipped by user'))
    resetForm()
  }

  function handleClarify() {
    const answers = (current.missingInfo || []).map((q) => ({
      question: q,
      answer: (clarifyAnswers[q] || '').trim(),
    }))
    let next = decisions.map((d) =>
      (d.title || d.category) === (current.title || current.category)
        ? recordClarifyingAnswers(d, answers)
        : d
    )
    // After clarifying, advance to next (status stays unresolved - user can pick later)
    onUpdate(next)
    resetForm()
  }

  function resetForm() {
    setChoiceMode('pick')
    setCustomText('')
    setReasoning('')
    setClarifyAnswers({})
  }

  const alts = current.alternatives || []

  return (
    <div className="flow-shell" data-testid="decision-flow">
      {/* Progress strip: segmented dots, one per decision */}
      <div className="flow-progress">
        <div className="flow-progress-meta">
          <span className="flow-progress-meta-label">Decisions</span>
          <span className="flow-progress-meta-count">
            <strong>{summary.resolved + summary.skipped}</strong> of {summary.resolved + summary.unresolved + summary.skipped} addressed
          </span>
        </div>
        <div className="flow-progress-bar">
          {decisions.map((d, i) => {
            const status = d.status || 'unresolved'
            const isCurrent = state.current && (state.current.title || state.current.category) === (d.title || d.category)
            let cls = ''
            if (status === 'resolved') cls = 'done'
            else if (status === 'skipped') cls = 'skipped'
            else if (isCurrent) cls = 'current'
            return (
              <span
                key={i}
                className={`flow-progress-fill ${cls}`}
                title={`${d.title || d.category} - ${status}`}
                aria-label={`Decision ${i + 1}: ${status}`}
              />
            )
          })}
        </div>
        <div className="flow-progress-label">
          {upcomingCount > 0 ? `${upcomingCount} remaining after this one` : 'Last decision in the walkthrough'}
        </div>
      </div>

      {/* Current decision card */}
      <div className={`flow-card priority-${priorityLabel.toLowerCase()}`}>
        <div className="flow-card-header">
          <span className={`flow-priority-badge ${priorityLabel.toLowerCase()}`}>
            {priorityLabel} priority
          </span>
          {current.dependsOn?.length > 0 && (
            <span className="flow-deps">
              Depends on: {current.dependsOn.join(', ')}
            </span>
          )}
        </div>

        <h2 className="flow-title">{current.title || current.category}</h2>
        {current.question && <p className="flow-question">{current.question}</p>}
        {current.priorityWhy && (
          <p className="flow-why"><strong>Why this matters:</strong> {current.priorityWhy}</p>
        )}
        {current.tradeoffs && (
          <p className="flow-tradeoffs"><strong>The trade-off:</strong> {current.tradeoffs}</p>
        )}

        {/* Choice mode: pick / custom / clarify */}
        {choiceMode === 'pick' && (
          <div className="flow-choices">
            <div className="flow-choices-label">Choose an approach:</div>
            {alts.length === 0 && (
              <div className="flow-no-alts">
                No pre-listed alternatives - write your own choice below.
              </div>
            )}
            {alts.map((a, i) => (
              <button
                key={i}
                className="flow-choice"
                onClick={() => handlePick(a.name)}
                data-testid={`flow-pick-${i}`}
              >
                <div className="flow-choice-name">{a.name}</div>
                {a.tradeoffNote && (
                  <div className="flow-choice-note">{a.tradeoffNote}</div>
                )}
                {a.pros?.length > 0 && (
                  <ul className="flow-choice-pros">
                    {a.pros.map((p, j) => <li key={j}>+ {p}</li>)}
                  </ul>
                )}
                {a.cons?.length > 0 && (
                  <ul className="flow-choice-cons">
                    {a.cons.map((c, j) => <li key={j}>− {c}</li>)}
                  </ul>
                )}
              </button>
            ))}
            <div className="flow-mode-switch">
              <button
                className="btn-ghost"
                onClick={() => setChoiceMode('custom')}
                data-testid="flow-mode-custom"
              >
                Write my own choice
              </button>
              {shouldSuggestClarify(current) && (
                <button
                  className="btn-ghost"
                  onClick={() => setChoiceMode('clarify')}
                  data-testid="flow-mode-clarify"
                >
                  I'm not sure - ask me clarifying questions
                </button>
              )}
              <button
                className="btn-ghost"
                onClick={handleSkip}
                data-testid="flow-skip"
              >
                Skip this decision
              </button>
            </div>
          </div>
        )}

        {choiceMode === 'custom' && (
          <div className="flow-custom">
            <label className="flow-label" htmlFor="custom-choice">
              Your choice:
            </label>
            <input
              id="custom-choice"
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="e.g. Use Redis for caching"
              autoFocus
            />
            <label className="flow-label" htmlFor="custom-reasoning">
              Why? (optional)
            </label>
            <textarea
              id="custom-reasoning"
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder="Short rationale"
              rows={2}
            />
            <div className="flow-actions">
              <button className="btn-ghost" onClick={() => setChoiceMode('pick')}>
                Back to alternatives
              </button>
              <button
                className="btn-primary"
                onClick={handleCustom}
                disabled={!customText.trim()}
                data-testid="flow-confirm-custom"
              >
                Record and continue
              </button>
            </div>
          </div>
        )}

        {choiceMode === 'clarify' && (
          <div className="flow-clarify">
            <div className="flow-clarify-intro">
              Answering these will sharpen your alternatives. You can still pick a choice afterward.
            </div>
            {(current.missingInfo || current.clarifyingQuestions || []).map((q, i) => {
              const inputId = `flow-clarify-${i}`
              return (
                <div key={i} className="flow-clarify-q">
                  <label className="flow-label" htmlFor={inputId}>{q}</label>
                  <input
                    id={inputId}
                    type="text"
                    value={clarifyAnswers[q] || ''}
                    onChange={(e) =>
                      setClarifyAnswers((prev) => ({ ...prev, [q]: e.target.value }))
                    }
                    placeholder="Your answer"
                  />
                </div>
              )
            })}
            <div className="flow-actions">
              <button className="btn-ghost" onClick={() => setChoiceMode('pick')}>
                Back to alternatives
              </button>
              <button
                className="btn-primary"
                onClick={handleClarify}
                data-testid="flow-confirm-clarify"
              >
                Save answers and continue
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upcoming preview */}
      {state.upcoming?.length > 0 && (
        <div className="flow-upcoming">
          <div className="flow-upcoming-label">Coming up next:</div>
          {state.upcoming.slice(0, 3).map((d, i) => (
            <div key={i} className="flow-upcoming-item">
              <span className={`flow-priority-badge small ${(d.priority || d.importance || 'medium').toLowerCase()}`}>
                {d.priority || d.importance || 'Medium'}
              </span>
              <span className="flow-upcoming-title">{d.title || d.category}</span>
            </div>
          ))}
          {state.upcoming.length > 3 && (
            <div className="flow-upcoming-more">+{state.upcoming.length - 3} more</div>
          )}
        </div>
      )}

      <div className="flow-footer">
        <button className="btn-ghost" onClick={onBack}>
          ← Back to all decisions
        </button>
        {onOpenDetail && (
          <button className="btn-ghost" onClick={() => onOpenDetail(current)}>
            Open full detail view
          </button>
        )}
      </div>
    </div>
  )
}
