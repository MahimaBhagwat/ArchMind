/**
 * App.jsx - Thin orchestrator for ArchMind.
 *
 * Owns the state machine (token, view, analysis, decisions, etc.) and routes
 * to view components under `./views/`. No more inlined UI here - every
 * component is its own file. The only local concerns are:
 *   1. Token persistence (loadToken / saveToken from lib/api.js)
 *   2. The view switcher
 *   3. The handlers that mutate state (analyze / clarify / resolve / generate)
 *
 * AppShell wraps every view via a render-prop pattern so the topbar is
 * consistent across the whole app.
 */

import { useEffect, useState, useCallback } from 'react'
import './App.css'

import { AppShell } from './components/AppShell.jsx'
import { AuthModal } from './components/AuthModal.jsx'
import { Button } from './components/Button.jsx'
import { ErrorBanner } from './components/ErrorBanner.jsx'

import { LandingScreen } from './views/LandingScreen.jsx'
import { WelcomeScreen } from './views/WelcomeScreen.jsx'
import { UnderstandingView } from './views/UnderstandingView.jsx'
import { DecisionsList } from './views/DecisionsList.jsx'
import { DecisionDetailView } from './views/DecisionDetailView.jsx'
import { FinalPromptView } from './views/FinalPromptView.jsx'
import { ArchitectureReportView } from './views/ArchitectureReportView.jsx'
import { ProjectsView } from './views/ProjectsView.jsx'
import { ProjectDetailView } from './views/ProjectDetailView.jsx'
import { ClarifyingQuestionsView } from './views/ClarifyingQuestionsView.jsx'
import DecisionFlowView from './DecisionFlowView.jsx'

import {
  loadToken,
  saveToken,
  clearToken,
  analyzeIdea,
  generateImplementation,
  saveProject,
  loadProject,
} from './lib/api.js'
import { friendlyAnalyzeError, friendlyError } from './errorMessages.js'
import { usePath, viewToPath, pathToView, syncPath } from './lib/router.js'

const MAX_CLARIFICATION_ROUNDS = 3

/* ????????? Helpers ??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????? */

/**
 * Normalize a decision record returned by the backend so the rest of the
 * app can rely on `title` (not `category`) and a stable status field.
 * Mirrors the 4-way `normalizeDecision` chain on the server.
 */
function normalizeDecisions(rawDecisions, idea) {
  return (rawDecisions || []).map((d) => ({
    ...d,
    title: d.title || d.category || '',
    category: d.title || d.category || '',
    alternatives: d.alternatives || [],
    chosen: '',
    reasoning: '',
    status: 'unresolved',
    _idea: idea,
  }))
}

function getDecisionKey(decision) {
  return decision?.title || decision?.category || ''
}

/* ????????? Root component ?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????? */

