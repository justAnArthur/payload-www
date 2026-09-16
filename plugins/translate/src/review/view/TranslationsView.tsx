import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import type { AdminViewServerProps } from 'payload'

import { ReviewStyles } from '@justanarthur/payload-plugin-translator/client'
import type { TranslatorConfig } from '../../types'
import { loadCollectionReview, loadEntityLocaleReview, loadGlobalsReview, readLocales } from '../loadReview'
import { Detail } from './Detail'
import { reviewHref } from './href'
import { Overview } from './Overview'

const param = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value

export const TranslationsView = async ({ initPageResult, params, searchParams }: AdminViewServerProps) => {
  const { req, permissions, visibleEntities, locale } = initPageResult
  const { payload } = req
  const adminRoute = payload.config.routes.admin
  const pluginConfig = payload.config.custom?.translator as TranslatorConfig | undefined

  const collections = (pluginConfig?.collections ?? []).filter((slug) => permissions?.collections?.[slug]?.read)
  const globals = (pluginConfig?.globals ?? []).filter((slug) => permissions?.globals?.[slug]?.read)
  const tabs = [...collections, ...(globals.length ? ['globals'] : [])] as string[]

  const tab = tabs.includes(param(searchParams?.tab) ?? '') ? param(searchParams?.tab)! : tabs[0]
  const entity = param(searchParams?.entity)
  const targetLocale = param(searchParams?.locale)
  const onlyIssues = param(searchParams?.issues) === '1'
  const page = Math.max(1, Number(param(searchParams?.page)) || 1)
  const { defaultLocale, targetLocales } = readLocales(req)

  const content = async () => {
    if (!req.user) return <p>Log in to review translations.</p>
    if (!tab) return <p>No translated collections or globals are readable for your user.</p>

    if (entity && targetLocale && targetLocales.includes(targetLocale)) {
      try {
        const review = await loadEntityLocaleReview({ req, entity, locale: targetLocale })
        return <Detail adminRoute={adminRoute} onlyIssues={onlyIssues} review={review} tab={tab}/>
      } catch (error) {
        return <p className="translator-review__error">Could not load {entity}: {String(error)}</p>
      }
    }

    if (tab === 'globals') {
      const { entities, locales } = await loadGlobalsReview({ req, globalSlugs: globals })
      return <Overview adminRoute={adminRoute} defaultLocale={defaultLocale} entities={entities} locales={locales} onlyIssues={onlyIssues} tab={tab}/>
    }

    const review = await loadCollectionReview({ req, collectionSlug: tab, page })

    return (
      <>
        <Overview adminRoute={adminRoute} defaultLocale={defaultLocale} entities={review.entities} locales={review.locales} onlyIssues={onlyIssues} tab={tab}/>
        {review.totalPages > 1 && (
          <div className="translator-review__pager">
            {page > 1 && <a href={reviewHref(adminRoute, { tab, page: page - 1, issues: onlyIssues ? 1 : undefined })}>← Newer</a>}
            <span>Page {page} of {review.totalPages} · {review.totalDocs} documents</span>
            {page < review.totalPages && <a href={reviewHref(adminRoute, { tab, page: page + 1, issues: onlyIssues ? 1 : undefined })}>Older →</a>}
          </div>
        )}
      </>
    )
  }

  // loaders read through the page req, which moves `req.locale`; put the admin locale back after
  const adminLocale = req.locale
  const body = await content()
  req.locale = adminLocale

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={payload}
      permissions={permissions}
      searchParams={searchParams}
      user={req.user || undefined}
      visibleEntities={visibleEntities}
    >
      <ReviewStyles/>
      <Gutter className="translator-review">
        {!entity && (
          <>
            <div className="translator-review__header">
              <h1>Translations</h1>
              <a href={reviewHref(adminRoute, { tab, issues: onlyIssues ? undefined : 1 })}>
                {onlyIssues ? 'Show everything' : 'Show only incomplete'}
              </a>
            </div>
            <nav className="translator-review__tabs">
              {tabs.map((each) => (
                <a aria-current={each === tab} className="translator-review__tab" href={reviewHref(adminRoute, { tab: each, issues: onlyIssues ? 1 : undefined })} key={each}>
                  {each}
                </a>
              ))}
            </nav>
          </>
        )}
        {body}
      </Gutter>
    </DefaultTemplate>
  )
}
