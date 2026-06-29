import { createRootLayoutExports } from '@justanarthur/payload-www/render-pages'
import { AdminBar } from '@justanarthur/payload-www/render-components'
import { NextIntlClientProvider } from 'next-intl'
import type { Metadata } from 'next'

import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'

import { cn } from '@/utilities/ui'
import { HeaderThemeProvider } from '@/providers/HeaderTheme'
import { ThemeProvider } from '@/providers/Theme'
import { InitTheme } from '@/providers/Theme/InitTheme'
import { importMap } from '@/app/(payload)/admin/importMap.js'
import { routing } from '@/i18n/routing'

import configPromise from '@payload-config'

import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'payload-www demo',
    template: '%s · payload-www demo'
  },
  description:
    'A minimal showcase for the @justanarthur/payload-www lib — Pages, Posts, Header, Footer, SEO, image hash, translator, live preview, and a Pages-collection page exporter that wraps everything in a sidebar with metadata + JSON-LD + language switcher.'
}

const { default: RootLayout, generateStaticParams } = createRootLayoutExports({
  config: configPromise,
  routing,
  importMap,
  htmlAttrs: (locale) => ({
    lang: locale,
    className: cn(GeistSans.variable, GeistMono.variable)
  }),
  head: () => <InitTheme />,
  providers: ({ children, locale, messages, draftMode }) => (
    <NextIntlClientProvider locale={locale as 'en' | 'uk'} messages={messages}>
      <ThemeProvider>
        <HeaderThemeProvider>
          <AdminBar preview={draftMode} />
          {children}
        </HeaderThemeProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  )
})

export { generateStaticParams }
export default RootLayout
