// Tests for client/src/reportMarkdown.js
// Plain Node test runner - no dependencies beyond what the parser itself uses.

import { parseInline, parseMarkdown } from './reportMarkdown.js'

let passCount = 0
let failCount = 0
const failures = []

function deepEqual(a, b) {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (a === null || b === null) return a === b
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return false
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false
    return true
  }
  if (typeof a === 'object') {
    const keysA = Object.keys(a).sort()
    const keysB = Object.keys(b).sort()
    if (keysA.length !== keysB.length) return false
    for (const k of keysA) {
      if (!keysB.includes(k)) return false
      if (!deepEqual(a[k], b[k])) return false
    }
    return true
  }
  return false
}

function pass(label, ok, detail) {
  if (ok) {
    passCount++
    console.log(`  v ${label}`)
  } else {
    failCount++
    failures.push({ label, detail })
    console.log(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`)
  }
}

function eq(label, actual, expected) {
  const ok = deepEqual(actual, expected)
  const detail = ok ? null : `\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`
  pass(label, ok, detail)
}

// ─── parseInline ────────────────────────────────────────────────────────────

console.log('='.repeat(60))
console.log('SUITE: parseInline')
console.log('='.repeat(60))

eq('plain text → single text node',
  parseInline('hello world'),
  [{ kind: 'text', text: 'hello world' }])

eq('empty string → empty array',
  parseInline(''),
  [])

eq('inline code',
  parseInline('use `npm install` first'),
  [
    { kind: 'text', text: 'use ' },
    { kind: 'code', text: 'npm install' },
    { kind: 'text', text: ' first' },
  ])

eq('bold',
  parseInline('this is **important** really'),
  [
    { kind: 'text', text: 'this is ' },
    { kind: 'strong', text: 'important' },
    { kind: 'text', text: ' really' },
  ])

eq('italic',
  parseInline('this is *emphasized* really'),
  [
    { kind: 'text', text: 'this is ' },
    { kind: 'em', text: 'emphasized' },
    { kind: 'text', text: ' really' },
  ])

eq('link',
  parseInline('see [docs](https://example.com) for more'),
  [
    { kind: 'text', text: 'see ' },
    { kind: 'link', text: 'docs', href: 'https://example.com' },
    { kind: 'text', text: ' for more' },
  ])

eq('bold wins over italic when adjacent',
  parseInline('**strong** not *em*'),
  [
    { kind: 'strong', text: 'strong' },
    { kind: 'text', text: ' not ' },
    { kind: 'em', text: 'em' },
  ])

eq('inline code wins over bold (no nesting)',
  parseInline('`**not bold**`'),
  [
    { kind: 'code', text: '**not bold**' },
  ])

eq('multiple inline elements in sequence',
  parseInline('**a** and *b* and `c`'),
  [
    { kind: 'strong', text: 'a' },
    { kind: 'text', text: ' and ' },
    { kind: 'em', text: 'b' },
    { kind: 'text', text: ' and ' },
    { kind: 'code', text: 'c' },
  ])

// ─── parseMarkdown: blocks ──────────────────────────────────────────────────

console.log('')
console.log('='.repeat(60))
console.log('SUITE: parseMarkdown blocks')
console.log('='.repeat(60))

eq('empty input → empty array',
  parseMarkdown(''),
  [])

eq('null input → empty array',
  parseMarkdown(null),
  [])

eq('single heading',
  parseMarkdown('# Title'),
  [{ kind: 'heading', level: 1, inline: [{ kind: 'text', text: 'Title' }] }])

eq('heading levels',
  parseMarkdown('## Two\n\n### Three\n\n#### Four'),
  [
    { kind: 'heading', level: 2, inline: [{ kind: 'text', text: 'Two' }] },
    { kind: 'heading', level: 3, inline: [{ kind: 'text', text: 'Three' }] },
    { kind: 'heading', level: 4, inline: [{ kind: 'text', text: 'Four' }] },
  ])

eq('paragraph',
  parseMarkdown('hello world'),
  [{ kind: 'p', inline: [{ kind: 'text', text: 'hello world' }] }])

eq('paragraph with inline bold',
  parseMarkdown('this is **bold** text'),
  [{
    kind: 'p',
    inline: [
      { kind: 'text', text: 'this is ' },
      { kind: 'strong', text: 'bold' },
      { kind: 'text', text: ' text' },
    ],
  }])

eq('horizontal rule',
  parseMarkdown('---'),
  [{ kind: 'hr' }])

eq('horizontal rule with longer dashes',
  parseMarkdown('-----'),
  [{ kind: 'hr' }])

eq('horizontal rule surrounded by paragraphs',
  parseMarkdown('one\n\n---\n\ntwo'),
  [
    { kind: 'p', inline: [{ kind: 'text', text: 'one' }] },
    { kind: 'hr' },
    { kind: 'p', inline: [{ kind: 'text', text: 'two' }] },
  ])

eq('code fence with language',
  parseMarkdown('```mermaid\ngraph TD\n  A -→ B\n```'),
  [{
    kind: 'code',
    lang: 'mermaid',
    text: 'graph TD\n  A -→ B',
  }])

eq('code fence without language',
  parseMarkdown('```\nplain text\n```'),
  [{ kind: 'code', lang: '', text: 'plain text' }])

eq('code fence with empty body',
  parseMarkdown('```\n```'),
  [{ kind: 'code', lang: '', text: '' }])

eq('unordered list',
  parseMarkdown('- one\n- two\n- three'),
  [{
    kind: 'ul',
    items: [
      [{ kind: 'text', text: 'one' }],
      [{ kind: 'text', text: 'two' }],
      [{ kind: 'text', text: 'three' }],
    ],
  }])

eq('ordered list',
  parseMarkdown('1. first\n2. second\n3. third'),
  [{
    kind: 'ol',
    items: [
      [{ kind: 'text', text: 'first' }],
      [{ kind: 'text', text: 'second' }],
      [{ kind: 'text', text: 'third' }],
    ],
  }])

eq('blockquote single line',
  parseMarkdown('> a quote'),
  [{
    kind: 'blockquote',
    children: [{
      kind: 'p',
      inline: [{ kind: 'text', text: 'a quote' }],
    }],
  }])

eq('blockquote multiline',
  parseMarkdown('> first\n> second'),
  [{
    kind: 'blockquote',
    children: [{
      kind: 'p',
      inline: [{ kind: 'text', text: 'first second' }],
    }],
  }])

eq('table with header and one row',
  parseMarkdown('| A | B |\n|---|---|\n| 1 | 2 |'),
  [{
    kind: 'table',
    header: ['A', 'B'],
    rows: [['1', '2']],
  }])

eq('table with multiple rows',
  parseMarkdown('| H1 | H2 |\n|----|----|\n| a  | b  |\n| c  | d  |'),
  [{
    kind: 'table',
    header: ['H1', 'H2'],
    rows: [['a', 'b'], ['c', 'd']],
  }])

// ─── parseMarkdown: real-world report snippet ───────────────────────────────

console.log('')
console.log('='.repeat(60))
console.log('SUITE: parseMarkdown real-world shapes')
console.log('='.repeat(60))

const sampleReport = `# Title

> A description in blockquote.

## Section

- **Label:** Value
- **Count:** 3

\`\`\`mermaid
graph TD
  A -→ B
\`\`\`

| Column | Value |
|--------|-------|
| One    | Two   |
`

const parsed = parseMarkdown(sampleReport)
const kinds = parsed.map((b) => b.kind)
eq('real-world block kinds in order',
  kinds,
  ['heading', 'blockquote', 'heading', 'ul', 'code', 'table'])

pass('first heading is level 1', parsed[0].level === 1)
pass('first heading text is "Title"',
  parsed[0].inline[0].text === 'Title')

pass('blockquote contains one paragraph',
  parsed[1].kind === 'blockquote' && parsed[1].children[0].kind === 'p')

pass('ul has 2 items',
  parsed[3].kind === 'ul' && parsed[3].items.length === 2)

pass('ul item 1 starts with bold "Label:"',
  parsed[3].items[0][0].kind === 'strong' &&
  parsed[3].items[0][0].text === 'Label:')

pass('code block has lang mermaid',
  parsed[4].kind === 'code' && parsed[4].lang === 'mermaid')

pass('table header has 2 cols',
  parsed[5].kind === 'table' && parsed[5].header.length === 2)

// ─── Edge cases ────────────────────────────────────────────────────────────

console.log('')
console.log('='.repeat(60))
console.log('SUITE: edge cases')
console.log('='.repeat(60))

eq('heading with trailing whitespace',
  parseMarkdown('## Spaced  \n'),
  [{ kind: 'heading', level: 2, inline: [{ kind: 'text', text: 'Spaced' }] }])

eq('paragraph ending without blank line before hr',
  parseMarkdown('paragraph\n---'),
  [
    { kind: 'p', inline: [{ kind: 'text', text: 'paragraph' }] },
    { kind: 'hr' },
  ])

eq('list with inline formatting in item',
  parseMarkdown('- the **bold** thing'),
  [{
    kind: 'ul',
    items: [[
      { kind: 'text', text: 'the ' },
      { kind: 'strong', text: 'bold' },
      { kind: 'text', text: ' thing' },
    ]],
  }])

eq('multiple blank lines collapse to nothing',
  parseMarkdown('one\n\n\n\ntwo'),
  [
    { kind: 'p', inline: [{ kind: 'text', text: 'one' }] },
    { kind: 'p', inline: [{ kind: 'text', text: 'two' }] },
  ])

eq('heading with inline code',
  parseMarkdown('# Use `npm` to install'),
  [{
    kind: 'heading',
    level: 1,
    inline: [
      { kind: 'text', text: 'Use ' },
      { kind: 'code', text: 'npm' },
      { kind: 'text', text: ' to install' },
    ],
  }])

eq('paragraph with link',
  parseMarkdown('See [the docs](https://example.com) for details.'),
  [{
    kind: 'p',
    inline: [
      { kind: 'text', text: 'See ' },
      { kind: 'link', text: 'the docs', href: 'https://example.com' },
      { kind: 'text', text: ' for details.' },
    ],
  }])

// ─── Done ───────────────────────────────────────────────────────────────────

console.log('')
console.log('='.repeat(60))
console.log(`RESULTS: ${passCount} passed, ${failCount} failed`)
console.log('='.repeat(60))

if (failCount > 0) {
  console.log('\nFailures:')
  failures.forEach((f) => console.log(`  - ${f.label}`))
}

process.exit(failCount === 0 ? 0 : 1)