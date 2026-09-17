import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import type { AdminViewServerProps } from 'payload'

import type { TranslatorConfig } from '../../types'
import { BulkActions } from '@justanarthur/payload-plugin-translator/client'
import { loadJobsProgress } from '../bulk'
import { loadCollectionReview, loadEntityLocaleReview, loadGlobalsReview, readLocales } from '../loadReview'
import { Detail } from './Detail'
import { reviewHref } from './href'
import { Overview } from './Overview'
import { reviewStyles } from './styles'

const PAGE_SIZE = 50

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
    if (!req.user) return <p className="tr__empty">Log in to review translations.</p>
    if (!tab) return <p>No translated collections or globals are readable for your user.</p>

    if (entity && targetLocale && targetLocales.includes(targetLocale)) {
      try {
        const review = await loadEntityLocaleReview({ req, entity, locale: targetLocale })
        return <Detail adminRoute={adminRoute} onlyIssues={onlyIssues} page={page} review={review} tab={tab}/>
      } catch (error) {
        return <p className="tr__error">Could not load {entity}: {String(error)}</p>
      }
    }

    if (tab === 'globals') {
      const { entities, locales } = await loadGlobalsReview({ req, globalSlugs: globals })
      return <Overview adminRoute={adminRoute} defaultLocale={defaultLocale} entities={entities} locales={locales} onlyIssues={onlyIssues} tab={tab}/>
    }

    const review = await loadCollectionReview({ req, collectionSlug: tab, page, limit: PAGE_SIZE })
    const first = review.totalDocs ? (review.page - 1) * PAGE_SIZE + 1 : 0
    const last = Math.min(review.page * PAGE_SIZE, review.totalDocs)
    const pageHref = (target: number) => reviewHref(adminRoute, { tab, page: target, issues: onlyIssues ? 1 : undefined })

    return (
      <>
        <Overview adminRoute={adminRoute} defaultLocale={defaultLocale} entities={review.entities} locales={review.locales} onlyIssues={onlyIssues} page={page} tab={tab}/>
        <div className="tr__pager">
          <span>{first}–{last} of {review.totalDocs} documents{onlyIssues ? ' (complete ones hidden)' : ''}</span>
          {review.totalPages > 1 && (
            <nav>
              {review.page > 1 ? <a href={pageHref(review.page - 1)}>← Newer</a> : <span aria-disabled>← Newer</span>}
              <span>{review.page} / {review.totalPages}</span>
              {review.page < review.totalPages ? <a href={pageHref(review.page + 1)}>Older →</a> : <span aria-disabled>Older →</span>}
            </nav>
          )}
        </div>
      </>
    )
  }

  // loaders read through the page req, which moves `req.locale`; put the admin locale back after
  const adminLocale = req.locale
  const progress = entity || !req.user ? null : await loadJobsProgress(req)
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
      <style dangerouslySetInnerHTML={{ __html: reviewStyles }}/>
      <Gutter className="tr">
        {!entity && (
          <>
            <div className="tr__head">
              <div>
                <h1>Translations</h1>
                <p className="tr__lead">How much of each document is translated from {defaultLocale.toUpperCase()}. Open a cell to compare it field by field.</p>
              </div>
            </div>
            <div className="tr__toolbar">
              <nav className="tr__tabs">
                {tabs.map((each) => (
                  <a aria-current={each === tab} className="tr__tab" href={reviewHref(adminRoute, { tab: each, issues: onlyIssues ? 1 : undefined })} key={each}>
                    {each}
                  </a>
                ))}
              </nav>
              <a aria-pressed={onlyIssues} className="tr__toggle" href={reviewHref(adminRoute, { tab, issues: onlyIssues ? undefined : 1 })}>
                Only incomplete
              </a>
            </div>
            {req.user && tab && <BulkActions locales={targetLocales} progress={progress} tab={tab}/>}
          </>
        )}
        {body}
      </Gutter>
    </DefaultTemplate>
  )
}
