import { describe, expect, test } from 'bun:test'
import type { Config } from 'payload'

import { createOpenInaryAdapter, createOpenInaryClient, encodePath, openinaryStorage } from '../src/index'

const URL_ = 'https://media.test'
const KEY = 'test-key'

/** In-memory Openinary: POST /upload (renames clashes like the real server), DELETE /storage/*, GET /download/*. */
function fakeOpeninary() {
  const files = new Map<string, { bytes: Uint8Array; type: string }>()
  const calls: string[] = []
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input))
    const method = init?.method ?? 'GET'
    calls.push(`${method} ${url.pathname}`)
    if (new Headers(init?.headers).get('authorization') !== `Bearer ${KEY}`) return new Response('unauthorized', { status: 401 })

    if (method === 'POST' && url.pathname === '/upload') {
      const form = init!.body as FormData
      const folder = (form.get('folder') as string | null) ?? ''
      const file = form.get('files') as File
      const name = (form.get('names') as string | null) ?? file.name
      let key = `${folder ? `${folder}/` : ''}${name}`
      for (let i = 1; files.has(key); i++) key = `${folder ? `${folder}/` : ''}${name.replace(/(\.[^.]+)$/, ` (${i})$1`)}`
      files.set(key, { bytes: new Uint8Array(await file.arrayBuffer()), type: file.type })
      return Response.json({ success: true, files: [{ filename: name, path: key, size: file.size, url: `/t/${key}` }] })
    }
    const key = decodeURIComponent(url.pathname.replace(/^\/(storage|download)\//, ''))
    if (method === 'DELETE' && url.pathname.startsWith('/storage/')) {
      if (!files.delete(key)) return Response.json({ error: 'Not found' }, { status: 404 })
      return Response.json({ success: true })
    }
    if (method === 'GET' && url.pathname.startsWith('/download/')) {
      const file = files.get(key)
      if (!file) return new Response('File not found', { status: 404 })
      return new Response(file.bytes, { headers: { 'content-type': 'application/octet-stream', 'content-disposition': 'attachment', 'content-length': String(file.bytes.length) } })
    }
    return new Response('not found', { status: 404 })
  }) as typeof fetch
  return { files, calls, fetch: fetchImpl }
}

const req = { headers: new Headers(), payload: { find: async () => ({ docs: [] }), logger: { error: () => undefined } } } as any
const collection = { slug: 'media', upload: {} } as any
const file = (name: string, text = 'hello') => ({ buffer: Buffer.from(text), filename: name, filesize: text.length, mimeType: 'image/png' })

describe('encodePath', () => {
  test('encodes each segment and keeps slashes', () => {
    expect(encodePath('/a b/c#d.png')).toBe('a%20b/c%23d.png')
  })
})

describe('client', () => {
  test('upload replaces an existing file instead of letting Openinary rename it', async () => {
    const fake = fakeOpeninary()
    const client = createOpenInaryClient({ url: URL_, apiKey: KEY, fetch: fake.fetch })
    await client.upload('site/media/a.png', Buffer.from('one'), 'image/png')
    await client.upload('site/media/a.png', Buffer.from('two'), 'image/png')
    expect([...fake.files.keys()]).toEqual(['site/media/a.png'])
    expect(new TextDecoder().decode(fake.files.get('site/media/a.png')!.bytes)).toBe('two')
  })

  test('a renamed upload is cleaned up and reported', async () => {
    const fake = fakeOpeninary()
    // a server that refuses deletes, so the clash survives and the server renames
    const stubborn = (async (input: RequestInfo | URL, init?: RequestInit) =>
      init?.method === 'DELETE' ? new Response('nope', { status: 404 }) : fake.fetch(input, init)) as typeof fetch
    fake.files.set('a.png', { bytes: new Uint8Array(), type: 'image/png' })
    const client = createOpenInaryClient({ url: URL_, apiKey: KEY, fetch: stubborn })
    await expect(client.upload('a.png', Buffer.from('x'), 'image/png')).rejects.toThrow('stored a.png as a (1).png')
  })

  test('remove treats a missing file as done', async () => {
    const fake = fakeOpeninary()
    const client = createOpenInaryClient({ url: URL_, apiKey: KEY, fetch: fake.fetch })
    expect(await client.remove('nope.png')).toBe('missing')
  })

  test('failed uploads throw with the server reason', async () => {
    const failing = (async () => Response.json({ success: false, errors: [{ filename: 'a.exe', error: 'Invalid file type' }] }, { status: 400 })) as unknown as typeof fetch
    const client = createOpenInaryClient({ url: URL_, apiKey: KEY, fetch: failing })
    await expect(client.upload('a.exe', Buffer.from('x'), 'application/x-msdownload')).rejects.toThrow('Invalid file type')
  })
})

describe('adapter', () => {
  const setup = () => {
    const fake = fakeOpeninary()
    const adapter = createOpenInaryAdapter({
      client: createOpenInaryClient({ url: URL_, apiKey: KEY, fetch: fake.fetch }),
      folder: 'uteg-www',
      publicUrl: 'https://cdn.test/',
    })({ collection, prefix: 'media' })
    return { fake, adapter }
  }

  test('uploads under folder + storage path, serves the original inline, deletes', async () => {
    const { fake, adapter } = setup()
    await adapter.handleUpload({ clientUploadContext: undefined, collection, data: {}, file: file('logo.png', 'PNG'), req, storageFilePath: 'media/logo.png' })
    expect(fake.files.has('uteg-www/media/logo.png')).toBe(true)

    const res = await adapter.staticHandler(req, { doc: { id: 1, mimeType: 'image/png' } as any, params: { collection: 'media', filename: 'logo.png' } })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/png')
    expect(res.headers.get('content-disposition')).toBeNull()
    expect(await res.text()).toBe('PNG')

    await adapter.handleDelete({ collection, doc: { id: 1 } as any, filename: 'logo.png', req, storageFilePath: 'media/logo.png' })
    expect(fake.files.size).toBe(0)
  })

  test('staticHandler answers 404 for a missing file', async () => {
    const { adapter } = setup()
    const res = await adapter.staticHandler(req, { params: { collection: 'media', filename: 'gone.png' } })
    expect(res.status).toBe(404)
  })

  test('generateURL points at the public transform route', async () => {
    const { adapter } = setup()
    expect(await adapter.generateURL!({ collection, data: {}, filename: 'a b.png', prefix: '' })).toBe('https://cdn.test/t/uteg-www/media/a%20b.png')
  })
})

describe('plugin', () => {
  const base = { collections: [{ slug: 'media', upload: true, fields: [] }, { slug: 'pages', fields: [] }] } as unknown as Config

  test('disables local storage on the configured collections only', () => {
    const config = openinaryStorage({ collections: { media: true }, url: URL_, apiKey: KEY })(base) as Config
    const media = config.collections!.find((c) => c.slug === 'media')!
    expect((media.upload as { disableLocalStorage?: boolean }).disableLocalStorage).toBe(true)
    expect(config.collections!.find((c) => c.slug === 'pages')!.upload).toBeUndefined()
  })

  test('throws without url or key, unless disabled', () => {
    const env = { ...process.env }
    delete process.env.OPENINARY_URL
    delete process.env.OPENINARY_API_KEY
    expect(() => openinaryStorage({ collections: { media: true } })(base)).toThrow('OPENINARY_URL')
    expect(openinaryStorage({ collections: { media: true }, enabled: false })(base)).toBe(base)
    Object.assign(process.env, env)
  })
})
