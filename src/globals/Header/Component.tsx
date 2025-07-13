import { HeaderClient } from './Component.client'
import { getCachedGlobal } from '@/lib/utils/getGlobals'
import React from 'react'

import type { Header } from '@/payload-types'
import { Locale } from '@/lib/i18n/locales'
import { getTranslations } from 'next-intl/server'

export async function Header({ locale }: { locale: Locale }) {
  const headerData: Header = await getCachedGlobal('header', locale, 1)()

  const t = await getTranslations('common')

  return (
    <>
      {t('hello')}
      <HeaderClient data={headerData} />
    </>
  )
}
