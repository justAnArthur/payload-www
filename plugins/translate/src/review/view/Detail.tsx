import type { FieldState } from '../computeStatus'
import type { loadEntityLocaleReview } from '../loadReview'
// imported through the package so the client bundle keeps its `use client` boundary
import { ReviewActions } from '@justanarthur/payload-plugin-translator/client'
import { editHref, reviewHref } from './href'

type Review = Awaited<ReturnType<typeof loadEntityLocaleReview>>

const STATE_LABEL: Record<FieldState, string> = {
  identical: 'same as source',
  missing: 'missing',
  ok: 'translated',
  placeholders: 'placeholders differ'
}

const preview = (text: string) => text.length > 600 ? `${text.slice(0, 597)}…` : text

/** `blocks[2](faqSmall).items[0].answer` → `blocks 3 · faqSmall › items 1 › answer` */
const readablePath = (path: string) =>
  path
    .replace(/\[(\d+)\]/g, (_, index) => ` ${Number(index) + 1}`)
    .replace(/\(([^)]+)\)/g, ' · $1')
    .replace(/#(\d+)$/, (_, index) => ` (part ${Number(index) + 1})`)
    .split('.')
    .join(' › ')

export const Detail = ({ adminRoute, review, onlyIssues, tab }: {
  adminRoute: string
  review: Review
  onlyIssues: boolean
  tab: string
}) => {
  const rows = onlyIssues ? review.fields.filter((field) => field.state !== 'ok') : review.fields
  const { summary } = review

  return (
    <>
      <div className="translator-review__header">
        <div>
          <a href={reviewHref(adminRoute, { tab })}>← All {tab === 'globals' ? 'globals' : tab}</a>
          <h2>{review.label} · {review.defaultLocale} → {review.locale}</h2>
        </div>
        <ReviewActions entity={review.entity} locale={review.locale} reviewed={review.reviewed}/>
      </div>

      <div className="translator-review__meta">
        <span>{summary.ok}/{summary.total} translated ({summary.coverage}%)</span>
        {summary.missing > 0 && <span>{summary.missing} missing</span>}
        {summary.identical > 0 && <span>{summary.identical} same as {review.defaultLocale}</span>}
        {summary.placeholders > 0 && <span>{summary.placeholders} placeholder mismatches</span>}
        {summary.slugMissing && <span className="translator-review__error">no slug, the page 404s in {review.locale}</span>}
        {review.stale && <span>source changed since the last translation</span>}
        {review.translatedAt && <span>translated {new Date(review.translatedAt).toLocaleString()}</span>}
        {review.reviewedAt && <span>reviewed {new Date(review.reviewedAt).toLocaleString()} by {review.reviewedBy}</span>}
        {review.lastJob && (
          <span className={review.lastJob.error ? 'translator-review__error' : undefined}>
            last auto-translate job #{review.lastJob.id}: {review.lastJob.error ? `failed — ${preview(review.lastJob.error)}` : review.lastJob.completedAt ? 'completed' : review.lastJob.processing ? 'running' : 'queued'}
          </span>
        )}
        <a href={editHref(adminRoute, review, review.locale)}>Edit in {review.locale}</a>
        <a href={reviewHref(adminRoute, { tab, entity: review.entity, locale: review.locale, issues: onlyIssues ? undefined : 1 })}>
          {onlyIssues ? 'Show all fields' : 'Show only problems'}
        </a>
      </div>

      <div className="translator-review__scroll">
        <table>
          <thead>
            <tr>
              <th>Field</th>
              <th>State</th>
              <th>{review.defaultLocale}</th>
              <th>{review.locale}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((field) => (
              <tr key={field.path}>
                <td className="translator-review__path" title={field.path}>{readablePath(field.path)}</td>
                <td><span className={`translator-review__state translator-review__state--${field.state}`}>{STATE_LABEL[field.state]}</span></td>
                <td className="translator-review__text">{preview(field.sourceText)}</td>
                <td className={`translator-review__text${field.targetText.trim() ? '' : ' translator-review__text--empty'}`}>
                  {field.targetText.trim() ? preview(field.targetText) : 'empty'}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4}>Every field is translated.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
