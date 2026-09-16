import { afterEach, describe, expect, it } from 'bun:test'

import { openAIResolver } from '../src/resolvers/openAI'

const logger = { info: () => {}, warn: () => {}, error: () => {} }
const req = { payload: { logger } } as any
const realFetch = globalThis.fetch

const inputOf = (body: string) => {
  const content = JSON.parse(body).messages[0].content as string
  return JSON.parse(content.slice(content.indexOf('INPUT:') + 6)) as Record<string, string>
}

const reply = (content: string, finish_reason = 'stop') =>
  new Response(JSON.stringify({ choices: [{ finish_reason, message: { content } }] }), { status: 200 })

afterEach(() => {
  globalThis.fetch = realFetch
})

describe('openAIResolver', () => {
  it('maps keyed output back in input order', async () => {
    globalThis.fetch = (async (_: string, init: RequestInit) => {
      const input = inputOf(init.body as string)
      return reply(JSON.stringify(Object.fromEntries(Object.entries(input).reverse().map(([k, v]) => [k, v.toUpperCase()]))))
    }) as typeof fetch

    const result = await openAIResolver({ apiKey: 'x' }).resolve({ localeFrom: 'en', localeTo: 'sk', req, texts: ['a', 'b', 'c'] })
    expect(result).toEqual({ success: true, translatedTexts: ['A', 'B', 'C'] })
  })

  it('fails instead of shifting values when a key is missing', async () => {
    globalThis.fetch = (async () => reply(JSON.stringify({ 0: 'A' }))) as unknown as typeof fetch

    const result = await openAIResolver({ apiKey: 'x' }).resolve({ localeFrom: 'en', localeTo: 'sk', req, texts: ['a', 'b'] })
    expect(result.success).toBe(false)
  }, 10000)

  it('splits a truncated chunk into smaller requests', async () => {
    const sizes: number[] = []
    globalThis.fetch = (async (_: string, init: RequestInit) => {
      const input = inputOf(init.body as string)
      sizes.push(Object.keys(input).length)
      if (Object.keys(input).length > 2) return reply('{"0":', 'length')
      return reply(JSON.stringify(input))
    }) as typeof fetch

    const result = await openAIResolver({ apiKey: 'x' }).resolve({ localeFrom: 'en', localeTo: 'sk', req, texts: ['a', 'b', 'c', 'd'] })
    expect(result).toEqual({ success: true, translatedTexts: ['a', 'b', 'c', 'd'] })
    expect(sizes).toEqual([4, 2, 2])
  })
})
