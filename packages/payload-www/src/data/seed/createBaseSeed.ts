import type { Payload } from 'payload'

export type SeedPageInput = {
  slug: string
  title: Record<string, string>
  meta?: Record<string, { title?: string; description?: string }>
  blocks?: Array<Record<string, unknown>>
  status?: 'draft' | 'published'
  publishedAt?: string
}

export type SeedPostInput = {
  slug: string
  title: Record<string, string>
  excerpt?: Record<string, string>
  content?: Record<string, unknown>
  status?: 'draft' | 'published'
  publishedAt?: string
}

export type SeedUserInput = {
  email: string
  password?: string
  name?: string
}

export type SeedCategoryInput = {
  title: string
  slug?: string
}

export type CreateBaseSeedOptions = {
  defaultLocale?: string
  locales?: string[]
  users?: SeedUserInput[]
  categories?: SeedCategoryInput[]
  pages?: SeedPageInput[]
  posts?: SeedPostInput[]
  dryRun?: boolean
}

export type CreateBaseSeedResult = {
  users: Array<{ id: string | number; email: string }>
  categories: Array<{ id: string | number; title: string; slug: string }>
  pages: Array<{ id: string | number; slug: string; locale: string }>
  posts: Array<{ id: string | number; slug: string; locale: string }>
}

const simpleRichText = (text: string) => ({
  root: {
    type: 'root',
    format: '' as const,
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    children: [
      {
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        textFormat: 0,
        children: [
          { mode: 'normal', text, type: 'text', style: '', detail: 0, format: 0, version: 1 }
        ]
      }
    ]
  }
})

/**
 * Idempotent seeder for the lib's collections. Re-running on the
 * same database is a no-op for users (matched by email) and
 * categories (matched by title); pages and posts are matched by
 * slug and re-created if missing.
 *
 * Pages and posts are created once per slug — localized values are
 * stored in a single doc per slug. Tests assert the alternate
 * resolution by querying `locale: 'all'`.
 *
 * Throws on:
 *   - any block slug in a Page's `layout` that doesn't exist on the
 *     Pages collection's `blocks` field
 *   - a block without a `blockType`
 */
