import type { ReactNode } from 'react'

// ponytail: Next.js 16's type validator expects:
//   - generateStaticParams → params: { locale, slug? } (sync object)
//   - layouts             → params: Promise<{ locale }> (still async)
// Two separate types, two separate shapes. The lib's runtime code awaits
// `props.params` everywhere; awaiting a sync object yields the same
// value, so this works regardless of the actual runtime shape.
export type NextPageProps = {
  params: { locale: string; slug?: string | string[] }
}

export type NextLayoutProps = {
  params: Promise<{ locale: string }>
  children: ReactNode
}
