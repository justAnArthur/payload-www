import type { FieldState } from '../computeStatus'
import type { loadEntityLocaleReview } from '../loadReview'
// imported through the package so the client bundle keeps its `use client` boundary
import { ReviewActions } from '@justanarthur/payload-plugin-translator/client'
import { editHref, reviewHref } from './href'

type Review = Awaited<ReturnType<typeof loadEntityLocaleReview>>

const STATE: Record<FieldState, { label: string; tone: 'bad' | 'ok' | 'warn' }> = {
  identical: { label: 'same as source', tone: 'warn' },
  missing: { label: 'missing', tone: 'bad' },
  ok: { label: 'translated', tone: 'ok' },
  placeholders: { label: 'placeholders differ', tone: 'warn' },
  wrongLanguage: { label: 'wrong language', tone: 'bad' }
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

export const Detail = ({ adminRoute, review, onlyIssues, tab, page }: {
  adminRoute: string
  review: Review
  onlyIssues: boolean
  tab: string
  page?: number
}) => {
  const rows = onlyIssues ? review.fields.filter((field) => field.state !== 'ok') : review.fields
  const { summary } = review
  const tone = summary.slugMissing || summary.coverage < 50 ? 'bad' : summary.coverage < 100 ? 'warn' : 'ok'

  const counters = [
    { label: 'translated', value: `${summary.coverage}%`, note: `${summary.ok} of ${summary.total} fields`, bar: true },
    { label: 'missing', value: summary.missing, note: 'empty in this locale' },
    { label: 'same as source', value: summary.identical, note: `identical to ${review.defaultLocale}` },
    { label: 'wrong language', value: summary.wrongLanguage, note: `not written in ${review.locale}` },
    { label: 'placeholders', value: summary.placeholders, note: 'differ from source' }
  ]

  return (
    <>
      <div className="tr__head">
        <div>
          <a className="tr__back" href={reviewHref(adminRoute, { tab, page })}>← All {tab}</a>
          <h1>{review.label}</h1>
          <p className="tr__lead">{review.defaultLocale.toUpperCase()} → {review.locale.toUpperCase()} · {review.entity}</p>
        </div>
        <ReviewActions entity={review.entity} locale={review.locale} reviewed={review.reviewed}/>
      </div>

      <div className="tr__stats">
        {counters.map((counter) => (
          <div className="tr__stat" key={counter.label}>
            <span className="tr__stat-label">{counter.label}</span>
            <span className="tr__stat-value">{counter.value}</span>
            {counter.bar && (
              <div className="tr__bar" style={{ ['--tr-tone' as string]: `var(--tr-${tone})` }}>
                <span style={{ width: `${summary.coverage}%` }}/>
              </div>
            )}
            <span className="tr__stat-note">{counter.note}</span>
          </div>
        ))}
      </div>

      <div className="tr__meta">
        {summary.slugMissing && <span className="tr__chip tr__chip--bad">no slug: the page 404s in {review.locale}</span>}
        {review.stale && <span className="tr__chip">↻ source changed since the last translation</span>}
        {review.translatedAt && <span className="tr__chip">translated {new Date(review.translatedAt).toLocaleString()}</span>}
        {review.reviewedAt && <span className="tr__chip">✓ reviewed {new Date(review.reviewedAt).toLocaleString()} by {review.reviewedBy}</span>}
        {review.lastJob && (
          <span className={`tr__chip${review.lastJob.error ? ' tr__chip--bad' : ''}`} title={review.lastJob.error}>
            job #{review.lastJob.id}: {review.lastJob.error ? `failed — ${preview(review.lastJob.error).slice(0, 80)}` : review.lastJob.completedAt ? 'completed' : review.lastJob.processing ? 'running' : 'queued'}
          </span>
        )}
        <a className="tr__chip" href={editHref(adminRoute, review, review.locale)}>Edit in {review.locale.toUpperCase()} ↗</a>
      </div>

      <div className="tr__toolbar">
        <span className="tr__filters">{rows.length} of {review.fields.length} fields</span>
        <a
          aria-pressed={onlyIssues}
          className="tr__toggle"
          href={reviewHref(adminRoute, { tab, page, entity: review.entity, locale: review.locale, issues: onlyIssues ? undefined : 1 })}
        >
          Only problems
        </a>
      </div>

      <div className="tr__card">
        <table>
          <thead>
            <tr>
              <th>Field</th>
              <th>State</th>
              <th>{review.defaultLocale.toUpperCase()}</th>
              <th>{review.locale.toUpperCase()}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((field) => (
              <tr key={field.path}>
                <td className="tr__path" title={field.path}>{readablePath(field.path)}</td>
                <td>
                  <span className="tr__pill" data-tone={STATE[field.state].tone}>
                    {field.detectedLanguage ? `${field.detectedLanguage} detected` : STATE[field.state].label}
                  </span>
                </td>
                <td className="tr__text">{preview(field.sourceText)}</td>
                <td className={`tr__text${field.targetText.trim() ? '' : ' tr__text--empty'}`}>
                  {field.targetText.trim() ? preview(field.targetText) : 'empty'}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td className="tr__empty" colSpan={4}>Every field is translated.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
