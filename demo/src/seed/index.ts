// Demo seed. Idempotent — safe to re-run on a populated DB.
// Run with: `bun run seed` (from the demo workspace).
//
// Creates a home Pages doc (slug `''`), a few showcase pages in
// both locales, and a couple of posts. The lib's `createBaseSeed`
// is used to wire the payload + validation; this file owns the
// content (so it's a showcase fixture, not a generic seed).

import 'dotenv/config'

import { getPayload } from 'payload'
import config from '@payload-config'

import { createBaseSeed } from '@justanarthur/payload-www/seed'

const seedContentBlock = (text: string) => ({
  content: { columns: [{ text }] },
  blockName: null,
  id: cryptoId(),
  blockType: 'content' as const
})

const homeBlock = (text: string, heading?: string) => ({
  content: { columns: [{ text }] },
  blockName: null,
  id: cryptoId(),
  blockType: 'content' as const
})

// crypto.randomUUID is only on Node 19+. Fall back to a tiny
// collision-resistant id when unavailable.
function cryptoId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const text = (en: string, uk: string) => ({ en, uk })

async function main() {
  const payload = await getPayload({ config })

  // Ensure the home doc has a `home` page in the Pages collection
  // with slug `''`. The lib's Pages factory allows it (the slug
  // field doesn't enforce `localized`).
  const home = await payload.find({
    collection: 'pages',
    where: { slug: { equals: '' } },
    limit: 1,
    overrideAccess: true,
    draft: true
  })

  if (home.docs.length === 0) {
    await payload.create({
      collection: 'pages',
      data: {
        slug: '',
        // Cast: the schema declares `title` as `localized: true`
        // (so the runtime accepts the `{ en, uk }` object), but
        // `generate:types` emits a flat `string` for fields built
        // via the lib's factory. The runtime behavior is correct.
        title: { en: 'payload-www demo', uk: 'payload-www демо' } as unknown as string,
        _status: 'published',
        publishedAt: new Date().toISOString(),
        blocks: [
          homeBlock(
            'This is the home page of the payload-www demo. It is rendered by the lib via createCollectionPageExports with the showcase option enabled — see the sidebar for the page’s metadata, JSON-LD, and language switcher. The list of recent pages + posts below is injected via the `homeExtras` callback.'
          ),
          homeBlock(
            'Edit any page or post in /admin to see live preview, SEO meta, translator, and image hash in action.'
          )
        ]
      },
      overrideAccess: true
    })
    payload.logger.info('✓ created home page (slug `""`)')
  } else {
    payload.logger.info('= home page already exists, skipping')
  }

  await createBaseSeed(payload, {
    defaultLocale: 'en',
    locales: ['en', 'uk'],
    users: [
      { email: 'demo@example.com', password: 'demopassword123', name: 'Demo User' }
    ],
    pages: [
      {
        slug: 'about',
        title: text('About', 'Про нас'),
        blocks: [
          {
            blockType: 'content',
            columns: [
              {
                text: 'The payload-www lib wires a Pages collection, Header / Footer globals, a Page render factory with metadata + JSON-LD + live preview, and three default plugins (seo, image-hash, translator) via a single createWWWConfig call.'
              }
            ]
          }
        ]
      },
      {
        slug: 'docs',
        title: text('Docs', 'Документація'),
        blocks: [
          {
            blockType: 'content',
            columns: [
              {
                text: 'Read the README at packages/payload-www/README.md for the full API. The lib is shipped as a workspace package; the demo in /demo is the canonical showcase.'
              }
            ]
          }
        ]
      }
    ],
    posts: [
      {
        slug: 'hello-world',
        title: text('Hello world', 'Привіт світ'),
        excerpt: text(
          'A first post to demo the translator plugin.',
          'Перший пост для демонстрації плагіна перекладача.'
        )
      },
      {
        slug: 'second-post',
        title: text('Second post', 'Другий пост'),
        excerpt: text(
          'A second post so the home page list is non-trivial.',
          'Другий пост, щоб список на головній був не порожнім.'
        )
      }
    ]
  })

  payload.logger.info('✓ seed complete')
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
