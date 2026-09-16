import type { EntityReview, LocaleReview } from '../loadReview'
import { editHref, reviewHref } from './href'

const cellTone = ({ summary, stale }: LocaleReview) =>
  [
    'translator-review__cell',
    summary.slugMissing || summary.coverage === 0 ? 'translator-review__cell--missing'
      : summary.coverage === 100 ? 'translator-review__cell--ok' : 'translator-review__cell--partial',
    stale ? 'translator-review__cell--stale' : ''
  ].filter(Boolean).join(' ')

const hasIssue = ({ summary, stale, reviewed }: LocaleReview) =>
  summary.coverage < 100 || summary.slugMissing || stale || !reviewed

export const Overview = ({ adminRoute, defaultLocale, entities, locales, onlyIssues, tab }: {
  adminRoute: string
  defaultLocale: string
  entities: EntityReview[]
  locales: string[]
  onlyIssues: boolean
  tab: string
}) => {
  const rows = onlyIssues
    ? entities.filter((entity) => Object.values(entity.locales).some((each) => each.summary.coverage < 100 || each.summary.slugMissing || each.stale))
    : entities

  const totals = Object.fromEntries(locales.map((locale) => {
    const reviews = entities.map((entity) => entity.locales[locale])
    const fields = reviews.reduce((sum, each) => sum + each.summary.total, 0)
    const ok = reviews.reduce((sum, each) => sum + each.summary.ok, 0)
    return [locale, fields ? Math.floor((ok / fields) * 100) : 100]
  }))

  return (
    <>
      <div className="translator-review__scroll">
        <table>
          <thead>
            <tr>
              <th>Document</th>
              {locales.map((locale) => (
                <th key={locale}>{locale} <small>{totals[locale]}%</small></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((entity) => (
              <tr key={entity.key}>
                <td className="translator-review__doc">
                  <a href={editHref(adminRoute, entity, defaultLocale)}>{entity.label}</a>
                  <small>{entity.key}</small>
                </td>
                {locales.map((locale) => {
                  const review = entity.locales[locale]
                  const title = [
                    `${review.summary.ok}/${review.summary.total} fields translated`,
                    review.summary.missing && `${review.summary.missing} missing`,
                    review.summary.identical && `${review.summary.identical} same as ${defaultLocale}`,
                    review.summary.placeholders && `${review.summary.placeholders} broken placeholders`,
                    review.summary.slugMissing && 'no slug: page 404s',
                    review.stale && `source changed since translation`,
                    review.reviewed && 'reviewed'
                  ].filter(Boolean).join(' · ')

                  return (
                    <td key={locale}>
                      <a
                        className={cellTone(review)}
                        href={reviewHref(adminRoute, { tab, entity: entity.key, locale, issues: hasIssue(review) ? 1 : undefined })}
                        title={title}
                      >
                        {review.summary.slugMissing ? '404' : `${review.summary.coverage}%`}
                        {review.reviewed ? ' ✓' : ''}
                        {review.stale ? ' ↻' : ''}
                      </a>
                    </td>
                  )
                })}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={locales.length + 1}>Nothing to review here.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="translator-review__legend">
        <span>% share of fields translated</span>
        <span>404 no slug in that locale</span>
        <span>↻ source changed since the last translation</span>
        <span>✓ reviewed against the current source</span>
      </div>
    </>
  )
}
