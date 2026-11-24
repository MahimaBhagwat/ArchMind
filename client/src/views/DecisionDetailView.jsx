/**
 * views/DecisionDetailView.jsx - Full-detail view of one decision.
 *
 * Replaces the inlined DecisionDetailView from App.jsx. Composed of:
 *   - Header: title + PriorityBadge + status + back link
 *   - Question, priorityWhy, tradeoffs, context (dependsOn, blastRadius, etc.)
 *   - AlternativesComparison (side-by-side table)
 *   - Choice actions: pick an existing alt, write a custom choice, skip,
 *     or "I'm not sure" → fill in clarifying answers
 *   - Save button at bottom (calls onSave with the updated decision array)
 *
 * Preserves all the alternative-fetching / saving logic from App.jsx's
 * inlined version, including:
 *   - `alternatives` are loaded on-demand when the user opens this view
 *   - clarifyingQuestions are surfaced if present
 *   - the user can pick, write a custom choice, or skip
 */

import { useEffect, useState } from 'react'
import { Button } from '../components/Button.jsx'
import { PriorityBadge, ResolutionBadge } from '../components/PriorityBadge.jsx'
import { AlternativesComparison } from '../components/AlternativesComparison.jsx'
import { LoadingShell } from '../components/LoadingShell.jsx'
import { ErrorBanner } from '../components/ErrorBanner.jsx'
import { fetchAlternatives } from '../lib/api.js'

