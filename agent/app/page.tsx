'use client'

import {FormEvent, useEffect, useRef, useState} from 'react'
import ReactMarkdown from 'react-markdown'

const starterQuestions = [
  'What changed before INC-208?',
  'Trace the services affected by INC-208.',
  'Which runbook applies to INC-142?',
  'Compare INC-142 and INC-208.',
]

const progressSteps = [
  {after: 0, label: 'Connecting to the knowledge base'},
  {after: 2, label: 'Finding relevant incident records'},
  {after: 5, label: 'Tracing services, changes, and runbooks'},
  {after: 9, label: 'Checking evidence against sources'},
  {after: 14, label: 'Writing the evidence report'},
]

export default function Home() {
  const [question, setQuestion] = useState(starterQuestions[0])
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const reportRef = useRef<HTMLElement>(null)

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
    setAnswer('')
    setError('')
    reportRef.current?.scrollTo({top: 0})

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({question: prompt}),
      })
      const data = (await response.json()) as {answer?: string; error?: string}
      if (!response.ok) throw new Error(data.error || 'The investigation failed.')
      setAnswer(data.answer || 'No answer was returned.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The investigation failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main>
      <section className="hero">
        <div className="product">
          <span className="product-mark">IC</span>
          <div>
            <h1>Incident Context</h1>
            <p>Sanity-backed incident investigation</p>
          </div>
        </div>
        <p className="lede">Structured context · Source-linked answers</p>
      </section>

      <section className="workspace">
        <div className="question-panel">
          <div className="panel-heading">
            <span>Investigation</span>
            <span className="status"><i /> Ready</span>
          </div>

          <form onSubmit={ask}>
            <label htmlFor="question">Ask about an incident</label>
            <textarea
              id="question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={4}
              placeholder="What changed before INC-208?"
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Tracing evidence…' : 'Investigate'}
            </button>
          </form>

          <div className="starters">
            <p>Try a focused question</p>
            {starterQuestions.map((starter) => (
              <button key={starter} type="button" onClick={() => setQuestion(starter)}>
                {starter}
              </button>
            ))}
          </div>
        </div>

        <article className="answer-panel" aria-live="polite">
          <div className="panel-heading"><span>Evidence report</span><span>Facts · Inferences · Sources</span></div>
          <section className="report-scroll" ref={reportRef}>
          {!answer && !error && !loading && (
            <div className="empty">
              <h2>Ready to investigate</h2>
              <p>Choose a question or enter your own. The report will keep facts separate from inference.</p>
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
          {error && <div className="error">{error}</div>}
          {answer && (
            <div className="answer">
              <ReactMarkdown>{answer}</ReactMarkdown>
            </div>
          )}
          </section>
        </article>
      </section>
    </main>
  )
}
