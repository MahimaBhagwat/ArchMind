/**
 * views/ClarifyingQuestionsView.jsx - When the analyzer returns
 * `needs_clarification` state with options + questions.
 *
 * Replaces the inline branch in App.jsx that surfaced when
 * `ambiguity.state === 'needs_clarification'`.
 *
 * Two affordances:
 *   - Pick from the suggested options (a few radio cards)
 *   - Answer free-form clarifying questions (text inputs)
 *   - Submit → re-calls /api/analyze with `clarifyingAnswers` attached
 *
 * The backend uses the answers + the chosen option text to re-run the
 * pipeline and return a real decisions list.
 */

import { useState } from 'react'
import { Button } from '../components/Button.jsx'
import { ErrorBanner } from '../components/ErrorBanner.jsx'
import { analyzeIdea } from '../lib/api.js'
import { friendlyAnalyzeError } from '../errorMessages.js'

function displayText(value) {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    return value.label || value.question || value.description || ''
  }
  return ''
}

export function ClarifyingQuestionsView({
  idea,
  options = [],
  questions = [],
  round = 1,
  maxRounds = 3,
  onComplete,
  onStartOver,
}) {
  const [pickedOption, setPickedOption] = useState(null)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        idea: pickedOption ? `${idea}\n\n(Context: ${displayText(pickedOption)})` : idea,
        clarifyingAnswers: questions.map((q) => ({
          question: displayText(q),
          answer: (answers[displayText(q)] || '').trim(),
        })),
      }
      const data = await analyzeIdea(payload)
      onComplete(data)
    } catch (err) {
      setError({ ...err, friendlyMessage: friendlyAnalyzeError(err) })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="clarify-view-v2">
      <header className="clarify-view-v2-header">
        <div className="eyebrow">A few quick questions</div>
        <h2 className="clarify-view-v2-title">
          ArchMind needs a bit more to map out your architecture
        </h2>
        <p className="clarify-view-v2-sub">
          Round {round} of {maxRounds}. The more specific you are, the
          sharper the decisions will be.
        </p>
      </header>

      {options.length > 0 && (
        <div className="clarify-view-v2-options">
          <div className="muted-label">Which best matches your idea?</div>
          <div className="clarify-options-grid">
            {options.map((opt, i) => (
              (() => {
                const text = displayText(opt)
                return (
              <label
                key={i}
                className={`clarify-option${pickedOption === opt ? ' active' : ''}`}
              >
                <input
                  type="radio"
                  name="clarify-option"
                  value={text}
                  checked={pickedOption === opt}
                  onChange={() => setPickedOption(opt)}
                  disabled={submitting}
                />
                <span className="clarify-option-text">{text}</span>
              </label>
                )
              })()
            ))}
          </div>
        </div>
      )}

      <form className="clarify-view-v2-form" onSubmit={handleSubmit}>
        {questions.map((q, i) => (
          <div key={i} className="clarify-question">
            <label className="clarify-question-label" htmlFor={`clarify-q-${i}`}>{displayText(q)}</label>
            <input
              id={`clarify-q-${i}`}
              type="text"
              className="clarify-question-input"
              value={answers[displayText(q)] || ''}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [displayText(q)]: e.target.value }))}
              placeholder="Your answer"
              disabled={submitting}
            />
          </div>
        ))}

        {error && (
          <ErrorBanner
            error={error}
            kind="analyze"
            fallback="Couldn't re-run the analysis."
            onRetry={handleSubmit}
            onDismiss={() => setError(null)}
          />
        )}

        <div className="clarify-view-v2-actions">
          {onStartOver && (
            <Button variant="ghost" onClick={onStartOver} disabled={submitting}>
              Start over
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={submitting}
            disabled={!pickedOption && questions.every((q) => !(answers[displayText(q)] || '').trim())}
          >
            {submitting ? 'Analyzing...' : 'Continue analysis'}
          </Button>
        </div>
      </form>
    </section>
  )
}