export async function createBaseSeed(
  payload: Payload,
  options: CreateBaseSeedOptions = {}
): Promise<CreateBaseSeedResult> {
  const localization = payload.config.localization
  const defaultLocale =
    options.defaultLocale ??
    (typeof localization === 'object' && localization
      ? (typeof localization.defaultLocale === 'string' ? localization.defaultLocale : 'en')
      : 'en')
  const configLocales =
    typeof localization === 'object' && localization
      ? (localization.locales ?? []).map((l) => (typeof l === 'string' ? l : l.code))
      : []
  const locales = options.locales ?? (configLocales.length > 0 ? configLocales : [defaultLocale])

  const result: CreateBaseSeedResult = { users: [], categories: [], pages: [], posts: [] }

  const pagesCollection = payload.collections['pages']
  if (!pagesCollection) {
    throw new Error('createBaseSeed: no `pages` collection registered with this payload instance')
  }

  // Walk the (possibly nested) field tree to find the `blocks` field.
  // The lib's Pages collection nests `blocks` under a `tabs` group
  // inside the Content tab, and tabs themselves have `tabs: [{ fields: [] }]`.
  const findBlocksField = (fields: unknown[]): { blocks?: Array<{ slug: string }> } | undefined => {
    for (const f of fields as Array<{
      name?: string
      type?: string
      fields?: unknown[]
      tabs?: Array<{ fields?: unknown[] }>
      blocks?: unknown[]
    }>) {
      if (f.name === 'blocks' && Array.isArray(f.blocks)) return f as any
      if (Array.isArray(f.fields)) {
        const found = findBlocksField(f.fields)
        if (found) return found
      }
      if (Array.isArray(f.tabs)) {
        for (const t of f.tabs) {
          if (Array.isArray(t.fields)) {
            const found = findBlocksField(t.fields)
            if (found) return found
          }
        }
      }
    }
    return undefined
  }
  const layoutField = findBlocksField(pagesCollection.config.fields as unknown[])
  const validBlockSlugs = new Set(((layoutField as {
    blocks?: Array<{ slug: string }>
  } | undefined)?.blocks ?? []).map((b) => b.slug))

  for (const page of options.pages ?? []) {
    for (const block of page.blocks ?? []) {
      const slug = (block as { blockType?: string }).blockType
      if (!slug) {
        throw new Error(`createBaseSeed: page "${page.slug}" has a block without blockType`)
      }
      if (!validBlockSlugs.has(slug)) {
        throw new Error(
          `createBaseSeed: page "${page.slug}" references unknown block slug "${slug}". Allowed: ${[...validBlockSlugs].join(', ')}`
        )
      }
    }
  }

  if (options.dryRun) return result

  for (const user of options.users ?? [{ email: 'dev@payloadcms.com', password: 'test', name: 'Dev User' }]) {
    const existing = await payload.find({
      collection: 'users',
      where: { email: { equals: user.email } },
      limit: 1,
      overrideAccess: true
    })
    let id: string | number
    if (existing.docs.length > 0) {
      id = existing.docs[0].id
    } else {
      const created = await payload.create({
        collection: 'users',
        data: { email: user.email, password: user.password ?? 'test', name: user.name ?? '' },
        overrideAccess: true
      })
      id = created.id
    }
    result.users.push({ id, email: user.email })
  }

  for (const cat of options.categories ?? []) {
    const slug = cat.slug ?? cat.title.toLowerCase().replace(/\s+/g, '-')
    const existing = await payload.find({
      collection: 'categories',
      where: { title: { equals: cat.title } },
      limit: 1,
      overrideAccess: true
    })
    let id: string | number
    if (existing.docs.length > 0) {
      id = existing.docs[0].id
    } else {
      const created = await payload.create({
        collection: 'categories',
        data: { title: cat.title, slug },
        overrideAccess: true
      })
      id = created.id
    }
    result.categories.push({ id, title: cat.title, slug })
  }

  for (const page of options.pages ?? []) {
    const existing = await payload.find({
      collection: 'pages',
      where: { slug: { equals: page.slug } },
      limit: 1,
      overrideAccess: true
    })

    const data: Record<string, unknown> = {
      slug: page.slug,
      title: { ...page.title },
      blocks: page.blocks ?? [],
      publishedAt: page.publishedAt ?? new Date().toISOString(),
      // Payload's draft/publish defaults to `draft` if `_status` is
      // omitted — `draft: false` alone doesn't promote the doc. Be
      // explicit so the seed actually publishes.
      _status: page.status === 'draft' ? 'draft' : 'published'
    }
    if (page.meta) data.meta = { ...page.meta }

    let id: string | number
    if (existing.docs.length === 0) {
      const created = await payload.create({
        collection: 'pages',
        data,
        overrideAccess: true,
        draft: page.status === 'draft'
      })
      id = created.id
    } else {
      id = existing.docs[0].id
      await payload.update({
        collection: 'pages',
        id,
        data,
        overrideAccess: true,
        draft: page.status === 'draft'
      })
    }
    for (const locale of locales) result.pages.push({ id, slug: page.slug, locale })
  }

  for (const post of options.posts ?? []) {
    const existing = await payload.find({
      collection: 'posts',
      where: { slug: { equals: post.slug } },
      limit: 1,
      overrideAccess: true
    })
    const data: Record<string, unknown> = {
      slug: post.slug,
      title: { ...post.title },
      // Excerpt is set before the `content` / `_status` fields so
      // Payload's beforeChange pipeline processes it in the same
      // pass as the other localized fields. (Some Payload versions
      // short-circuit localized-field stringification for fields
      // appended after `_status`.)
      ...(post.excerpt ? { excerpt: { ...post.excerpt } } : {}),
      content: post.content ?? simpleRichText('Hello world'),
      publishedAt: post.publishedAt ?? new Date().toISOString(),
      authors: result.users.length > 0 ? [result.users[0].id] : [],
      // Explicit publish — same reason as pages above; Payload
      // defaults `_status` to `draft` when omitted.
      _status: post.status === 'draft' ? 'draft' : 'published'
    }
    let id: string | number
    if (existing.docs.length === 0) {
      const created = await payload.create({
        collection: 'posts',
        data,
        overrideAccess: true,
        draft: post.status === 'draft'
      })
      id = created.id
    } else {
      id = existing.docs[0].id
      await payload.update({
        collection: 'posts',
        id,
        data,
        overrideAccess: true,
        draft: post.status === 'draft'
      })
    }
    for (const locale of locales) result.posts.push({ id, slug: post.slug, locale })
  }

  return result
}
