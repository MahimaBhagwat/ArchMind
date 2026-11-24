/**
 * components/AppShell.jsx - Sticky topbar + main content slot.
 *
 * Replaces the inline TopBar from App.jsx. Adds:
 *   - Centered wordmark click → back to landing
 *   - Consistent active-link styling based on `view`
 *   - Sticky blur backdrop (preserved from existing CSS)
 *   - Optional `actions` slot in the right area (for "Save", etc.)
 *
 * Usage:
 *   <AppShell view={view} token={token} onProjects={...} onSignOut={...}>
 *     <LandingScreen ... />
 *   </AppShell>
 */

import { Link } from './Link.jsx'

export function AppShell({
  view,
  token,
  onLanding,
  onProjects,
  onSignOut,
  onNavigate,
  actions,
  workspace = true,
  children,
}) {
  const workspaceView = workspace
  const steps = [
    ['landing', 'Project context'],
    ['analysis', 'Product understanding'],
    ['flow', 'Decisions'],
    ['prompt', 'Implementation'],
    ['report', 'Architecture report'],
  ]

  return (
    <div className="shell">
      <div className="topbar">
        <button className="topbar-mark" onClick={onLanding} aria-label="Go to landing">
          ArchMind
        </button>
        <div className="topbar-actions">
          {actions}
          {token && (
            <Link
              className={`topbar-link ${view === 'projects' ? 'active' : ''}`}
              onClick={onProjects}
            >
              My projects
            </Link>
          )}
          {token ? (
            <Link className="topbar-link" onClick={onSignOut}>
              Sign out
            </Link>
          ) : (
            <span className="topbar-link topbar-link-static">Anonymous</span>
          )}
        </div>
      </div>
      <div className={`app-body${workspaceView ? ' app-body-workspace' : ''}`}>
        {workspaceView && (
          <aside className="workspace-rail" aria-label="Workspace navigation">
            <div className="workspace-rail-label">Workspace</div>
            <button type="button" className="workspace-rail-action" onClick={onLanding}>
              <span className="workspace-rail-icon">+</span>
              New analysis
            </button>
            {token && (
              <button type="button" className="workspace-rail-action" onClick={onProjects}>
                <span className="workspace-rail-icon">/</span>
                Saved projects
              </button>
            )}
            <div className="workspace-rail-label workspace-rail-process">Process</div>
            <ol className="workspace-rail-steps">
              {steps.map(([stepView, label], index) => {
                const enabled = stepView === 'landing' || Boolean(onNavigate?.canVisit?.[stepView])
                return (
                  <li key={stepView} className={`${view === stepView ? 'active ' : ''}${enabled ? '' : 'disabled'}`}>
                    <button
                      type="button"
                      onClick={() => enabled && onNavigate?.(stepView)}
                      disabled={!enabled}
                      aria-current={view === stepView ? 'step' : undefined}
                    >
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      {label}
                    </button>
                  </li>
                )
              })}
            </ol>
          </aside>
        )}
        <main className="container-wide">{children}</main>
      </div>
    </div>
  )
}
