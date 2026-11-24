import { parseMarkdown } from '../reportMarkdown.js'

function Inline({ nodes }) {
  return nodes.map((node, index) => {
    if (node.kind === 'text') return <span key={index}>{node.text}</span>
    if (node.kind === 'code') return <code key={index} className="md-code">{node.text}</code>
    if (node.kind === 'strong') return <strong key={index} className="md-strong">{node.text}</strong>
    if (node.kind === 'em') return <em key={index} className="md-em">{node.text}</em>
    if (node.kind === 'link') return <a key={index} href={node.href} target="_blank" rel="noopener noreferrer">{node.text}</a>
    return null
  })
}

function Blocks({ blocks }) {
  return blocks.map((block, index) => {
    if (block.kind === 'p') return <p key={index} className="md-p"><Inline nodes={block.inline} /></p>
    if (block.kind === 'heading') return <div key={index} className={`md-h${Math.min(block.level, 4)}`}><Inline nodes={block.inline} /></div>
    if (block.kind === 'ul') return <ul key={index} className="md-ul">{block.items.map((item, itemIndex) => <li key={itemIndex}><Inline nodes={item} /></li>)}</ul>
    if (block.kind === 'ol') return <ol key={index} className="md-ol">{block.items.map((item, itemIndex) => <li key={itemIndex}><Inline nodes={item} /></li>)}</ol>
    if (block.kind === 'code') return <pre key={index} className="md-pre"><code>{block.text}</code></pre>
    if (block.kind === 'blockquote') return <blockquote key={index} className="md-blockquote"><Blocks blocks={block.children} /></blockquote>
    if (block.kind === 'hr') return <hr key={index} className="md-hr" />
    if (block.kind === 'table') {
      return (
        <div key={index} className="md-table-wrap">
          <table className="md-table">
            <thead><tr>{block.header.map((cell, cellIndex) => <th key={cellIndex}>{cell}</th>)}</tr></thead>
            <tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )
    }
    return null
  })
}

export function MarkdownContent({ markdown, className = '' }) {
  return <div className={`markdown-content ${className}`.trim()}><Blocks blocks={parseMarkdown(markdown)} /></div>
}
