import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import config from '@payload-config'
import { getServerSideURL } from '@/utilities/getURL'

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const secret = url.searchParams.get('secret')
  const slug = url.searchParams.get('slug')
  const collection = url.searchParams.get('collection') ?? 'pages'

  if (secret !== (process.env.PREVIEW_SECRET || '')) {
    return new Response('Invalid token', { status: 401 })
  }

  if (!slug) {
    return new Response('Missing slug', { status: 400 })
  }

  const payload = await getPayload({ config })
  const docs = await payload.find({
    collection: collection as 'pages' | 'posts',
    where: { slug: { equals: slug } },
    limit: 1,
    draft: true,
    overrideAccess: true
  })

  if (!docs.docs[0]) {
    return new Response('Not found', { status: 404 })
  }

  const draft = await draftMode()
  draft.enable()

  const target = collection === 'posts'
    ? `${getServerSideURL()}/posts/${slug}`
    : `${getServerSideURL()}/${slug === '' ? '' : slug}`

  redirect(target)
}