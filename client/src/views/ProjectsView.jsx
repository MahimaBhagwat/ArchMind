/**
 * views/ProjectsView.jsx - "My projects" landing for authenticated users.
 *
 * Replaces the inlined ProjectsView from App.jsx. Composed of:
 *   - Page header (eyebrow + title + "Start a new idea" CTA)
 *   - List of saved projects as rich rows:
 *       * idea title (italicized)
 *       * decision-count chip
 *       * resolved vs total chip
 *       * saved-at date
 *   - Empty state when no projects
 *   - Loading state during fetch
 */

import { useEffect, useState } from 'react'
import { Button } from '../components/Button.jsx'
import { LoadingShell } from '../components/LoadingShell.jsx'
import { EmptyState } from '../components/EmptyState.jsx'
import { ErrorBanner } from '../components/ErrorBanner.jsx'
import { listProjects } from '../lib/api.js'

function fmtDate(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return ''
  }
}

export function ProjectsView({ onNewProject, onOpenProject }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [projects, setProjects] = useState([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listProjects()
      .then((data) => {
        if (cancelled) return
        setProjects(Array.isArray(data?.projects) ? data.projects : [])
      })
      .catch((err) => {
        if (cancelled) return
        setError(err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  if (loading) return <LoadingShell label="Loading your projects..." />

  return (
    <section className="projects-view-v2">
      <header className="projects-view-v2-header">
        <div className="eyebrow">My projects</div>
        <h1 className="projects-view-v2-title">Saved products & prompts</h1>
        <p className="projects-view-v2-sub">
          Every idea you've taken through ArchMind. Open one to revisit
          decisions or regenerate the implementation prompt.
        </p>
        <div className="projects-view-v2-actions">
          <Button variant="primary" onClick={onNewProject}>
            Start a new idea →
          </Button>
        </div>
      </header>

      {error && (
        <ErrorBanner
          error={error}
          fallback="Couldn't load your projects."
          onRetry={() => window.location.reload()}
        />
      )}

      {!error && projects.length === 0 && (
        <EmptyState
          icon="∅"
          title="No saved projects yet"
          body="Analyze an idea, walk through its decisions, and save it - it'll show up here."
          actionLabel="Start a new idea"
          onAction={onNewProject}
        />
      )}

      {!error && projects.length > 0 && (
        <ul className="projects-list-v2">
          {projects.map((p) => {
            const total = (p.decisions || []).length
            const resolved = (p.decisions || []).filter((d) => d.status === 'resolved').length
            return (
              <li key={p._id}>
                <button
                  className="project-row-v2"
                  onClick={() => onOpenProject(p)}
                  data-testid={`project-row-${p._id}`}
                >
                  <div className="project-row-v2-main">
                    <div className="project-row-v2-idea">{p.idea}</div>
                    <div className="project-row-v2-meta">
                      <span className="project-row-v2-stat">
                        <strong>{total}</strong> decisions
                      </span>
                      <span className="project-row-v2-stat">
                        <strong>{resolved}</strong> resolved
                      </span>
                      {p.finalPrompt && (
                        <span className="project-row-v2-stat">prompt generated</span>
                      )}
                    </div>
                  </div>
                  <div className="project-row-v2-side">
                    <span className="project-row-v2-date">{fmtDate(p.createdAt)}</span>
                    <span className="project-row-v2-arrow">→</span>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