export function DecisionDetailView({
  decision,
  allDecisions,
  idea,
  onBack,
  onSave,
  onOpenFlow, // optional: jump straight into the flow view of this decision
}) {
  const title = decision?.title || decision?.category || ''
  const [alts, setAlts] = useState(decision?.alternatives || [])
  const [altsLoading, setAltsLoading] = useState(false)
  const [altsError, setAltsError] = useState(null)
  const [clarifyingQuestions, setClarifyingQuestions] = useState(
    decision?.missingInfo || decision?.clarifyingQuestions || []
  )

  const [mode, setMode] = useState('pick') // 'pick' | 'custom' | 'clarify' | 'skip'
  const [customText, setCustomText] = useState(decision?.chosen || '')
  const [customReasoning, setCustomReasoning] = useState(decision?.reasoning || '')
  const [clarifyAnswers, setClarifyAnswers] = useState({})
  const [saving, setSaving] = useState(false)

  // Fetch richer alternatives / clarifying questions from server on mount.
  useEffect(() => {
    let cancelled = false
    if (!title) return
    setAltsLoading(true)
    setAltsError(null)
    fetchAlternatives({
      idea: idea || '',
      decision: {
        title: title,
        category: decision?.category || title,
        question: decision?.question,
        priority: decision?.priority,
        dependsOn: decision?.dependsOn,
      },
      clarifyingAnswers: decision?.clarifyingAnswers || null,
    })
      .then((data) => {
        if (cancelled) return
        if (Array.isArray(data?.alternatives)) setAlts(data.alternatives)
        if (Array.isArray(data?.clarifyingQuestions)) {
          setClarifyingQuestions(data.clarifyingQuestions)
        }
      })
      .catch((err) => {
        if (cancelled) return
        setAltsError(err)
      })
      .finally(() => {
        if (!cancelled) setAltsLoading(false)
      })
    return () => { cancelled = true }
  }, [title])

  function buildUpdate(patch) {
    // Patch the single decision by title/category match; keep the rest intact.
    return (allDecisions || []).map((d) => {
      const sameKey = (d.title || d.category) === title
      return sameKey ? { ...d, ...patch } : d
    })
  }

  function handlePick(name) {
    setSaving(true)
    onSave(buildUpdate({
      chosen: name,
      alternative: name,
      status: 'resolved',
      reasoning: customReasoning.trim() || undefined,
      resolvedAt: new Date().toISOString(),
    }))
    setSaving(false)
  }

  function handleCustomSave() {
    if (!customText.trim()) return
    setSaving(true)
    onSave(buildUpdate({
      chosen: customText.trim(),
      alternative: customText.trim(),
      status: 'resolved',
      reasoning: customReasoning.trim() || undefined,
      resolvedAt: new Date().toISOString(),
    }))
    setSaving(false)
  }

  function handleSkip() {
    setSaving(true)
    onSave(buildUpdate({
      status: 'skipped',
      reasoning: customReasoning.trim() || 'Skipped by user',
    }))
    setSaving(false)
  }

  function handleClarifySave() {
    const answers = clarifyingQuestions.map((q) => ({
      question: q,
      answer: (clarifyAnswers[q] || '').trim(),
    }))
    setSaving(true)
    onSave(buildUpdate({
      clarifyingAnswers: answers,
      // status stays 'unresolved' - user can pick a choice afterward
    }))
    setSaving(false)
  }

  if (!decision) {
    return (
      <div className="decision-detail-empty">
        <p>This decision is no longer available.</p>
        <Button onClick={onBack}>Back</Button>
      </div>
    )
  }

  return (
    <article className="decision-detail-v2">
      <button className="back-link" onClick={onBack}>← Back to all decisions</button>

      <header className="decision-detail-v2-header">
        <div className="decision-detail-v2-badges">
          <PriorityBadge priority={decision.priority || decision.importance} />
          <ResolutionBadge status={decision.status} />
        </div>
        <h1 className="decision-detail-v2-title">{title}</h1>
        {decision.question && (
          <p className="decision-detail-v2-question">{decision.question}</p>
        )}
        {decision.priorityWhy && (
          <p className="decision-detail-v2-why">
            <strong>Why this matters:</strong> {decision.priorityWhy}
          </p>
        )}
        {decision.tradeoffs && (
          <p className="decision-detail-v2-tradeoffs">
            <strong>The trade-off:</strong> {decision.tradeoffs}
          </p>
        )}
      </header>

      {(decision.dependsOn?.length > 0 ||
        decision.blastRadius ||
        decision.category) && (
        <section className="decision-detail-v2-context">
          <h3 className="decision-detail-v2-section-label">Context</h3>
          {decision.category && (
            <div className="context-row">
              <div className="context-label">Category</div>
              <div className="context-chips">
                <span className="understanding-chip">{decision.category}</span>
              </div>
            </div>
          )}
          {decision.blastRadius && (
            <div className="context-row">
              <div className="context-label">Blast radius</div>
              <div className="context-chips">
                <span className="understanding-chip">{decision.blastRadius}</span>
              </div>
            </div>
          )}
          {decision.dependsOn?.length > 0 && (
            <div className="context-row">
              <div className="context-label">Depends on</div>
              <div className="context-chips">
                {decision.dependsOn.map((dep, i) => (
                  <span key={i} className="understanding-chip">{dep}</span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="decision-detail-v2-section">
        <h3 className="decision-detail-v2-section-label">Alternatives</h3>
        {altsLoading && <LoadingShell label="Loading alternatives..." />}
        {altsError && (
          <ErrorBanner
            error={altsError}
            fallback="Couldn't load alternatives."
            onRetry={() => setAltsError(null)}
          />
        )}
        {!altsLoading && !altsError && (
          <AlternativesComparison
            alternatives={alts}
            chosenName={decision.chosen}
            onPick={handlePick}
            disabled={saving}
          />
        )}
      </section>

      <section className="decision-detail-v2-choice">
        <div className="choice-mode-row">
          {mode !== 'custom' && (
            <Button variant="ghost" onClick={() => setMode('custom')}>
              Write my own choice
            </Button>
          )}
          {mode !== 'clarify' && clarifyingQuestions.length > 0 && (
            <Button variant="ghost" onClick={() => setMode('clarify')}>
              I'm not sure - ask me clarifying questions
            </Button>
          )}
          {mode !== 'skip' && (
            <Button variant="ghost" onClick={() => setMode('skip')}>
              Skip this decision
            </Button>
          )}
          {onOpenFlow && (
            <Button variant="ghost" onClick={onOpenFlow}>
              Walk through this in flow view →
            </Button>
          )}
        </div>

        {mode === 'custom' && (
          <div className="choice-custom">
            <label className="flow-label" htmlFor="custom-choice">Your choice</label>
            <input
              id="custom-choice"
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="e.g. Use Redis for caching"
              autoFocus
            />
            <label className="flow-label" htmlFor="custom-reasoning">Why? (optional)</label>
            <textarea
              id="custom-reasoning"
              value={customReasoning}
              onChange={(e) => setCustomReasoning(e.target.value)}
              placeholder="Short rationale"
              rows={3}
            />
            <div className="choice-mode-row">
              <Button variant="ghost" onClick={() => setMode('pick')}>Back to alternatives</Button>
              <Button
                variant="primary"
                onClick={handleCustomSave}
                disabled={!customText.trim()}
                loading={saving}
              >
                Record and continue
              </Button>
            </div>
          </div>
        )}

        {mode === 'clarify' && (
          <div className="choice-clarify">
            <p className="muted-helper">
              Answering these will sharpen your alternatives. You can still pick a choice afterward.
            </p>
            {clarifyingQuestions.map((q, i) => {
              const inputId = `detail-clarify-${i}`
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
            <div className="choice-mode-row">
              <Button variant="ghost" onClick={() => setMode('pick')}>Back to alternatives</Button>
              <Button variant="primary" onClick={handleClarifySave} loading={saving}>
                Save answers and continue
              </Button>
            </div>
          </div>
        )}

        {mode === 'skip' && (
          <div className="choice-skip">
            <label className="flow-label" htmlFor="skip-reason">Why are you skipping? (optional)</label>
            <textarea
              id="skip-reason"
              value={customReasoning}
              onChange={(e) => setCustomReasoning(e.target.value)}
              placeholder="e.g. Not relevant to MVP"
              rows={2}
            />
            <div className="choice-mode-row">
              <Button variant="ghost" onClick={() => setMode('pick')}>Back</Button>
              <Button variant="primary" onClick={handleSkip} loading={saving}>
                Confirm skip
              </Button>
            </div>
          </div>
        )}
      </section>
    </article>
  )
}