// ─── Pure markdown parser (no React dependency) ────────────────────────────
// Parses markdown into an AST that can be tested in plain Node and rendered
// to React elements by renderMarkdown() in App.jsx. Keeping the parser
// pure means it doesn't need a test runner, jsdom, or a JSX transform.

/**
 * Parse inline markdown into a list of typed nodes.
 *
 * Node shapes:
 *   { kind: 'text', text }
 *   { kind: 'code', text }
 *   { kind: 'strong', text }
 *   { kind: 'em', text }
 *   { kind: 'link', text, href }
 *
 * @param {string} text
 * @returns {Array<{kind: string, [k: string]: any}>}
 */
export function parseInline(text) {
  const out = []
  let i = 0
  const patterns = [
    { re: /`([^`\n]+)`/g, kind: 'code' },
    { re: /\*\*([^*\n]+)\*\*/g, kind: 'strong' },
    { re: /\*([^*\n]+)\*/g, kind: 'em' },
    {
      re: /\[([^\]]+)\]\(([^)\s]+)\)/g,
      kind: 'link',
      make: (m) => ({ text: m[1], href: m[2] }),
    },
  ]
  while (i < text.length) {
    let matched = false
    for (const p of patterns) {
      p.re.lastIndex = i
      const m = p.re.exec(text)
      if (m && m.index === i) {
        const node = p.make
          ? { kind: p.kind, ...p.make(m) }
          : { kind: p.kind, text: m[1] }
        out.push(node)
        i += m[0].length
        matched = true
        break
      }
    }
    if (!matched) {
      let nextIdx = text.length
      for (const p of patterns) {
        p.re.lastIndex = i + 1
        const m = p.re.exec(text)
        if (m && m.index < nextIdx) nextIdx = m.index
      }
      out.push({ kind: 'text', text: text.slice(i, nextIdx) })
      i = nextIdx
    }
  }
  return out
}

/**
 * Parse a markdown document into an AST of block elements.
 *
 * Block shapes:
 *   { kind: 'code', lang, text }
 *   { kind: 'hr' }
 *   { kind: 'heading', level, inline: InlineNode[] }
 *   { kind: 'blockquote', children: Block[] }
 *   { kind: 'table', header: string[], rows: string[][] }
 *   { kind: 'ul', items: InlineNode[][] }
 *   { kind: 'ol', items: InlineNode[][] }
 *   { kind: 'p', inline: InlineNode[] }
 *
 * @param {string} md
 * @returns {Array<{kind: string, [k: string]: any}>}
 */
export function parseMarkdown(md) {
  if (!md) return []
  const lines = md.split('\n')
  const blocks = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // Code fence
    if (/^```/.test(line)) {
      const lang = line.replace(/^```/, '').trim()
      const body = []
      i++
      while (i < lines.length && !/^```/.test(lines[i])) {
        body.push(lines[i])
        i++
      }
      i++ // skip closing fence
      blocks.push({ kind: 'code', lang, text: body.join('\n') })
      continue
    }

    // Horizontal rule
    if (/^---+\s*$/.test(line)) {
      blocks.push({ kind: 'hr' })
      i++
      continue
    }

    // Heading
    const h = /^(#{1,6})\s+(.*)$/.exec(line)
    if (h) {
      blocks.push({
        kind: 'heading',
        level: h[1].length,
        inline: parseInline(h[2].trimEnd()),
      })
      i++
      continue
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const body = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        body.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      blocks.push({
        kind: 'blockquote',
        children: parseMarkdown(body.join('\n')),
      })
      continue
    }

    // Table (simple markdown tables)
    if (
      /^\|.*\|\s*$/.test(line) &&
      i + 1 < lines.length &&
      /^\|[\s:|-]+\|\s*$/.test(lines[i + 1])
    ) {
      const header = line.split('|').slice(1, -1).map((c) => c.trim())
      i += 2 // skip header + separator
      const rows = []
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) {
        rows.push(
          lines[i]
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim())
        )
        i++
      }
      blocks.push({ kind: 'table', header, rows })
      continue
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''))
        i++
      }
      blocks.push({ kind: 'ul', items: items.map(parseInline) })
      continue
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''))
        i++
      }
      blocks.push({ kind: 'ol', items: items.map(parseInline) })
      continue
    }

    // Blank line
    if (line.trim() === '') {
      i++
      continue
    }

    // Paragraph: gather consecutive non-special lines
    const paraLines = [line]
    i++
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^```/.test(lines[i]) &&
      !/^---+\s*$/.test(lines[i]) &&
      !/^#{1,6}\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^\|.*\|\s*$/.test(lines[i])
    ) {
      paraLines.push(lines[i])
      i++
    }
    blocks.push({
      kind: 'p',
      inline: parseInline(paraLines.join(' ')),
    })
  }
  return blocks
}



