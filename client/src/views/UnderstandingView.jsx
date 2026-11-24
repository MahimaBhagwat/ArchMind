/**
 * views/UnderstandingView.jsx - "Here's what I understood" surface.
 *
 * Replaces the inlined `UnderstoodProduct` component from App.jsx. Renders
 * the AI's interpretation of the user's idea as labeled sections, not a
 * wall of paragraphs.
 *
 * Preserves the data shape from App.jsx:
 *   analysis = {
 *     summary,
 *     product: { name, type, ... },
 *     personas: [...],
 *     features: [...],
 *     constraints: [...],
 *     clarifyingAnswers: [...],
 *     decisions: [...]
 *   }
 *
 * Sections are hidden if the corresponding data is missing (so the layout
 * doesn't show empty dividers).
 */

function Section({ label, children, optional = false }) {
  return (
    <div className="understanding-section">
      <div className="understanding-section-label">{label}</div>
      <div className="understanding-section-body">{children}</div>
    </div>
  )
}

function Chips({ items }) {
  if (!items || items.length === 0) return null
  return (
    <div className="understanding-chips">
      {items.map((item, i) => (
        <span key={i} className="understanding-chip">{item}</span>
      ))}
    </div>
  )
}

function List({ items }) {
  if (!items || items.length === 0) return null
  return (
    <ul className="understanding-list">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  )
}

export function UnderstandingView({ analysis, idea }) {
  if (!analysis) return null
  const summary = analysis.summary || analysis.description || ''
  const product = analysis.product || {}
  const personas = analysis.personas || []
  const features = analysis.features || []
  const constraints = analysis.constraints || []
  const clarifyingAnswers = analysis.clarifyingAnswers || []

  return (
    <div className="understanding">
      <header className="understanding-header">
        <div className="eyebrow">Product understanding</div>
        <h2 className="understanding-title">
          {product.name || analysis.productName || 'Your idea, as I understood it'}
        </h2>
        {idea && (
          <div className="understanding-idea">
            <span className="muted-label">Original idea:</span> {idea}
          </div>
        )}
        {summary && <p className="understanding-summary">{summary}</p>}
      </header>

      <div className="understanding-grid">
        {product.type && (
          <Section label="Product type">
            <div className="understanding-product-meta">
              <Chips items={product.type?.split(',').map(s => s.trim()).filter(Boolean)} />
            </div>
          </Section>
        )}

        {personas.length > 0 && (
          <Section label="Target users">
            <List items={personas} />
          </Section>
        )}

        {features.length > 0 && (
          <Section label="Core features">
            <List items={features} />
          </Section>
        )}

        {constraints.length > 0 && (
          <Section label="Constraints & assumptions">
            <List items={constraints} />
          </Section>
        )}

        {clarifyingAnswers.length > 0 && (
          <Section label="Clarifications you provided">
            <ul className="understanding-clarify">
              {clarifyingAnswers.map((qa, i) => (
                <li key={i}>
                  <div className="understanding-clarify-q">{qa.question}</div>
                  <div className="understanding-clarify-a">{qa.answer || '- (skipped)'}</div>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </div>
  )
}