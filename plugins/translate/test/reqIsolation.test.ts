import { describe, expect, it } from 'bun:test'

import { findEntityWithConfig } from '../src/translate/findEntityWithConfig'
import { updateEntity } from '../src/translate/updateEntity'

const logger = { info: () => {}, warn: () => {}, error: () => {} }

const config = {
  collections: [{ slug: 'pages', fields: [{ name: 'title', type: 'text', localized: true }] }],
  globals: [{ slug: 'header', fields: [{ name: 'title', type: 'text', localized: true }] }]
}

/** a req as the jobs runner hands it to concurrent workflows: one shared object */
const sharedReq = (capture: { req?: any }) => ({
  locale: 'en',
  fallbackLocale: false,
  payload: {
    logger,
    config,
    findByID: async ({ req, locale }: any) => {
      // the real local api resolves the locale onto the req (createLocalReq)
      req.locale = locale
      capture.req = req
      return { id: 1, title: 'One' }
    },
    findGlobal: async ({ req, locale }: any) => {
      req.locale = locale
      capture.req = req
      return { title: 'One' }
    },
    update: async ({ req, locale }: any) => {
      req.locale = locale
      capture.req = req
      return { id: 1 }
    },
    updateGlobal: async ({ req, locale }: any) => {
      req.locale = locale
      capture.req = req
      return {}
    }
  }
}) as any

describe('locale isolation on local api calls', () => {
  it('findEntityWithConfig does not let its locale writes reach the shared req', async () => {
    const capture: { req?: any } = {}
    const req = sharedReq(capture)

    await findEntityWithConfig({ collectionSlug: 'pages', id: 1, locale: 'sk', req })

    // the local api writes req.locale = the requested locale; with isolation that
    // lands on the call's own copy, not on the req shared with concurrent jobs
    capture.req.locale = 'cs'
    expect(req.locale).toBe('en')

    // and everything else still passes through to the original
    expect(capture.req.payload).toBe(req.payload)
  })

  it('updateEntity keeps its own locale when the shared req mutates mid-flight', async () => {
    const capture: { req?: any } = {}
    const req = sharedReq(capture)

    await updateEntity({ collectionSlug: 'pages', data: { title: 'Jedna' }, id: 1, locale: 'sk', req })

    // a concurrent job's read flips the shared req's locale while this update runs
    req.locale = 'en'
    expect(capture.req.locale).toBe('sk')

    capture.req.locale = 'de'
    expect(req.locale).toBe('en')
  })

  it('updateEntity isolates globals the same way', async () => {
    const capture: { req?: any } = {}
    const req = sharedReq(capture)

    await updateEntity({ data: { title: 'Jedna' }, globalSlug: 'header', locale: 'sk', req })

    req.locale = 'en'
    expect(capture.req.locale).toBe('sk')
  })
})
