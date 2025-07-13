import type { Metadata } from 'next'

import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import React, { cache } from 'react'
import RichText from '@/components/RichText'

import PageClient from './page.client'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { Locale } from '@/lib/i18n/locales'
import { LocaleParamParams } from '@/app/(frontend)/[locale]/layout'
import { setRequestLocale } from 'next-intl/server'
import { generateMeta } from '@/lib/utils/generateMeta'
import { RelatedPosts } from '@/components/blocks/RelatedPosts/Component'

type Args = {
  params: Promise<{ slug?: string }>
} & LocaleParamParams

export default async function Post({ params: paramsPromise }: Args) {
  const { slug = '', locale } = await paramsPromise
  setRequestLocale(locale)

  const { isEnabled: draft } = await draftMode()

  const post = await queryPostBySlug({ slug, locale })

  const url = '/posts/' + slug

  if (!post) return <PayloadRedirects url={url} />

  return (
    <article className="pt-16 pb-16">
      <PageClient />

      {/* Allows redirects for valid pages too */}
      <PayloadRedirects disableNotFound url={url} />

      {draft && <LivePreviewListener />}

      {/*<PostHero post={post} />*/}

      <div className="flex flex-col items-center gap-4 pt-8">
        <div className="container">
          <RichText className="max-w-[48rem] mx-auto" data={post.content} enableGutter={false} />
          {post.relatedPosts && post.relatedPosts.length > 0 && (
            <RelatedPosts
              className="mt-12 max-w-[52rem] lg:grid lg:grid-cols-subgrid col-start-1 col-span-3 grid-rows-[2fr]"
              docs={post.relatedPosts.filter((post) => typeof post === 'object')}
            />
          )}
        </div>
      </div>
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '', locale } = await paramsPromise

  const post = await queryPostBySlug({ slug, locale })

  return generateMeta({ doc: post })
}

const queryPostBySlug = cache(async ({ slug, locale }: { slug: string; locale: Locale }) => {
  const { isEnabled: draft } = await draftMode()

  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'posts',
    draft,
    limit: 1,
    overrideAccess: draft,
    pagination: false,
    where: {
      slug: {
        equals: slug,
      },
    },
    locale,
  })

  return result.docs?.[0] || null
})

export async function generateStaticParams({ params }: { params: { locale: Locale } }) {
  const { locale } = params

  const payload = await getPayload({ config: configPromise })

  const posts = await payload.find({
    collection: 'posts',
    draft: false,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: {
      slug: true,
    },
    locale,
  })

  return posts.docs.map(({ slug }) => {
    return { slug }
  })
}
