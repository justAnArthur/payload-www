import { createRootLayoutExports } from '@justanarthur/payload-www/render-pages'
import { NextIntlClientProvider } from 'next-intl'
import type { Metadata } from 'next'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'

import { cn } from '@/utilities/ui'
import { routing } from '@/i18n/routing'
import { asyncImportMap as importMap } from '@/app/(payload)/admin/asyncImportMap'
import config from '@payload-config'

import '../globals.css'

export const metadata: Metadata = {
  title: {
    default: 'payload-www demo',
    template: '%s · payload-www demo'
  },
  description:
    'Minimal showcase for @justanarthur/payload-www — Pages, Posts, Categories, Header, Footer, SEO, image hash, translator, live preview, JSON-LD, hreflang, and async-importmap-powered block dispatch.'
}

const { default: RootLayout, generateStaticParams } = createRootLayoutExports(
  // ponytail: routing is `readonly [...]` from next-intl, lib expects `RoutingConfig` — narrow the cast.
  { config, routing: routing as unknown as Parameters<typeof createRootLayoutExports>[0]['routing'], importMap },
  {
    htmlAttrs: (locale) => ({
      lang: locale,
      className: cn(GeistSans.variable, GeistMono.variable)
    }),
    providers: ({ children, locale }) => (
      // ponytail: messages are not threaded through CreateRootLayoutProvidersArgs;
      // next-intl pulls them server-side via its request config.
      <NextIntlClientProvider locale={locale as 'en' | 'uk'}>
        {children}
      </NextIntlClientProvider>
    )
  }
)

export { generateStaticParams }
export default RootLayout