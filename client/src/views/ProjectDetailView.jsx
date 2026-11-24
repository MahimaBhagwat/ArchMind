/**
 * views/ProjectDetailView.jsx - Read-only project view from "My projects".
 *
 * Replaces the inlined ProjectDetailView from App.jsx. Composed of:
 *   - Header: project idea, decision counts, date
 *   - "View architecture report" CTA (opens ArchitectureReportView)
 *   - Understanding summary (collapsed; uses UnderstandingView)
 *   - Decisions list (read-only, uses DecisionCard)
 *   - Saved final prompt preview (if any)
 *
 * No "edit decision" affordances here - this is a snapshot. Re-analyze if
 * the user wants to change decisions.
 */

import { useEffect, useState } from 'react'
import { Button } from '../components/Button.jsx'
import { LoadingShell } from '../components/LoadingShell.jsx'
import { ErrorBanner } from '../components/ErrorBanner.jsx'
import { EmptyState } from '../components/EmptyState.jsx'
import { loadProject } from '../lib/api.js'
import { comparePriority } from '../lib/priorities.js'
import { DecisionCard } from '../components/DecisionCard.jsx'
import { UnderstandingView } from './UnderstandingView.jsx'
import { MarkdownContent } from '../components/MarkdownContent.jsx'

function fmtDate(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return ''
  }
}

function projectTitle(project) {
  const analyzedName = project?.analysis?.product?.name
  if (typeof analyzedName === 'string' && analyzedName.trim()) return analyzedName.trim()

  // New projects store the first form field inside the structured idea as
  // "Project: <name>". Older records do not have a dedicated title, so use
  // that short label rather than turning the entire brief into an H1.
  const match = typeof project?.idea === 'string'
    ? project.idea.match(/(?:^|\n)Project:\s*([^\n]+)/i)
    : null
  if (match?.[1]?.trim()) return match[1].trim()

  return 'Untitled project'
}

export function ProjectDetailView({ projectId, onBack, onViewReport }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [project, setProject] = useState(null)

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    loadProject(projectId)
      .then((data) => {
        if (cancelled) return
        setProject(data?.project || null)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [projectId])

  if (loading) return <LoadingShell label="Loading project..." />

  if (error || !project) {
    return (
      <div className="project-detail-v2-error">
        <ErrorBanner
          error={error}
          fallback="Couldn't load this project."
          onRetry={() => window.location.reload()}
        />
        <Button variant="ghost" onClick={onBack}>Back to projects</Button>
      </div>
    )
  }

  const decisions = (project.decisions || []).slice().sort(comparePriority)
  const total = decisions.length
  const resolved = decisions.filter((d) => d.status === 'resolved').length
  const skipped = decisions.filter((d) => d.status === 'skipped').length
  const title = projectTitle(project)

  return (
    <article className="project-detail-v2">
      <button className="back-link" onClick={onBack}>← Back to projects</button>

      <header className="project-detail-v2-header">
        <div className="eyebrow">Saved project</div>
        <h1 className="project-detail-v2-title">{title}</h1>
        <div className="project-detail-v2-meta">
          <span className="project-detail-v2-stat">
            <strong>{total}</strong> decisions
          </span>
          <span className="project-detail-v2-stat">
            <strong>{resolved}</strong> resolved
          </span>
          <span className="project-detail-v2-stat">
            <strong>{skipped}</strong> skipped
          </span>
          <span className="muted-label">· saved {fmtDate(project.createdAt)}</span>
        </div>
        {onViewReport && (
          <div className="project-detail-v2-actions">
            <Button variant="primary" onClick={onViewReport} data-testid="view-report">
              View architecture report →
            </Button>
          </div>
        )}
      </header>

      {project.idea && (
        <div className="project-detail-v2-idea">
          <span className="muted-label">Original idea:</span> {project.idea}
        </div>
      )}

      {project.analysis && (
        <UnderstandingView analysis={project.analysis} idea={null} />
      )}

      <section className="project-detail-v2-decisions">
        <h2 className="project-detail-v2-section-title">Decisions</h2>
        {decisions.length === 0 ? (
          <EmptyState
            icon="○"
            title="No decisions on this project"
            body="This project didn't have any architectural decisions recorded."
          />
        ) : (
          <div className="decisions-list-v2-grid">
            {decisions.map((d, i) => (
              <DecisionCard key={d.title || d.category || i} decision={d} dimmed />
            ))}
          </div>
        )}
      </section>

      {project.finalPrompt && (
        <section className="project-detail-v2-prompt">
          <h2 className="project-detail-v2-section-title">Saved implementation prompt</h2>
          <MarkdownContent markdown={project.finalPrompt} className="saved-prompt-markdown" />
        </section>
      )}
    </article>
  )
}
