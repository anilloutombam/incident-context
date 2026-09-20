'use client'

import {FormEvent, useEffect, useRef, useState} from 'react'

type InvestigationReport = {
  answer: string
  evidenceTrail: Array<{
    from: string
    relationship: string
    to: string
    source: string
  }>
  confirmedEvidence: string[]
  inferences: string[]
  recommendedNextStep: string
  sources: Array<{label: string; path: string}>
}

const starterQuestions = [
  'What changed before INC-208?',
  'Trace the services affected by INC-208.',
  'Which runbook applies to INC-142?',
  'Compare INC-142 and INC-208.',
]

const MAX_QUESTION_LENGTH = 500

function plainText(value: string) {
  return value
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .trim()
}

const progressSteps = [
  {after: 0, label: 'Connecting to the knowledge base'},
  {after: 2, label: 'Finding relevant incident records'},
  {after: 5, label: 'Tracing services, changes, and runbooks'},
  {after: 9, label: 'Checking evidence against sources'},
  {after: 14, label: 'Writing the evidence report'},
]

export default function Home() {
  const [question, setQuestion] = useState(starterQuestions[0])
  const [report, setReport] = useState<InvestigationReport | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [health, setHealth] = useState<'checking' | 'ready' | 'degraded'>('checking')
  const reportRef = useRef<HTMLElement>(null)

  useEffect(() => {
    fetch('/api/health', {cache: 'no-store'})
      .then((response) => setHealth(response.ok ? 'ready' : 'degraded'))
      .catch(() => setHealth('degraded'))
  }, [])

  useEffect(() => {
    if (!loading) return
    setElapsed(0)
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [loading])

  const activeStep = progressSteps.findLastIndex((step) => elapsed >= step.after)

  async function ask(event: FormEvent) {
    event.preventDefault()
    const prompt = question.trim()
    if (!prompt || loading) return

    setLoading(true)
    setReport(null)
    setError('')
    reportRef.current?.scrollTo({top: 0})

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({question: prompt}),
      })
      const data = (await response.json()) as {
        report?: InvestigationReport
        error?: string
        retryAt?: string
      }
      if (!response.ok) {
        const resetTime = data.retryAt
          ? new Date(data.retryAt).toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
              second: '2-digit',
            })
          : null
        throw new Error(
          `${data.error || 'The investigation failed.'}${resetTime ? ` Available again around ${resetTime}.` : ''}`,
        )
      }
      if (!data.report) throw new Error('No evidence report was returned.')
      setReport(data.report)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The investigation failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M5 7.5h5v9H5zM14 4h5v16h-5z" /></svg>
          </span>
          <div>
            <h1>Incident Context</h1>
            <p>Operations</p>
          </div>
        </div>
        <div className="topbar-meta">
          <span className="environment">production</span>
          <span className={`system-status ${health}`}>
            <i /> {health === 'checking' ? 'Checking systems' : health === 'ready' ? 'Systems ready' : 'Configuration issue'}
          </span>
        </div>
      </header>

      <section className="workspace">
        <aside className="query-panel">
          <div className="query-intro">
            <span className="section-label">New investigation</span>
            <h2>Ask about an incident</h2>
            <p>Answers are grounded in linked services, changes, deployments, and runbooks.</p>
          </div>

          <form onSubmit={ask}>
            <label htmlFor="question">Question</label>
            <textarea
              id="question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                  event.preventDefault()
                  event.currentTarget.form?.requestSubmit()
                }
              }}
              rows={4}
              maxLength={MAX_QUESTION_LENGTH}
              placeholder="What changed before INC-208?"
            />
            <div className="question-meta">
              <span><kbd>⌘</kbd><kbd>↵</kbd> to run</span>
              <span>{question.length}/{MAX_QUESTION_LENGTH}</span>
            </div>
            <button type="submit" disabled={loading}>
              {loading ? <><i className="spinner" /> Investigating</> : 'Run investigation'}
            </button>
          </form>

          <div className="starters">
            <p>Examples</p>
            {starterQuestions.map((starter) => (
              <button key={starter} type="button" onClick={() => setQuestion(starter)}>
                <span>{starter}</span><i>↗</i>
              </button>
            ))}
          </div>
          <footer className="query-footer">Sanity Context MCP · Gemini</footer>
        </aside>

        <article className="report-panel" aria-live="polite">
          <header className="report-header">
            <div>
              <span className="section-label">Evidence report</span>
              <span className="report-subtitle">Facts, inferences, and sources</span>
            </div>
            <span className={`report-state ${loading ? 'running' : error ? 'failed' : report ? 'complete' : ''}`}>
              {loading ? 'Running' : error ? 'Needs attention' : report ? 'Complete' : 'No report'}
            </span>
          </header>
          <section className="report-scroll" ref={reportRef}>
          {!report && !error && !loading && (
            <div className="empty">
              <span className="empty-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M4 5h16M4 12h10M4 19h7" /></svg>
              </span>
              <h2>No investigation yet</h2>
              <p>Enter a focused incident question. The report will separate confirmed evidence from inference and cite its sources.</p>
            </div>
          )}
          {loading && (
            <div className="progress" role="status">
              <div className="progress-meta"><span>Investigation in progress</span><time>{elapsed}s</time></div>
              <div className="progress-bar"><i style={{width: `${Math.min(92, 12 + elapsed * 5)}%`}} /></div>
              <ol>
                {progressSteps.map((step, index) => (
                  <li key={step.label} className={index < activeStep ? 'done' : index === activeStep ? 'active' : ''}>
                    <i>{index < activeStep ? '✓' : index + 1}</i><span>{step.label}</span>
                  </li>
                ))}
              </ol>
              <p>This can take a few seconds while sources are retrieved and checked.</p>
            </div>
          )}
          {error && (
            <div className="error">
              <span>Error</span>
              <h2>Investigation could not complete</h2>
              <p>{error}</p>
              <button type="button" onClick={() => setError('')}>Dismiss</button>
            </div>
          )}
          {report && (
            <div className="report-content">
              <section className="evidence-overview" aria-labelledby="evidence-trail-title">
                <div className="evidence-overview-header">
                  <div>
                    <span className="section-label">Relationship trace</span>
                    <h2 id="evidence-trail-title">Evidence trail</h2>
                  </div>
                  <dl className="evidence-counts">
                    <div><dt>Evidence</dt><dd>{report.confirmedEvidence.length}</dd></div>
                    <div><dt>Inferences</dt><dd>{report.inferences.length}</dd></div>
                    <div><dt>Sources</dt><dd>{report.sources.length}</dd></div>
                  </dl>
                </div>
                {report.evidenceTrail.length > 0 ? (
                  <ol className="trail-list">
                    {report.evidenceTrail.map((edge, index) => (
                      <li key={`${edge.from}-${edge.relationship}-${edge.to}-${index}`}>
                        <div className="trail-edge">
                          <span className="trail-node">{plainText(edge.from)}</span>
                          <span className="trail-relation"><i>→</i>{plainText(edge.relationship)}</span>
                          <span className="trail-node">{plainText(edge.to)}</span>
                        </div>
                        <code>{plainText(edge.source)}</code>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="trail-empty">No explicit relationship path was required for this answer.</p>
                )}
              </section>

              <div className="answer">
                <section>
                  <h2><span>1</span>Answer</h2>
                  <p>{plainText(report.answer)}</p>
                </section>
                <section>
                  <h2><span>2</span>Confirmed evidence</h2>
                  <ul>{report.confirmedEvidence.map((item) => <li key={item}>{plainText(item)}</li>)}</ul>
                </section>
                <section>
                  <h2><span>3</span>Inferences</h2>
                  {report.inferences.length > 0
                    ? <ul>{report.inferences.map((item) => <li key={item}>{plainText(item)}</li>)}</ul>
                    : <p className="muted-answer">No inference was required for this answer.</p>}
                </section>
                <section>
                  <h2><span>4</span>Recommended next step</h2>
                  <p>{plainText(report.recommendedNextStep)}</p>
                </section>
                <section>
                  <h2><span>5</span>Sources</h2>
                  <ul className="source-list">
                    {report.sources.map((source) => (
                      <li key={source.path}><strong>{plainText(source.label)}</strong><code>{plainText(source.path)}</code></li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          )}
          </section>
        </article>
      </section>
    </main>
  )
}
