import { describe, expect, it } from 'vitest'

import { populatePublishedAt } from '../src/collections/hooks/populatePublishedAt'

describe('populatePublishedAt', () => {
  const call = (
    args: { data: Record<string, unknown>; operation: 'create' | 'update'; reqData?: unknown }
  ) =>
    populatePublishedAt({
      data: args.data as never,
      operation: args.operation,
      req: { data: args.reqData } as never
    } as never)

  it('stamps publishedAt on create when not set', () => {
    const result = call({
      data: { title: 'X' },
      operation: 'create',
      reqData: { title: 'X' }
    })
    expect(result).toMatchObject({ title: 'X' })
    expect((result as { publishedAt: Date }).publishedAt).toBeInstanceOf(Date)
  })

  it('stamps publishedAt on update when not set', () => {
    const result = call({
      data: { title: 'X' },
      operation: 'update',
      reqData: { title: 'X' }
    })
    expect((result as { publishedAt: Date }).publishedAt).toBeInstanceOf(Date)
  })

  it('does not overwrite an existing publishedAt when data already carries it', () => {
    const existing = new Date('2024-01-01T00:00:00.000Z')
    const result = call({
      data: { title: 'X', publishedAt: existing },
      operation: 'create',
      reqData: { publishedAt: existing }
    })
    expect((result as { publishedAt: Date }).publishedAt).toBe(existing)
  })

  it('returns data unchanged when req.data is missing', () => {
    const data = { title: 'X' }
    const result = call({
      data,
      operation: 'create',
      reqData: undefined
    })
    expect(result).toBe(data)
  })
})
