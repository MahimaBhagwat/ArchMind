/**
 * views/LandingScreen.jsx - Single text input + analyze CTA.
 *
 * Replaces the inlined LandingScreen from App.jsx. Composed of:
 *   - Eyebrow + headline + sub-headline
 *   - Multi-line textarea (the only input on this screen)
 *   - Inline example chips (one click populates the textarea)
 *   - Primary CTA + signed-out "anonymous" hint
 *
 * Behavior preserved 1:1 from App.jsx:
 *   - onAnalyze({ idea }) is called with the textarea value (trimmed).
 *   - Limit to 4000 chars to match what the server accepts.
 */

import { useState } from 'react'
import { Button } from '../components/Button.jsx'
import { ErrorBanner } from '../components/ErrorBanner.jsx'

const EXAMPLE_IDEAS = [
  'REST API for a multi-tenant SaaS application',
  'Event-driven order processing system',
  'Document processing platform with asynchronous jobs',
]

const MAX_CHARS = 4000

export function LandingScreen({ onAnalyze, onSignIn, loading, analyzeError }) {
  const stages = ['context', 'requirements', 'constraints', 'quality']
  const stageLabels = ['Context', 'Requirements', 'Constraints', 'Quality']
  const [stage, setStage] = useState('context')
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [requirements, setRequirements] = useState('')
  const [behaviours, setBehaviours] = useState('')
  const [constraints, setConstraints] = useState('')
  const [existingSystems, setExistingSystems] = useState('')
  const [qualityPriorities, setQualityPriorities] = useState([])
  const [experienceLevel, setExperienceLevel] = useState('beginner')

  function buildContext() {
    return [
      `Developer experience level: ${experienceLevel}`,
      projectName.trim() && `Project: ${projectName.trim()}`,
      projectDescription.trim() && `Project context:\n${projectDescription.trim()}`,
      requirements.trim() && `Requirements:\n${requirements.trim()}`,
      behaviours.trim() && `Important behaviours:\n${behaviours.trim()}`,
      constraints.trim() && `Constraints:\n${constraints.trim()}`,
      existingSystems.trim() && `Existing systems or technology constraints:\n${existingSystems.trim()}`,
      qualityPriorities.length > 0 && `Quality priorities:\n${qualityPriorities.join(', ')}`,
    ].filter(Boolean).join('\n\n')
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (loading) return
    const index = stages.indexOf(stage)
    if (index < stages.length - 1) {
      setStage(stages[index + 1])
      return
    }
    const context = buildContext()
    if (!context) return
    onAnalyze({ idea: context })
  }

  function goBack() {
    const index = stages.indexOf(stage)
    if (index > 0) setStage(stages[index - 1])
  }

  function toggleQualityPriority(priority) {
    setQualityPriorities((current) =>
      current.includes(priority)
        ? current.filter((item) => item !== priority)
        : [...current, priority]
    )
  }

  function applyExample(example) {
    setProjectName(example)
    setProjectDescription('')
    setStage('context')
  }

  const stageIndex = stages.indexOf(stage)
  const canContinue = stage === 'context'
    ? Boolean(projectName.trim() || projectDescription.trim())
    : true

  const stageContent = {
    context: (
      <>
        <fieldset className="experience-level-fieldset">
          <legend>How technical should ArchMind be?</legend>
          <p className="stage-helper">This changes how we explain decisions and trade-offs. You can change it for every project.</p>
          <div className="experience-level-grid">
            {[
              ['beginner', 'Beginner', 'Explain terms simply and guide me step by step.'],
              ['intermediate', 'Intermediate', 'Explain trade-offs clearly, with some technical detail.'],
              ['developer', 'Developer', 'Use concise engineering language and deeper technical detail.'],
            ].map(([value, label, description]) => (
              <label key={value} className={`experience-level-option${experienceLevel === value ? ' selected' : ''}`}>
                <input
                  type="radio"
                  name="experience-level"
                  value={value}
                  checked={experienceLevel === value}
                  onChange={() => setExperienceLevel(value)}
                  disabled={loading}
                />
                <span>
                  <strong>{label}</strong>
                  <small>{description}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <label htmlFor="project-name" className="landing-v2-label">What are you building?</label>
        <input
          id="project-name"
          className="landing-v2-project-input"
          placeholder="e.g. Multi-tenant analytics platform"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value.slice(0, 180))}
          disabled={loading}
          autoFocus
        />
        <label htmlFor="project-description" className="landing-v2-label">Briefly describe the system and who will use it</label>
        <textarea
          id="project-description"
          className="landing-v2-input landing-v2-stage-input"
          placeholder="What problem does it solve? What does a typical user do?"
          value={projectDescription}
          onChange={(e) => setProjectDescription(e.target.value.slice(0, MAX_CHARS))}
          rows={4}
          disabled={loading}
        />
      </>
    ),
    requirements: (
      <>
        <label htmlFor="requirements" className="landing-v2-label">What must the system do?</label>
        <textarea
          id="requirements"
          className="landing-v2-input landing-v2-stage-input"
          placeholder="The important capabilities or workflows it needs to support"
          value={requirements}
          onChange={(e) => setRequirements(e.target.value.slice(0, MAX_CHARS))}
          rows={5}
          disabled={loading}
          autoFocus
        />
        <label htmlFor="behaviours" className="landing-v2-label">Are there important user or system behaviours?</label>
        <textarea
          id="behaviours"
          className="landing-v2-input landing-v2-stage-input"
          placeholder="For example: real-time updates, scheduled processing, offline use"
          value={behaviours}
          onChange={(e) => setBehaviours(e.target.value.slice(0, MAX_CHARS))}
          rows={4}
          disabled={loading}
        />
      </>
    ),
    constraints: (
      <>
        <label htmlFor="constraints" className="landing-v2-label">What constraints should the design respect?</label>
        <textarea
          id="constraints"
          className="landing-v2-input landing-v2-stage-input"
          placeholder="Scale, deadlines, team size, compliance, budget, or delivery expectations"
          value={constraints}
          onChange={(e) => setConstraints(e.target.value.slice(0, MAX_CHARS))}
          rows={5}
          disabled={loading}
          autoFocus
        />
        <label htmlFor="existing-systems" className="landing-v2-label">Existing systems or technology constraints <span className="field-optional">Optional</span></label>
        <textarea
          id="existing-systems"
          className="landing-v2-input landing-v2-stage-input"
          placeholder="What must this work with? What is already decided?"
          value={existingSystems}
          onChange={(e) => setExistingSystems(e.target.value.slice(0, MAX_CHARS))}
          rows={4}
          disabled={loading}
        />
      </>
    ),
    quality: (
      <fieldset className="quality-priority-fieldset">
        <legend>What matters most for this system?</legend>
        <p className="stage-helper">Select the qualities that should influence the engineering decisions. You can choose more than one.</p>
        <div className="quality-priority-grid">
          {['Reliability', 'Latency', 'Security', 'Scalability', 'Maintainability', 'Cost'].map((priority) => (
            <label key={priority} className={`quality-priority-option${qualityPriorities.includes(priority) ? ' selected' : ''}`}>
              <input
                type="checkbox"
                checked={qualityPriorities.includes(priority)}
                onChange={() => toggleQualityPriority(priority)}
                disabled={loading}
              />
              <span>{priority}</span>
            </label>
          ))}
        </div>
      </fieldset>
    ),
  }[stage]

  return (
    <section className="landing-v2">
      <div className="landing-v2-eyebrow">ArchMind / project analysis</div>
      <h1 className="landing-v2-headline">Engineering decisions before implementation.</h1>
      <p className="landing-v2-sub">
        Provide the context your team would bring to an architecture review.
        ArchMind identifies the decisions, alternatives, and trade-offs that need attention.
      </p>

      <form className="landing-v2-form" onSubmit={handleSubmit}>
        <div className="workspace-form-header">
          <div>
            <span className="workspace-form-kicker">Project</span>
            <span className="workspace-form-hint">{stageLabels[stageIndex]}</span>
          </div>
          <span className="workspace-form-status">Step {stageIndex + 1} of {stages.length}</span>
        </div>
        {analyzeError && (
          <ErrorBanner
            message={analyzeError}
            fallback="We couldn't analyse this project. Please try again."
          />
        )}
        <div className="context-stage-progress" aria-label="Project context progress">
          {stageLabels.map((label, index) => (
            <span key={label} className={index === stageIndex ? 'active' : index < stageIndex ? 'complete' : ''}>
              <b>{String(index + 1).padStart(2, '0')}</b>{label}
            </span>
          ))}
        </div>

        <div className="context-stage-copy">
          <h2>{stage === 'context' ? 'Start with the system' : stage === 'requirements' ? 'Define the behaviour' : stage === 'constraints' ? 'Surface the boundaries' : 'Set the quality priorities'}</h2>
          <p>{stage === 'context' ? 'A short description is enough. We will use it as the anchor for the rest of the analysis.' : stage === 'requirements' ? 'Capture the capabilities and behaviours that will shape the architecture.' : stage === 'constraints' ? 'Known limits and existing decisions help ArchMind avoid generic recommendations.' : 'These priorities help ArchMind explain which trade-offs matter most.'}</p>
        </div>

        <div className="context-stage-fields">{stageContent}</div>

        {stage === 'context' && (
          <div className="landing-v2-examples">
            <span className="muted-label">Start from a technical context</span>
            {EXAMPLE_IDEAS.map((ex, i) => (
              <button key={i} type="button" className="landing-v2-example-chip" onClick={() => applyExample(ex)} disabled={loading}>
                {ex}
              </button>
            ))}
          </div>
        )}

        <div className="landing-v2-cta-row">
          {stageIndex > 0 && (
            <Button type="button" variant="ghost" onClick={goBack} disabled={loading}>
              Back
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={!canContinue}
            loading={loading}
          >
            {loading ? 'Analysing...' : stage === 'quality' ? 'Analyse project' : 'Continue'}
          </Button>
          {!onSignIn && (
            <span className="landing-v2-hint">
              Continue without an account. Saving projects requires sign-in.
            </span>
          )}
          {onSignIn && (
            <button
              type="button"
              className="landing-v2-signin"
              onClick={onSignIn}
              disabled={loading}
            >
              Sign in to save projects →
            </button>
          )}
        </div>
      </form>
    </section>
  )
}
