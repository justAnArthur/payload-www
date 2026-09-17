import type { EntityReview, LocaleReview } from '../loadReview'
import { editHref, reviewHref } from './href'

type Tone = 'bad' | 'ok' | 'warn'

const toneOf = ({ summary }: LocaleReview): Tone =>
  summary.slugMissing || summary.coverage < 50 ? 'bad' : summary.coverage < 100 ? 'warn' : 'ok'

const coverageTone = (coverage: number): Tone => coverage < 50 ? 'bad' : coverage < 100 ? 'warn' : 'ok'

const isIncomplete = ({ summary, stale }: LocaleReview) => summary.coverage < 100 || summary.slugMissing || stale

export const Overview = ({ adminRoute, defaultLocale, entities, locales, onlyIssues, tab, page }: {
  adminRoute: string
  defaultLocale: string
  entities: EntityReview[]
  locales: string[]
  onlyIssues: boolean
  tab: string
  page?: number
}) => {
  const rows = onlyIssues
    ? entities.filter((entity) => Object.values(entity.locales).some(isIncomplete))
    : entities

  const stats = locales.map((locale) => {
    const reviews = entities.map((entity) => entity.locales[locale])
    const fields = reviews.reduce((sum, each) => sum + each.summary.total, 0)
    const ok = reviews.reduce((sum, each) => sum + each.summary.ok, 0)
    return {
      locale,
      coverage: fields ? Math.floor((ok / fields) * 100) : 100,
      incomplete: reviews.filter(isIncomplete).length,
      wrongLanguage: reviews.filter((each) => each.summary.wrongLanguage > 0).length
    }
  })

  return (
    <>
      <div className="tr__stats">
        {stats.map(({ locale, coverage, incomplete, wrongLanguage }) => (
          <div className="tr__stat" key={locale}>
            <span className="tr__stat-label">{locale}</span>
            <span className="tr__stat-value">{coverage}%</span>
            <div className="tr__bar" style={{ ['--tr-tone' as string]: `var(--tr-${coverageTone(coverage)})` }}>
              <span style={{ width: `${coverage}%` }}/>
            </div>
            <span className="tr__stat-note">{incomplete ? `${incomplete} incomplete` : 'all complete'}</span>
            {wrongLanguage > 0 && <span className="tr__stat-note tr__lang">⚑ {wrongLanguage} in another language</span>}
          </div>
        ))}
      </div>

      <div className="tr__card">
        <table>
          <thead>
            <tr>
              <th>Document</th>
              {locales.map((locale) => (
                <th className="tr__locale-col" key={locale}>{locale.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((entity) => (
              <tr key={entity.key}>
                <td className="tr__doc">
                  <a href={editHref(adminRoute, entity, defaultLocale)}>{entity.label}</a>
                  <span className="tr__key">{entity.key}</span>
                </td>
                {locales.map((locale) => {
                  const review = entity.locales[locale]
                  const { summary } = review
                  const title = [
                    `${summary.ok}/${summary.total} fields translated`,
                    summary.missing && `${summary.missing} missing`,
                    summary.identical && `${summary.identical} same as ${defaultLocale}`,
                    summary.placeholders && `${summary.placeholders} broken placeholders`,
                    summary.wrongLanguage && `${summary.wrongLanguage} written in another language`,
                    summary.slugMissing && 'no slug: the page 404s',
                    review.stale && 'source changed since translation',
                    review.reviewed && 'reviewed'
                  ].filter(Boolean).join(' · ')

                  return (
                    <td className="tr__locale-col" key={locale}>
                      <a
                        className="tr__cell"
                        data-tone={toneOf(review)}
                        href={reviewHref(adminRoute, { tab, page, entity: entity.key, locale, issues: isIncomplete(review) ? 1 : undefined })}
                        title={title}
                      >
                        <span>
                          {summary.slugMissing ? '404' : `${summary.coverage}%`}
                          {(review.stale || review.reviewed) && (
                            <span className="tr__marks"> {[review.stale && '↻', review.reviewed && '✓'].filter(Boolean).join(' ')}</span>
                          )}
                          {summary.wrongLanguage > 0 && <span className="tr__lang"> ⚑{summary.wrongLanguage}</span>}
                        </span>
                        <span className="tr__bar"><span style={{ width: `${summary.slugMissing ? 100 : summary.coverage}%` }}/></span>
                      </a>
                    </td>
                  )
                })}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td className="tr__empty" colSpan={locales.length + 1}>Everything here is fully translated.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="tr__legend">
        <span><i className="tr__dot" style={{ ['--tr-tone' as string]: 'var(--tr-ok)' }}/>fully translated</span>
        <span><i className="tr__dot" style={{ ['--tr-tone' as string]: 'var(--tr-warn)' }}/>partly translated</span>
        <span><i className="tr__dot" style={{ ['--tr-tone' as string]: 'var(--tr-bad)' }}/>under half, or 404 without a slug</span>
        <span className="tr__lang">⚑ fields written in another language</span>
        <span>↻ source changed since the last translation</span>
        <span>✓ reviewed</span>
      </div>
    </>
  )
}
