/**
 * views/ArchitectureReportView.jsx - Full architecture report (FIXES P0).
 *
 * This component was REFERENCED but never DEFINED in the original App.jsx
 * (line ~1761). Loading any project triggered a ReferenceError.
 *
 * Renders a deterministic report assembled server-side by
 * services/reportBuilder.js. The server returns `{ report: markdownString }`.
 * We parse the markdown into sectioned blocks and render:
 *
 *   - Title bar (project title + decision counts + freshness)
 *   - Left-rail TOC (sticky on wide screens)
 *   - Sectioned body - H2 becomes a card per section, with the body
 *     rendered through the existing `reportMarkdown.parseInline` /
 *     `parseMarkdown` pipeline
 *   - Download / copy actions in the header
 *
 * The report is server-deterministic - no LLM calls, no client caching
 * tricks needed beyond a single `useEffect` fetch.
 *
 * Sections detected (from reportBuilder.js):
 *   Cover · Product Understanding · Readiness · Decision Tree ·
 *   Decision Graph · Architecture Decision Records · Change Impact Map ·
 *   Master Implementation Prompt · Per-Decision Implementation Prompts ·
 *   Appendix: Filtered-Out Decisions
 */

import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/Button.jsx'
import { LoadingShell } from '../components/LoadingShell.jsx'
import { ErrorBanner } from '../components/ErrorBanner.jsx'
import { EmptyState } from '../components/EmptyState.jsx'
import { loadReport } from '../lib/api.js'
import { parseMarkdown, parseInline } from '../reportMarkdown.js'

const SECTION_ORDER = [
  'Cover',
  'Product Understanding',
  'Readiness',
  'Decision Tree',
  'Decision Graph',
  'Architecture Decision Records',
  'Change Impact Map',
  'Master Implementation Prompt',
  'Per-Decision Implementation Prompts',
  'Appendix',
]

/**
 * Split a markdown string into { title, blocks } per top-level H2.
 * The first H1 becomes the report title.
 */
function splitSections(md) {
  if (!md) return { title: 'Architecture report', sections: [] }
  const blocks = parseMarkdown(md)
  const sections = []
  let currentTitle = null
  let currentBlocks = []

  for (const b of blocks) {
    if (b.kind === 'heading' && b.level === 1) {
      // report title - keep separate
      continue
    }
    if (b.kind === 'heading' && b.level === 2) {
      if (currentTitle) {
        sections.push({ title: currentTitle, blocks: currentBlocks })
      }
      currentTitle = b.inline.map((n) => n.text || '').join('')
      currentBlocks = []
    } else if (currentTitle) {
      currentBlocks.push(b)
    }
  }
  if (currentTitle) {
    sections.push({ title: currentTitle, blocks: currentBlocks })
  }
  // Sort by SECTION_ORDER so the UI is deterministic regardless of any
  // reorderings server-side might do later.
  const order = (t) => {
    for (let i = 0; i < SECTION_ORDER.length; i++) {
      if (t.toLowerCase().startsWith(SECTION_ORDER[i].toLowerCase())) return i
    }
    return 999
  }
  sections.sort((a, b) => order(a.title) - order(b.title))
  return { title: blocks[0]?.inline?.map((n) => n.text || '').join('') || 'Architecture report', sections }
}

/* ─── Inline renderer (text, code, strong, em, link) ───────────────────── */

function Inline({ nodes, key }) {
  return (
    <>
      {nodes.map((n, i) => {
        if (n.kind === 'text') return <span key={i}>{n.text}</span>
        if (n.kind === 'code') return <code key={i} className="md-code">{n.text}</code>
        if (n.kind === 'strong') return <strong key={i} className="md-strong">{n.text}</strong>
        if (n.kind === 'em') return <em key={i} className="md-em">{n.text}</em>
        if (n.kind === 'link') return <a key={i} href={n.href} target="_blank" rel="noopener noreferrer">{n.text}</a>
        return null
      })}
    </>
  )
}

/* ─── Block renderer ────────────────────────────────────────────────────── */

