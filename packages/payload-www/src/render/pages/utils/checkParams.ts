import type { ReactNode } from 'react'

export type NextPageProps = {
  params: Promise<{ locale: string; slug?: string | string[] }>
}

export type NextLayoutProps = {
  params: Promise<{ locale: string }>
  children: ReactNode
}

type RouteParams = Record<string, string | string[] | undefined>

// next passes generateStaticParams the parent segments' params as a plain object
export type GenerateStaticParamsProps<P extends RouteParams = RouteParams> = {
  params: P | Promise<P>
}
