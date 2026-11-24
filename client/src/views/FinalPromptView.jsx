/**
 * views/FinalPromptView.jsx - Generated master implementation prompt.
 *
 * Replaces the inlined FinalPromptView from App.jsx. Composed of:
 *   - Header: title + meta (decisions count, generated-at)
 *   - Copy + Download + "View architecture report" actions
 *   - Read-only textarea holding the prompt (selectable, copyable)
 *   - "Save as project" CTA (if not already saved)
 *   - "Re-generate" CTA (forces a fresh generate call)
 *
 * The textarea is the right primitive - it preserves copy-paste-ability,
 * preserves newlines, and respects the monospace aesthetic.
 */

import { useState } from 'react'
import { Button } from '../components/Button.jsx'
import { generateImplementation } from '../lib/api.js'
import { ErrorBanner } from '../components/ErrorBanner.jsx'
import { MarkdownContent } from '../components/MarkdownContent.jsx'

function fmtDateTime(iso) {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function FinalPromptView({
  idea,
  analysis,
  decisions,
  initialPrompt,
  initialGeneratedAt,
  savedProjectId,
  onSaveProject,
  onViewReport,
  onBackToFlow,
  onViewProjects,
}) {
  const [prompt, setPrompt] = useState(initialPrompt || '')
  const [generatedAt, setGeneratedAt] = useState(initialGeneratedAt || null)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)

  async function handleRegenerate() {
    setRegenerating(true)
    setError(null)
    try {
      const data = await generateImplementation({ idea, decisions, analysis })
      setPrompt(data?.prompt || data?.finalPrompt || '')
      setGeneratedAt(new Date().toISOString())
    } catch (err) {
      setError(err)
    } finally {
      setRegenerating(false)
    }
  }

  async function handleCopy() {
    if (!prompt) return
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Fallback: select the textarea contents.
      const ta = document.getElementById('final-prompt-textarea')
      if (ta) {
        ta.select()
        try { document.execCommand('copy') } catch { /* ignore */ }
      }
    }
  }

  function handleDownload() {
    if (!prompt) return
    const blob = new Blob([prompt], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `archmind-prompt-${Date.now()}.md`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="final-prompt-v2">
      <header className="final-prompt-v2-header">
        <nav className="final-prompt-v2-nav" aria-label="Prompt view navigation">
          {onBackToFlow && (
            <button
              type="button"
              className="final-prompt-v2-back"
              onClick={onBackToFlow}
            >
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10 12L6 8L10 4" />
              </svg>
              <span>Back to walkthrough</span>
            </button>
          )}
          {onViewProjects && (
            <button
              type="button"
              className="final-prompt-v2-back"
              onClick={onViewProjects}
            >
              <span>View all projects</span>
            </button>
          )}
        </nav>
        <div className="final-prompt-v2-eyebrow">
          {prompt ? 'Ready to ship' : 'Generating your prompt'}
        </div>
        <h2 className="final-prompt-v2-title">
          {prompt ? 'Your implementation prompt' : 'Building your prompt...'}
        </h2>
        <p className="final-prompt-v2-sub">
          {prompt
            ? 'Drop this into your AI coding tool. Every decision you made is encoded, plus the original context.'
            : 'Walking through the decisions and assembling a single prompt you can paste into any AI coding assistant.'}
        </p>
        <div className="final-prompt-v2-meta">
          {decisions?.length > 0 && (
            <span>{decisions.length} decisions encoded</span>
          )}
          {generatedAt && (
            <span className="muted-label">· Generated {fmtDateTime(generatedAt)}</span>
          )}
        </div>
      </header>

      {error && (
        <ErrorBanner
          error={error}
          fallback="Couldn't regenerate the prompt."
          kind="analyze"
          onRetry={handleRegenerate}
          onDismiss={() => setError(null)}
        />
      )}

      <div className="prompt-output-v2-wrap">
        {editing || !prompt ? (
          <textarea
            id="final-prompt-textarea"
            className="prompt-output-v2"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Your generated prompt will appear here..."
            spellCheck={false}
            aria-label="Editable implementation prompt"
          />
        ) : (
          <MarkdownContent markdown={prompt} className="prompt-markdown-v2" />
        )}
      </div>

      <div className="final-prompt-v2-actions">
        <Button variant="secondary" onClick={handleCopy} disabled={!prompt}>
          {copied ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="4 12 10 18 20 6" />
            </svg>
            Copied
          </span>
        ) : 'Copy to clipboard'}
        </Button>
        <Button variant="secondary" onClick={handleDownload} disabled={!prompt}>
          Download as .md
        </Button>
        <Button variant="secondary" onClick={() => setEditing((current) => !current)} disabled={!prompt}>
          {editing ? 'Preview formatted prompt' : 'Edit Markdown'}
        </Button>
        {savedProjectId && onViewReport && (
          <Button variant="primary" onClick={onViewReport}>
            View architecture report →
          </Button>
        )}
        {!savedProjectId && onSaveProject && (
          <Button variant="primary" onClick={onSaveProject}>
            Save as project
          </Button>
        )}
        <Button variant="ghost" onClick={handleRegenerate} loading={regenerating}>
          Regenerate
        </Button>
      </div>
    </section>
  )
}