function Blocks({ blocks }) {
  if (!blocks || blocks.length === 0) return null
  return (
    <>
      {blocks.map((b, i) => {
        if (b.kind === 'p') return <p key={i} className="md-p"><Inline nodes={b.inline} /></p>
        if (b.kind === 'heading') {
          const cls = `md-h${Math.min(b.level, 4)}`
          return <div key={i} className={cls}><Inline nodes={b.inline} /></div>
        }
        if (b.kind === 'ul') {
          return (
            <ul key={i} className="md-ul">
              {b.items.map((item, j) => <li key={j}><Inline nodes={item} /></li>)}
            </ul>
          )
        }
        if (b.kind === 'ol') {
          return (
            <ol key={i} className="md-ol">
              {b.items.map((item, j) => <li key={j}><Inline nodes={item} /></li>)}
            </ol>
          )
        }
        if (b.kind === 'code') {
          return (
            <pre key={i} className="md-pre">
              <code>{b.text}</code>
            </pre>
          )
        }
        if (b.kind === 'blockquote') {
          return (
            <blockquote key={i} className="md-blockquote">
              <Blocks blocks={b.children} />
            </blockquote>
          )
        }
        if (b.kind === 'hr') return <hr key={i} className="md-hr" />
        if (b.kind === 'table') {
          return (
            <div key={i} className="md-table-wrap">
              <table className="md-table">
                <thead>
                  <tr>{b.header.map((h, j) => <th key={j}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {b.rows.map((row, j) => (
                    <tr key={j}>{row.map((cell, k) => <td key={k}>{cell}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        return null
      })}
    </>
  )
}

/* ─── TOC ──────────────────────────────────────────────────────────────── */

function TOC({ sections, activeId, onJump }) {
  return (
    <nav className="report-toc" aria-label="Report sections">
      <div className="report-toc-label">Sections</div>
      <ol className="report-toc-list">
        {sections.map((s, i) => {
          const id = `section-${i}`
          return (
            <li key={id}>
              <button
                type="button"
                className={`report-toc-item${activeId === id ? ' active' : ''}`}
                onClick={() => onJump(id)}
              >
                {s.title}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/* ─── View ─────────────────────────────────────────────────────────────── */

export function ArchitectureReportView({
  projectId,
  idea,
  decisionCount = 0,
  resolvedCount = 0,
  onBack,
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [markdown, setMarkdown] = useState('')
  const [activeId, setActiveId] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    loadReport(projectId)
      .then((data) => {
        if (cancelled) return
        setMarkdown(data?.report || '')
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

  const { title, sections } = useMemo(() => splitSections(markdown), [markdown])

  // Track scroll position for TOC active state
  useEffect(() => {
    function onScroll() {
      let bestId = null
      let bestTop = -Infinity
      const headings = document.querySelectorAll('.report-section-anchor')
      for (const el of headings) {
        const top = el.getBoundingClientRect().top
        if (top < 96 && top > bestTop) {
          bestTop = top
          bestId = el.id
        }
      }
      if (bestId) setActiveId(bestId)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [sections.length])

  function jumpTo(id) {
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveId(id)
  }

  async function handleCopy() {
    if (!markdown) return
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* ignore */ }
  }

  function handleDownload() {
    if (!markdown) return
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `architecture-report-${projectId}.md`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  if (!projectId) {
    return (
      <EmptyState
        icon="!"
        title="No project loaded"
        body="Open a saved project from My projects to view its architecture report."
        actionLabel="Back"
        onAction={onBack}
      />
    )
  }

  return (
    <article className="report-shell-v2">
      <header className="report-shell-v2-header">
        <button className="back-link" onClick={onBack}>← Back</button>
        <div className="report-shell-v2-meta-row">
          <div>
            <div className="eyebrow">Architecture report</div>
            <h1 className="report-shell-v2-title">{title}</h1>
          </div>
          <div className="report-shell-v2-meta">
            {decisionCount > 0 && (
              <span className="report-stat">
                <strong>{decisionCount}</strong> decisions
              </span>
            )}
            {resolvedCount > 0 && (
              <span className="report-stat">
                <strong>{resolvedCount}</strong> resolved
              </span>
            )}
            <span className="report-stat">
              <strong>Deterministic</strong> build
            </span>
          </div>
        </div>
        {idea && (
          <div className="report-shell-v2-idea">
            <span className="muted-label">From idea:</span> {idea}
          </div>
        )}
        <div className="report-shell-v2-actions">
          <Button variant="secondary" onClick={handleCopy} disabled={!markdown}>
            {copied ? 'Copied v' : 'Copy markdown'}
          </Button>
          <Button variant="secondary" onClick={handleDownload} disabled={!markdown}>
            Download .md
          </Button>
        </div>
      </header>

      {loading && <LoadingShell label="Building report..." helper="Re-rendering the stored project state - no AI calls." />}
      {error && (
        <ErrorBanner
          error={error}
          fallback="Couldn't load the report."
          onRetry={() => setError(null)}
        />
      )}

      {!loading && !error && sections.length === 0 && (
        <EmptyState
          icon="∅"
          title="Report is empty"
          body="This project has no decisions or data to render."
        />
      )}

      {!loading && !error && sections.length > 0 && (
        <div className="report-shell-v2-body">
          <TOC sections={sections} activeId={activeId} onJump={jumpTo} />
          <div className="report-shell-v2-content">
            {sections.map((s, i) => {
              const id = `section-${i}`
              return (
                <section key={id} id={id} className="report-section-anchor report-section-v2">
                  <header className="report-section-v2-header">
                    <h2 className="report-section-v2-title">{s.title}</h2>
                  </header>
                  <div className="report-section-v2-body">
                    <Blocks blocks={s.blocks} />
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      )}
    </article>
  )
}