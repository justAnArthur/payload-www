'use client'

import { useConfig } from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'

import { REVIEW_VIEW_PATH } from '../../../review/constants'

export const TranslationsNavLink = () => {
  const { config: { routes: { admin } } } = useConfig()
  const href = formatAdminURL({ adminRoute: admin, path: REVIEW_VIEW_PATH })

  return (
    <a className="nav__link" href={href} id="nav-translations">
      <span className="nav__link-label">Translations</span>
    </a>
  )
}
