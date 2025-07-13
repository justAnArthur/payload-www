import type { Metadata } from 'next'
import { cn } from '@/lib/utils/ui'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import { AdminBar } from '@/components/AdminBar'
import { Footer } from '@/globals/Footer/Component'
import { Header } from '@/globals/Header/Component'
import { Providers } from '@/app/(frontend)/_providers'
import { InitTheme } from '@/app/(frontend)/_providers/Theme/InitTheme'
import { mergeOpenGraph } from '@/lib/utils/mergeOpenGraph'
import { draftMode } from 'next/headers'
import { getServerSideURL } from '@/lib/utils/getURL'
import { Locale, locales } from '@/lib/i18n/locales'
import { ReactNode } from 'react'
import { hasLocale } from 'next-intl'
import { routing } from '@/lib/i18n/routing'
import { notFound } from 'next/navigation'
import '../globals.css'

export type LocaleParamParams = {
  params: Promise<{ locale: Locale }>
}

export default async function RootLayout({
  children,
  params: paramsPromise,
}: { children: ReactNode } & LocaleParamParams) {
  const { isEnabled } = await draftMode()
  const { locale } = await paramsPromise

  if (!hasLocale(routing.locales, locale)) notFound()

  return (
    <html
      className={cn(GeistSans.variable, GeistMono.variable)}
      lang={locale}
      suppressHydrationWarning
    >
      <head>
        <InitTheme />
        <link href="/favicon.ico" rel="icon" sizes="32x32" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
      </head>
      <body>
        <Providers>
          <AdminBar
            adminBarProps={{
              preview: isEnabled,
            }}
          />

          <Header locale={locale} />
          {children}
          <Footer locale={locale} />
        </Providers>
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  metadataBase: new URL(getServerSideURL()),
  openGraph: mergeOpenGraph(),
  twitter: {
    card: 'summary_large_image',
    creator: '@payloadcms',
  },
}

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}
