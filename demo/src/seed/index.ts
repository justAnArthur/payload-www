import 'dotenv/config'

import { getPayload } from 'payload'
import config from '@payload-config'

const text = (en: string, uk: string) => ({ en, uk })

function cryptoId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const contentBlock = (textValue: string) => ({
  id: cryptoId(),
  blockType: 'content' as const,
  columns: [{ text: textValue }]
})

// ponytail: Payload's typegen emits non-localized `string` for `localized: true` fields.
// The runtime accepts the locale map; cast through `unknown` to satisfy the TS surface.
type Localized = { en: string; uk: string }
const asLocalized = (v: Localized): unknown => v

async function ensureCategory(payload: Awaited<ReturnType<typeof getPayload>>, slug: string, title: Localized) {
  const existing = await payload.find({
    collection: 'categories',
    where: { slug: { equals: slug } },
    limit: 1,
    overrideAccess: true
  })
  if (existing.docs[0]) return existing.docs[0]

  return payload.create({
    collection: 'categories',
    data: { slug, title: asLocalized(title) as string },
    overrideAccess: true
  })
}

async function ensurePage(
  payload: Awaited<ReturnType<typeof getPayload>>,
  data: { slug: string; title: Localized; blocks: ReturnType<typeof contentBlock>[] }
) {
  const existing = await payload.find({
    collection: 'pages',
    where: { slug: { equals: data.slug } },
    limit: 1,
    overrideAccess: true,
    draft: true
  })
  if (existing.docs[0]) return existing.docs[0]

  return payload.create({
    collection: 'pages',
    data: {
      ...data,
      title: asLocalized(data.title) as string,
      _status: 'published',
      publishedAt: new Date().toISOString()
    },
    overrideAccess: true
  })
}

async function ensurePost(
  payload: Awaited<ReturnType<typeof getPayload>>,
  data: {
    slug: string
    title: Localized
    excerpt: Localized
    categories?: number[]
  }
) {
  const existing = await payload.find({
    collection: 'posts',
    where: { slug: { equals: data.slug } },
    limit: 1,
    overrideAccess: true,
    draft: true
  })
  if (existing.docs[0]) return existing.docs[0]

  return payload.create({
    collection: 'posts',
    // ponytail: see comment on `asLocalized` above — Posts `title`/`excerpt` are localized at runtime.
    data: {
      ...data,
      title: asLocalized(data.title) as string,
      excerpt: asLocalized(data.excerpt) as string,
      _status: 'published',
      publishedAt: new Date().toISOString()
    } as never,
    overrideAccess: true
  })
}

async function ensureUser(payload: Awaited<ReturnType<typeof getPayload>>) {
  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: 'demo@example.com' } },
    limit: 1,
    overrideAccess: true
  })
  if (existing.docs[0]) return existing.docs[0]

  return payload.create({
    collection: 'users',
    data: {
      email: 'demo@example.com',
      password: 'demopassword123',
      name: 'Demo User'
    },
    overrideAccess: true
  })
}

async function ensureHeader(payload: Awaited<ReturnType<typeof getPayload>>) {
  const existing = await payload.findGlobal({
    slug: 'header',
    depth: 0,
    overrideAccess: true
  })
  if (existing && Array.isArray((existing as { nav?: unknown }).nav) && (existing as { nav: unknown[] }).nav.length > 0) return existing

  return payload.updateGlobal({
    slug: 'header',
    data: {
      nav: [
        {
          id: cryptoId(),
          blockType: 'navItem',
          link: {
            type: 'custom',
            url: '/',
            label: asLocalized(text('Home', 'Головна')) as string,
            newTab: false
          }
        },
        {
          id: cryptoId(),
          blockType: 'navItem',
          link: {
            type: 'custom',
            url: '/about',
            label: asLocalized(text('About', 'Про нас')) as string,
            newTab: false
          }
        },
        {
          id: cryptoId(),
          blockType: 'navItem',
          link: {
            type: 'custom',
            url: '/posts',
            label: asLocalized(text('Posts', 'Пости')) as string,
            newTab: false
          }
        }
      ]
    },
    overrideAccess: true
  })
}

async function ensureFooter(payload: Awaited<ReturnType<typeof getPayload>>) {
  const existing = await payload.findGlobal({
    slug: 'footer',
    depth: 0,
    overrideAccess: true
  })
  if (existing && Array.isArray((existing as { nav?: unknown }).nav) && (existing as { nav: unknown[] }).nav.length > 0) return existing

  return payload.updateGlobal({
    slug: 'footer',
    data: {
      nav: [
        {
          id: cryptoId(),
          blockType: 'navItem',
          link: {
            type: 'custom',
            url: '/',
            label: asLocalized(text('Home', 'Головна')) as string,
            newTab: false
          }
        }
      ]
    },
    overrideAccess: true
  })
}

async function main() {
  const payload = await getPayload({ config })

  await ensureUser(payload)
  payload.logger.info('✓ ensured demo user (demo@example.com / demopassword123)')

  const announcements = await ensureCategory(payload, 'announcements', text('Announcements', 'Оголошення'))
  const tutorials = await ensureCategory(payload, 'tutorials', text('Tutorials', 'Туторіали'))
  payload.logger.info('✓ ensured categories')

  await ensurePage(payload, {
    slug: '',
    title: text('payload-www demo', 'payload-www демо'),
    blocks: [
      contentBlock(
        'This is the home page of the payload-www demo. It is rendered by the lib via createCollectionPageExports against the Pages collection. Edit any page in /admin to see live preview, SEO meta, translator, and image hash in action.'
      ),
      contentBlock(
        'The lib is shipped as a workspace package; the demo in /demo is the canonical showcase. The Payload config in src/payload.config.ts uses the same createWWWConfig shape as the production camasys integration.'
      )
    ]
  })
  payload.logger.info('✓ ensured home page')

  await ensurePage(payload, {
    slug: 'about',
    title: text('About', 'Про нас'),
    blocks: [
      contentBlock(
        'The @justanarthur/payload-www lib wires a Pages collection, Posts collection, Header / Footer globals, a Page render factory with metadata + JSON-LD + hreflang + live preview, and three default plugins (seo, image-hash, translator) via a single createWWWConfig call.'
      )
    ]
  })
  payload.logger.info('✓ ensured about page')

  await ensurePost(payload, {
    slug: 'hello-world',
    title: text('Hello world', 'Привіт світ'),
    excerpt: text(
      'A first post to demo the translator plugin and the Posts renderer.',
      'Перший пост для демонстрації плагіна перекладача та Posts-рендерера.'
    ),
    categories: [announcements.id, tutorials.id]
  })
  payload.logger.info('✓ ensured hello-world post')

  await ensurePost(payload, {
    slug: 'second-post',
    title: text('Second post', 'Другий пост'),
    excerpt: text(
      'A second post so the home + category pages are non-trivial.',
      'Другий пост, щоб головна і сторінки категорій були не порожніми.'
    ),
    categories: [tutorials.id]
  })
  payload.logger.info('✓ ensured second-post post')

  await ensureHeader(payload)
  payload.logger.info('✓ ensured header global')
  await ensureFooter(payload)
  payload.logger.info('✓ ensured footer global')

  payload.logger.info('✓ seed complete')
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})