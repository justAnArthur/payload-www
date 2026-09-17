import { describe, expect, it } from 'bun:test'
import type { Field } from 'payload'

import { traverseFields } from '../src/translate/traverseFields'
import type { TranslatableField, ValueToTranslate } from '../src/translate/types'

const run = (fields: Field[], dataFrom: Record<string, unknown>, translatedData: Record<string, unknown>, emptyOnly = false, retranslateIdentical = false) => {
  const values: ValueToTranslate[] = []
  const seen: TranslatableField[] = []
  const syncedValues = { count: 0 }
  traverseFields({ dataFrom, emptyOnly, retranslateIdentical, fields, translatedData, valuesToTranslate: values, syncedValues, onField: (f) => seen.push(f) })
  return { values, seen, syncedValues }
}

const lexical = (...texts: string[]) => ({
  root: { type: 'root', children: [{ type: 'paragraph', children: texts.map((text) => ({ type: 'text', text })) }] }
})

describe('traverseFields', () => {
  it('keeps walking after an empty named tab', () => {
    const fields = [
      { type: 'tabs', tabs: [
        { name: 'empty', fields: [{ name: 'a', type: 'text', localized: true }] },
        { name: 'filled', fields: [{ name: 'b', type: 'text', localized: true }] }
      ] },
      { name: 'after', type: 'text', localized: true }
    ] as Field[]

    const { values } = run(fields, { filled: { b: 'Hello' }, after: 'World' }, {})
    expect(values.map((v) => v.path)).toEqual(['filled.b', 'after'])
  })

  it('translates fields inside unnamed groups', () => {
    const fields = [{ type: 'group', fields: [{ name: 'title', type: 'text', localized: true }] }] as unknown as Field[]
    expect(run(fields, { title: 'Hi there' }, {}).values.map((v) => v.path)).toEqual(['title'])
  })

  it('does not mutate the source rich text', () => {
    const fields = [{ name: 'content', type: 'richText', localized: true }] as Field[]
    const source = { content: lexical('Hello ', 'world') }
    const target: Record<string, unknown> = {}

    const { values } = run(fields, source, target)
    values.forEach((v) => v.onTranslate(`T(${v.value})`))

    expect(JSON.stringify(source.content)).toContain('"Hello "')
    expect(JSON.stringify(target.content)).toContain('T(Hello )')
  })

  it('treats an empty lexical root as missing in missing-only mode', () => {
    const fields = [{ name: 'content', type: 'richText', localized: true }] as Field[]
    const { values } = run(fields, { content: lexical('Hello') }, { content: { root: { type: 'root', children: [] } } }, true)
    expect(values).toHaveLength(1)
  })

  it('reuses localized row ids and fills only missing fields', () => {
    const fields = [{
      name: 'items', type: 'array', localized: true,
      fields: [{ name: 'q', type: 'text' }, { name: 'a', type: 'text' }]
    }] as Field[]
    const target = { items: [{ id: 'keep', q: 'Otázka', a: '' }] }

    const { values } = run(fields, { items: [{ id: 'src', q: 'Question', a: 'Answer' }] }, target, true)

    expect(values.map((v) => v.path)).toEqual(['items[0].a'])
    expect((target.items as any)[0].id).toBe('keep')
  })

  it('keeps blockName when rebuilding localized blocks', () => {
    const fields = [{
      name: 'layout', type: 'blocks', localized: true,
      blocks: [{ slug: 'cta', fields: [{ name: 'title', type: 'text' }] }]
    }] as unknown as Field[]
    const target: Record<string, unknown> = {}

    run(fields, { layout: [{ id: 'x', blockType: 'cta', blockName: 'Hero CTA', title: 'Go' }] }, target)
    expect((target.layout as any)[0]).toMatchObject({ blockType: 'cta', blockName: 'Hero CTA' })
  })

  it('never re-translates an existing slug and translates slug segments as words', () => {
    const fields = [{ name: 'slug', type: 'text', localized: true }] as Field[]

    expect(run(fields, { slug: 'about-us' }, { slug: 'o-nas' }).values).toHaveLength(0)

    const target: Record<string, unknown> = {}
    const { values } = run(fields, { slug: 'about-us_team' }, target)
    expect(values.map((v) => v.value)).toEqual(['about us', 'team'])
    values[0].onTranslate('O nás')
    values[1].onTranslate('Tím')
    expect(target.slug).toBe('o-nas_tim')
  })

  it('copies urls and emails instead of sending them to the resolver', () => {
    const fields = [{ name: 'url', type: 'text', localized: true }] as Field[]
    const target: Record<string, unknown> = {}
    expect(run(fields, { url: 'https://cal.com/x' }, target).values).toHaveLength(0)
    expect(target.url).toBe('https://cal.com/x')
  })

  it('fills only missing json keys and keeps extra target keys', () => {
    const fields = [{ name: 'messages', type: 'json', localized: true }] as Field[]
    const target: Record<string, unknown> = { messages: { a: { title: 'Titulok' }, local: 'only-sk' } }

    const { values, seen } = run(fields, { messages: { a: { title: 'Title', body: 'Body {name}' } } }, target, true)

    expect(values.map((v) => v.path)).toEqual(['messages.a.body'])
    expect(seen.map((f) => f.path)).toEqual(['messages.a.title', 'messages.a.body'])
    values[0].onTranslate('Telo {name}')
    expect(target.messages).toEqual({ a: { title: 'Titulok', body: 'Telo {name}' }, local: 'only-sk' })
  })

  it('reports block nodes inside rich text to the host hook', () => {
    const fields = [{ name: 'content', type: 'richText', localized: true }] as Field[]
    const source = {
      content: { root: { type: 'root', children: [
        { type: 'paragraph', children: [{ type: 'text', text: 'Intro' }] },
        { type: 'block', fields: { blockType: 'quote', quote: 'Great tool' } }
      ] } }
    }
    const values: ValueToTranslate[] = []

    traverseFields({
      dataFrom: source, fields, translatedData: {}, valuesToTranslate: values, syncedValues: { count: 0 },
      _options: { additionalTraverseRichText: ({ onText, siblingData }) => {
        if ((siblingData as any)?.type === 'block') onText((siblingData as any).fields, 'quote')
      } }
    })

    expect(values.map((v) => v.value)).toEqual(['Intro', 'Great tool'])
  })

  it('replaces fields that still hold the source copy in untranslated mode only', () => {
    const fields = [
      { name: 'title', type: 'text', localized: true },
      { name: 'brand', type: 'text', localized: true },
      { name: 'lead', type: 'text', localized: true },
      { name: 'content', type: 'richText', localized: true }
    ] as Field[]
    const source = { title: 'Book a demo', brand: 'Camasys', lead: 'Pick a time', content: lexical('We walk through your fleet') }
    const target = { title: 'Book a demo', brand: 'Camasys', lead: 'Vyberte si čas', content: lexical('We walk through your fleet') }

    expect(run(fields, source, structuredClone(target), true).values).toHaveLength(0)
    expect(run(fields, source, structuredClone(target), true, true).values.map((v) => v.path)).toEqual(['title', 'content#0'])
  })

  it('replaces wrong-language targets in untranslated mode', () => {
    const fields = [{ name: 'lead', type: 'text', localized: true }, { name: 'title', type: 'text', localized: true }] as Field[]
    const values: ValueToTranslate[] = []

    traverseFields({
      dataFrom: { lead: 'Our software helps rentals', title: 'Pricing plans' },
      translatedData: { lead: 'Náš software pomáhá půjčovnám', title: 'Cenové plány' },
      emptyOnly: true,
      retranslateIdentical: true,
      isWrongLanguage: (target) => String(target).startsWith('Náš software'),
      fields,
      valuesToTranslate: values,
      syncedValues: { count: 0 }
    })

    expect(values.map((v) => v.path)).toEqual(['lead'])
  })

  it('counts a changed relationship copy as a synced value', () => {
    const fields = [{ name: 'reference', type: 'relationship', localized: true, relationTo: ['pages'] }] as unknown as Field[]
    const target = { reference: { relationTo: 'pages', value: 8 } }

    const { values, syncedValues } = run(fields, { reference: { relationTo: 'pages', value: 2 } }, target)

    expect(values).toHaveLength(0)
    expect(syncedValues.count).toBe(1)
    expect(target.reference).toEqual({ relationTo: 'pages', value: 2 })
  })

  it('does not count relationship copies that already match', () => {
    const fields = [{ name: 'reference', type: 'relationship', localized: true, relationTo: ['pages'] }] as unknown as Field[]

    const { syncedValues } = run(fields, { reference: { relationTo: 'pages', value: 8 } }, { reference: { relationTo: 'pages', value: 8 } })

    expect(syncedValues.count).toBe(0)
  })

  it('counts localized rows added or dropped in the source', () => {
    const fields = [{
      name: 'links', type: 'array', localized: true,
      fields: [{ name: 'label', type: 'text', localized: true }]
    }] as Field[]

    const dropped = run(fields, { links: [{ label: 'A' }] }, { links: [{ label: 'A' }, { label: 'B' }] }, true)
    const added = run(fields, { links: [{ label: 'A' }, { label: 'B' }] }, { links: [{ label: 'A' }] }, true)

    expect(dropped.syncedValues.count).toBe(1)
    expect(added.syncedValues.count).toBe(1)
  })
})

  it('carries an empty richText into rebuilt block rows so required fields stay valid', () => {
    const fields = [{
      name: 'layout', type: 'blocks', localized: true,
      blocks: [{ slug: 'richText', fields: [{ name: 'richText', type: 'richText' }] }]
    }] as unknown as Field[]
    const emptyLexical = { root: { type: 'root', children: [{ type: 'paragraph', children: [] }] } }
    const target: Record<string, unknown> = {}

    run(fields, { layout: [{ blockType: 'richText', richText: emptyLexical }] }, target)

    expect((target.layout as any)[0].richText).toEqual(emptyLexical)
  })

  it('carries a top-level empty richText when the target locale has no value', () => {
    const fields = [{ name: 'content', type: 'richText', localized: true }] as Field[]
    const emptyLexical = { root: { type: 'root', children: [] } }
    const target: Record<string, unknown> = {}

    run(fields, { content: emptyLexical }, target)

    expect(target.content).toEqual(emptyLexical)
  })
