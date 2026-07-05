import type { ReactNode } from 'react'

export type NextPageProps = {
  params: Promise<{ locale: string; slug?: string | string[] }>
}

export type NextLayoutProps = {
  params: Promise<{ locale: string }>
  children: ReactNode
}
