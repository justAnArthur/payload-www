import { describe, expect, it } from 'vitest'

import { createLlmsGlobal, LLMS_GLOBAL_DEFAULT_SLUG } from '../src/exports/globals'

const collectionField = (global: ReturnType<typeof createLlmsGlobal>) =>
  (global.fields.find(f => 'name' in f && f.name === 'collections') as { fields: { name: string; type: string }[] }).fields[0]

describe('createLlmsGlobal', () => {
  it('registers under the llms slug with every field optional', () => {
    const global = createLlmsGlobal()
    expect(global.slug).toBe(LLMS_GLOBAL_DEFAULT_SLUG)
    expect(global.fields.map(f => 'name' in f && f.name)).toEqual(['siteName', 'summary', 'details', 'showLocales', 'collections', 'exclude', 'extra'])
    expect(global.fields.some(f => 'required' in f && f.required)).toBe(false)
  })

  it('offers known collections as a select, otherwise a text field', () => {
    expect(collectionField(createLlmsGlobal()).type).toBe('text')
    expect(collectionField(createLlmsGlobal({ collections: ['pages', 'posts'], slug: 'ai' }))).toMatchObject({
      type: 'select', options: [{ value: 'pages' }, { value: 'posts' }]
    })
  })
})
