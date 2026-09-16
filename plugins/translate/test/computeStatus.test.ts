import { describe, expect, it } from 'bun:test'

import { computeStatus } from '../src/review/computeStatus'

describe('computeStatus', () => {
  it('classifies missing, identical, placeholder and ok fields', () => {
    const { fields, summary } = computeStatus([
      { path: 'title', type: 'text', source: 'Fleet management made simple', target: 'Správa flotily jednoducho' },
      { path: 'subtitle', type: 'text', source: 'Book a demo today', target: 'Book a demo today' },
      { path: 'brand', type: 'text', source: 'Camasys', target: 'Camasys' },
      { path: 'slug', type: 'slug', source: 'about', target: null },
      { path: 'messages.mail', type: 'json', source: 'Email {address}', target: 'Napíšte nám' },
      { path: 'content', type: 'richText', source: { root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Hi' }] }] } }, target: { root: { type: 'root', children: [] } } },
      { path: 'empty', type: 'text', source: '', target: '' }
    ])

    expect(fields.map((f) => [f.path, f.state])).toEqual([
      ['title', 'ok'],
      ['subtitle', 'identical'],
      ['brand', 'ok'],
      ['slug', 'missing'],
      ['messages.mail', 'placeholders'],
      ['content', 'missing']
    ])
    expect(summary).toMatchObject({ total: 6, ok: 2, missing: 2, identical: 1, placeholders: 1, coverage: 33, slugMissing: true })
  })
})
