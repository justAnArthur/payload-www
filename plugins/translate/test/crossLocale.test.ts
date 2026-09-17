import { describe, expect, it } from 'bun:test'

import { buildCrossLocaleTexts, crossLocaleMatch } from '../src/utils/crossLocale'
import type { TranslatableField } from '../src/translate/types'

const fields = (target: unknown): TranslatableField[] => [
  { path: 'title', type: 'text', source: 'About us', target }
]

describe('crossLocale', () => {
  it('flags a value duplicated from a non-close-pair locale', () => {
    const texts = buildCrossLocaleTexts([
      { locale: 'sk', fields: fields('Sobre nós') },
      { locale: 'pt', fields: fields('Sobre nós') }
    ])

    expect(crossLocaleMatch(texts, 'title', 'sk', 'Sobre nós')).toBe('pt')
    expect(crossLocaleMatch(texts, 'title', 'pt', 'Sobre nós')).toBe('sk')
    expect(crossLocaleMatch(texts, 'title', 'sk', 'O nás')).toBeUndefined()
  })

  it('does not flag duplicates within a close pair', () => {
    const texts = buildCrossLocaleTexts([
      { locale: 'cs', fields: fields('O nás') },
      { locale: 'sk', fields: fields('O nás') }
    ])

    expect(crossLocaleMatch(texts, 'title', 'sk', 'O nás')).toBeUndefined()
  })

  it('leaves out values equal to the source — untranslatables shared by every locale', () => {
    const shared = (target: unknown): TranslatableField[] => [
      { path: 'brand', type: 'text', source: target as string, target }
    ]
    const texts = buildCrossLocaleTexts([
      { locale: 'sk', fields: shared('EUROPA') },
      { locale: 'nl', fields: shared('EUROPA') }
    ])

    expect(texts.size).toBe(0)
    expect(crossLocaleMatch(texts, 'brand', 'sk', 'EUROPA')).toBeUndefined()
  })
})