export default function App() {
  /* ?????? Auth ???????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????? */
  const [token, setToken] = useState(() => loadToken())
  const [authModalMode, setAuthModalMode] = useState(null) // 'login' | 'register' | null
  const [authError, setAuthError] = useState(null)

  /* View + project state. views: landing | analysis | decisionDetail | flow | prompt | projects | projectDetail | report | clarify | no-decisions
   * The URL is the source of truth for navigation; we sync view → URL via
   * `go()` and read URL → view on mount + popstate.
   */
  const [path, navigate] = usePath()
  const [view, setViewState] = useState(() => pathToView(window.location.pathname)?.view || 'home')
  const [activeProject, setActiveProject] = useState(null)
  const [openDecisionIdx, setOpenDecisionIdx] = useState(null)

  // Smart setView: updates state AND syncs the URL.
  // `params` lets callers pass route params (projectId, decisionKey).
  function setView(nextView, params = {}) {
    setViewState(nextView)
    const nextPath = viewToPath(nextView, {
      id: params.id || activeProject?._id,
      decisionKey:
        params.decisionKey ||
        (openDecisionIdx !== null && decisions[openDecisionIdx]
          ? getDecisionKey(decisions[openDecisionIdx])
          : undefined),
    })
    if (nextPath !== path) navigate(nextPath)
  }

  /* ?????? Idea + analysis ??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????? */
  const [ideaText, setIdeaText] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [decisions, setDecisions] = useState([])

  /* ?????? Phase 8: ambiguity flow state ????????????????????????????????????????????????????????????????????????????????????????????????????????? */
  const [clarifyingQuestion, setClarifyingQuestion] = useState(null)
  const [clarifyingAnswers, setClarifyingAnswers] = useState([])
  const [clarifyingRounds, setClarifyingRounds] = useState(0)
  const [noDecisionsMessage, setNoDecisionsMessage] = useState(null)

  /* ?????? Generation ?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????? */
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState(null)
  const [finalPrompt, setFinalPrompt] = useState(null)

  /* Token persistence: keep localStorage in sync */
  useEffect(() => {
    if (token) saveToken(token)
    else clearToken()
  }, [token])

  /* Deep-link hydration: when the URL points at /projects/:id or
   * /projects/:id/report, fetch the project so the detail/report view can
   * render. If the URL doesn't match any known route, fall back to landing.
   * If the project can't be loaded, redirect to /projects (the list view)
   * so the URL matches the displayed state.
   */
  useEffect(() => {
    const parsed = pathToView(path)
    if (!parsed) {
      if (path !== '/') navigate('/')
      setViewState('home')
      return
    }
    if (parsed.view === 'projectDetail' || parsed.view === 'report') {
      const id = parsed.params.id
      if (id && (!activeProject || activeProject._id !== id)) {
        loadProject(id)
          .then((data) => {
            setActiveProject(data?.project || null)
            setViewState(parsed.view)
          })
          .catch(() => {
            setActiveProject(null)
            setViewState('projects')
            navigate('/projects')
          })
        return
      }
    }
    setViewState(parsed.view)
  }, [path])

  useEffect(() => {
    if (view === 'flow' && decisions.length === 0) {
      setViewState('landing')
      if (path !== '/') navigate('/')
    }
  }, [view, decisions.length, path, navigate])

  /* ?????? Session-expired handler from lib/api.js ??????????????????????????????????????????????????????????????????????????? */
  useEffect(() => {
    function onExpired() {
      setToken(null)
      setAuthModalMode('login')
      setView('landing')
    }
    window.addEventListener('archmind:session-expired', onExpired)
    return () => window.removeEventListener('archmind:session-expired', onExpired)
  }, [])

  /* ?????? Reset all ambiguity state when returning to landing ???????????????????????????????????? */
  const resetAmbiguityState = useCallback(() => {
    setClarifyingQuestion(null)
    setClarifyingAnswers([])
    setClarifyingRounds(0)
    setNoDecisionsMessage(null)
  }, [])

  /* ?????? Analyze (works signed-out; saving requires sign-in) ????????????????????????????????? */
  async function handleAnalyze({ idea }) {
    if (analyzing) return
    setIdeaText(idea)
    setAnalyzing(true)
    setAnalyzeError(null)
    setAnalysis(null)
    setDecisions([])
    setFinalPrompt(null)
    try {
      const data = await analyzeIdea({ idea })
      // Branch on the three-state ambiguity signal.
      const ambiguityState = data.ambiguity?.state
      if (ambiguityState === 'needs_clarification' && data.ambiguity.clarifyingQuestion) {
        setClarifyingQuestion(data.ambiguity.clarifyingQuestion)
        setView('clarify')
        return
      }
      if (ambiguityState === 'no_decisions_required') {
        setNoDecisionsMessage(
          data.ambiguity?.reasoning ||
            'No material engineering decisions were identified for this product.'
        )
        setView('no-decisions')
        return
      }
      setAnalysis(data.analysis)
      const normalized = normalizeDecisions(data.analysis?.decisions, idea)
      setDecisions(normalized)
      // Phase 2: drop the user directly into the guided flow - the analysis
      // summary view is still reachable via "See full summary" from inside
      // the flow.
      setView(normalized.length === 0 ? 'analysis' : 'flow')
    } catch (err) {
      setAnalyzeError(friendlyAnalyzeError(err, 'Analysis failed. Please try again.'))
    } finally {
      setAnalyzing(false)
    }
  }

  /* ?????? Clarification round ??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????? */
  // Apply a clarifying question's answer and re-branches the state machine
  // based on the backend's response. The clarifyingAnswers array is
  // accumulated inside App and sent back on each call so the backend can
  // track history.
  async function handleClarifyAnswer({ selectedLabel, customAnswer }) {
    if (!clarifyingQuestion) return
    const answer = {
      question: clarifyingQuestion.question || '',
      selectedLabel: selectedLabel || '',
      customAnswer: customAnswer || '',
    }
    const nextAnswers = [...clarifyingAnswers, answer]
    const nextRounds = clarifyingRounds + 1
    setClarifyingAnswers(nextAnswers)
    setAnalyzeError(null)
    try {
      const data = await analyzeIdea({
        idea: ideaText,
        clarifyingAnswers: nextAnswers,
      })
      setClarifyingRounds(nextRounds)
      branchAmbiguity(data, nextRounds)
    } catch (err) {
      setAnalyzeError(friendlyAnalyzeError(err, 'Clarification failed. Please try again.'))
    }
  }

  // Used both by handleClarifyAnswer (legacy inline flow) and by
  // ClarifyingQuestionsView's onComplete (new dedupe-via-component flow).
  function branchAmbiguity(data, rounds) {
    const ambiguityState = data.ambiguity?.state
    if (ambiguityState === 'decisions') {
      setAnalysis(data.analysis)
      const normalized = normalizeDecisions(data.analysis?.decisions, ideaText)
      setDecisions(normalized)
      resetAmbiguityState()
      // Phase 2: drop the user directly into the guided flow.
      setView(normalized.length === 0 ? 'analysis' : 'flow')
      return
    }
    if (
      ambiguityState === 'needs_clarification' &&
      data.ambiguity.clarifyingQuestion &&
      rounds < MAX_CLARIFICATION_ROUNDS
    ) {
      setClarifyingQuestion(data.ambiguity.clarifyingQuestion)
      return
    }
    if (ambiguityState === 'no_decisions_required') {
      setNoDecisionsMessage(
        data.ambiguity?.reasoning ||
          'No material engineering decisions were identified.'
      )
    } else if (rounds >= MAX_CLARIFICATION_ROUNDS) {
      setNoDecisionsMessage(
        "After several clarification rounds we couldn't identify a material engineering direction. " +
          'Try rephrasing the product idea with more specific details about the user and their problem.'
      )
    }
    resetAmbiguityState()
    setView('no-decisions')
  }

  /* ?????? Decision resolution (from detail view) ?????????????????????????????????????????????????????????????????????????????? */
  function handleDecisionResolved(updatedDecision) {
    setDecisions((prev) => {
      const next = [...prev]
      const idx = next.findIndex((d) => getDecisionKey(d) === getDecisionKey(updatedDecision))
      if (idx >= 0) {
        const merged = { ...next[idx], ...updatedDecision }
        merged.status = merged.chosen ? 'resolved' : 'unresolved'
        next[idx] = merged
      }
      return next
    })
    setOpenDecisionIdx(null)
    setView('analysis')
  }

  /* ?????? Generate prompt + save project ??????????????????????????????????????????????????????????????????????????????????????????????????? */
  async function handleGenerate() {
    if (generating) return
    setGenerating(true)
    setGenerateError(null)
    if (!token) {
      setAuthModalMode('login')
      setGenerating(false)
      return
    }
    try {
      const data = await generateImplementation({ idea: ideaText, analysis, decisions })
      setFinalPrompt(data.prompt)
      // Recompute status from chosen-vs-empty at save time.
      const savedDecisions = decisions.map((d) => ({
        ...d,
        status: d.chosen ? 'resolved' : 'unresolved',
      }))
      await saveProject({
        idea: ideaText,
        analysis,
        decisions: savedDecisions,
        finalPrompt: data.prompt,
      })
      setView('prompt')
    } catch (err) {
      // Readiness data from generate endpoint may surface unresolved criticals.
      if (err?._classification === 'critical_unresolved' || /resolve these critical/i.test(err.message || '')) {
        setGenerateError(err.message || 'Resolve these critical decisions first.')
      } else {
        setGenerateError(friendlyError(err, 'Could not generate implementation prompt.'))
      }
    } finally {
      setGenerating(false)
    }
  }

  /* ?????? Auth handlers ?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????? */
  function handleAuth({ token: newToken }) {
    setToken(newToken)
    setAuthModalMode(null)
    setAuthError(null)
  }

  function signOut() {
    setToken(null)
    setActiveProject(null)
    setView('landing')
  }

  /* ?????? Navigation helpers ??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????? */
  function startNew() {
    setIdeaText('')
    setAnalysis(null)
    setDecisions([])
    setFinalPrompt(null)
    setOpenDecisionIdx(null)
    setAnalyzeError(null)
    setGenerateError(null)
    setActiveProject(null)
    resetAmbiguityState()
    setView('landing')
  }

  function goToProjects() {
    setView('projects')
  }

  function goToLanding() {
    resetAmbiguityState()
    setView('landing')
  }

  function goHome() {
    setView('home')
  }

  function handleStepNavigation(step) {
    if (step === 'landing') return startNew()
    if (step === 'analysis' && analysis) return setView('analysis')
    if (step === 'flow' && decisions.length > 0) return setView('flow')
    if (step === 'prompt' && finalPrompt) return setView('prompt')
    if (step === 'report' && activeProject) return setView('report')
  }

  const canVisit = {
    analysis: Boolean(analysis),
    flow: decisions.length > 0,
    prompt: Boolean(finalPrompt),
    report: Boolean(activeProject),
  }

  const shellNavigation = Object.assign(handleStepNavigation, { canVisit })

  function openDecision(idx) {
    setOpenDecisionIdx(idx)
    const d = decisions[idx]
    setView('decisionDetail', { decisionKey: d ? getDecisionKey(d) : undefined })
  }

  function openProject(projectOrId) {
    const id = typeof projectOrId === 'string' ? projectOrId : projectOrId?._id
    if (!id) return
    setActiveProject(typeof projectOrId === 'string' ? null : projectOrId)
    setView('projectDetail', { id })
  }

  /* ?????? Derived values ??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????? */
  const resolvedCount = decisions.filter((d) => d.chosen).length

  /* ?????? Render ??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????? */
  return (
    <>
      {authModalMode && (
        <AuthModal
          defaultMode={authModalMode}
          onClose={() => {
            setAuthModalMode(null)
            setAuthError(null)
          }}
          onAuth={handleAuth}
        />
      )}

      {view === 'home' && (
        <AppShell
          view={view}
          token={token}
          onLanding={goHome}
          onProjects={goToProjects}
          onSignOut={signOut}
          workspace={false}
        >
          <WelcomeScreen
            onStart={startNew}
            onSignIn={() => setAuthModalMode('login')}
            signedIn={Boolean(token)}
          />
        </AppShell>
      )}

      {view === 'landing' && (
        <AppShell
          view={view}
          token={token}
          onLanding={startNew}
          onProjects={goToProjects}
          onSignOut={signOut}
          onNavigate={shellNavigation}
        >
          {authError && <ErrorBanner message={authError} />}
          <LandingScreen
            onAnalyze={handleAnalyze}
            onSignIn={() => setAuthModalMode('login')}
            loading={analyzing}
            analyzeError={analyzeError}
          />
        </AppShell>
      )}

      {view === 'clarify' && clarifyingQuestion && (
        <AppShell
          view={view}
          token={token}
          onLanding={goToLanding}
          onProjects={goToProjects}
          onSignOut={signOut}
          onNavigate={shellNavigation}
        >
          {analyzeError && <ErrorBanner message={analyzeError} />}
          <ClarifyingQuestionsView
            idea={ideaText}
            options={clarifyingQuestion?.options || []}
            questions={clarifyingQuestion?.question ? [clarifyingQuestion.question] : []}
            round={clarifyingRounds + 1}
            maxRounds={MAX_CLARIFICATION_ROUNDS}
            onComplete={(data) => {
              const nextRounds = clarifyingRounds + 1
              setClarifyingAnswers([
                ...clarifyingAnswers,
                {
                  question: clarifyingQuestion?.question || '',
                  selectedLabel: '',
                  customAnswer: '',
                },
              ])
              setClarifyingRounds(nextRounds)
              branchAmbiguity(data, nextRounds)
            }}
            onStartOver={goToLanding}
          />
        </AppShell>
      )}

      {view === 'no-decisions' && (
        <AppShell
          view={view}
          token={token}
          onLanding={goToLanding}
          onProjects={goToProjects}
          onSignOut={signOut}
          onNavigate={shellNavigation}
        >
          <div className="page-header">
            <h1>No material engineering decisions identified</h1>
            <p>For "{ideaText}"</p>
          </div>
          <div className="no-decisions-card">
            <p>{noDecisionsMessage || 'No consequential engineering decisions were identified for this product.'}</p>
            <Button onClick={startNew}>Try a different idea</Button>
          </div>
        </AppShell>
      )}

      {view === 'analysis' && analysis && (
        <AppShell
          view={view}
          token={token}
          onLanding={startNew}
          onProjects={goToProjects}
          onSignOut={signOut}
          onNavigate={shellNavigation}
        >
          {analyzeError && <ErrorBanner message={analyzeError} />}

          <div className="page-header">
            <h1>I understand your product.</h1>
            <p>{analysis.product?.name || 'Your product'}</p>
            <div className="page-header-idea">"{ideaText}"</div>
          </div>

          <UnderstandingView analysis={analysis} idea={ideaText} />

          {decisions.some((d) => d.status === 'unresolved') && (
            <div className="flow-entry-cta">
              <Button
                variant="primary"
                size="lg"
                onClick={() => setView('flow')}
                data-testid="enter-flow"
              >
                Resume walk-through
              </Button>
              <p className="flow-entry-hint">
                You have {decisions.filter((d) => d.status === 'unresolved').length} unresolved decision{decisions.filter((d) => d.status === 'unresolved').length === 1 ? '' : 's'}.
                Use walk-through to address them one at a time.
              </p>
            </div>
          )}

          <DecisionsList
            decisions={decisions}
            onOpenDecision={(d) => {
              const idx = decisions.findIndex((x) => getDecisionKey(x) === getDecisionKey(d))
              openDecision(idx >= 0 ? idx : 0)
            }}
            onWalkFlow={() => setView('flow')}
            onSaveProject={handleGenerate}
            savingProject={generating}
            flowComplete={decisions.length === 0 || decisions.every((d) => d.status !== 'unresolved')}
          />

          {generateError && <ErrorBanner message={generateError} />}

          <div className="generate-cta">
            <div className="generate-cta-text">
              <strong>{resolvedCount}</strong> of <strong>{decisions.length}</strong> decisions resolved.
              Saving requires sign-in.
            </div>
            <Button
              variant="generate"
              size="lg"
              loading={generating}
              onClick={handleGenerate}
              data-testid="generate-prompt"
            >
              Generate implementation prompt
            </Button>
          </div>
        </AppShell>
      )}

      {view === 'flow' && decisions.length > 0 && (
        <AppShell
          view={view}
          token={token}
          onLanding={startNew}
          onProjects={goToProjects}
          onSignOut={signOut}
          onNavigate={shellNavigation}
        >
          <div className="page-header">
            <h1>Walk through decisions</h1>
            <p>One decision at a time, in priority order.</p>
          </div>
          {/* DecisionFlowView is the primary decision path - mounted directly
              with no wrapper (DecisionFlowView handles its own back/onOpenDetail). */}
          <DecisionFlowView
            decisions={decisions}
            onUpdate={setDecisions}
            onBack={() => setView('analysis')}
            onOpenDetail={(d) => {
              const idx = decisions.findIndex((x) => getDecisionKey(x) === getDecisionKey(d))
              openDecision(idx >= 0 ? idx : 0)
            }}
          />
        </AppShell>
      )}

      {view === 'decisionDetail' && openDecisionIdx !== null && (
        <AppShell
          view={view}
          token={token}
          onLanding={startNew}
          onProjects={goToProjects}
          onSignOut={signOut}
          onNavigate={shellNavigation}
        >
          <DecisionDetailView
            decision={decisions[openDecisionIdx]}
            allDecisions={decisions}
            idea={ideaText}
            onBack={() => setView('analysis')}
            onSave={handleDecisionResolved}
            onOpenFlow={() => setView('flow')}
          />
        </AppShell>
      )}

      {view === 'prompt' && finalPrompt && (
        <AppShell
          view={view}
          token={token}
          onLanding={startNew}
          onProjects={goToProjects}
          onSignOut={signOut}
          onNavigate={shellNavigation}
        >
          <FinalPromptView
            idea={ideaText}
            analysis={analysis}
            decisions={decisions}
            initialPrompt={finalPrompt}
            initialGeneratedAt={new Date().toISOString()}
            savedProjectId={activeProject?._id}
            onSaveProject={async () => {
              if (!token) {
                setAuthModalMode('login')
                return null
              }
              try {
                const saved = await saveProject({
                  idea: ideaText,
                  analysis,
                  decisions,
                  finalPrompt,
                })
                setActiveProject(saved?.project || null)
                return saved
              } catch (err) {
                setGenerateError(friendlyError(err, 'Could not save project.'))
                return null
              }
            }}
            onViewReport={() => {
              if (!activeProject) {
                setGenerateError('Save the project first to view the architecture report.')
                return
              }
              setView('report')
            }}
            onBackToFlow={() => setView('flow')}
            onViewProjects={goToProjects}
          />
        </AppShell>
      )}

      {view === 'projects' && (
        <AppShell
          view={view}
          token={token}
          onLanding={startNew}
          onProjects={goToProjects}
          onSignOut={signOut}
          onNavigate={shellNavigation}
        >
          <ProjectsView
            onNewProject={startNew}
            onOpenProject={openProject}
          />
        </AppShell>
      )}

      {view === 'projectDetail' && activeProject && (
        <AppShell
          view={view}
          token={token}
          onLanding={startNew}
          onProjects={goToProjects}
          onSignOut={signOut}
          onNavigate={shellNavigation}
        >
          <ProjectDetailView
            projectId={activeProject._id}
            onBack={goToProjects}
            onViewReport={() => setView('report')}
          />
        </AppShell>
      )}

      {view === 'report' && activeProject && (
        <AppShell
          view={view}
          token={token}
          onLanding={startNew}
          onProjects={goToProjects}
          onSignOut={signOut}
        >
          <ArchitectureReportView
            projectId={activeProject._id}
            idea={activeProject.idea}
            decisionCount={activeProject.decisions?.length || 0}
            resolvedCount={(activeProject.decisions || []).filter((d) => d.chosen).length}
            onBack={() => setView('projectDetail')}
          />
        </AppShell>
      )}
    </>
  )
}
