import { HeaderClient } from './Component.client'
import { getCachedGlobal } from '@/utilities/getGlobals'
import React from 'react'

import type { Header } from '@/payload-types'
import { Locale } from '@/lib/i18n/locales'

export async function Header({ locale }: { locale: Locale }) {
  const headerData: Header = await getCachedGlobal('header', locale, 1)()

  return <HeaderClient data={headerData} />
}
