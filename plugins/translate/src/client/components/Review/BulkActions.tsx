'use client'

import { Button, toast, useConfig } from '@payloadcms/ui'
import { useState } from 'react'

type Progress = { pending: number; running: number; failed: number } | null

export const BulkActions = ({ tab, locales, progress }: { tab: string; locales: string[]; progress: Progress }) => {
  const { config: { routes: { api }, serverURL } } = useConfig()
  const [locale, setLocale] = useState('')
  const [pending, setPending] = useState<'bulk' | 'run' | null>(null)

  const post = async (path: string, body: Record<string, unknown>) => {
    const res = await fetch(`${serverURL ?? ''}${api}/translator/review/${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const result = await res.json().catch(() => ({}))
    if (!res.ok || !result.success) throw new Error(result?.errors?.[0]?.message ?? 'request failed')
    return result
  }

  const queue = async () => {
    const scope = `${locale ? locale.toUpperCase() : 'every locale'} of all ${tab}`
    if (!window.confirm(`Queue translation of empty, untranslated and wrong-language fields in ${scope}? Correct translations are kept.`)) return

    setPending('bulk')
    try {
      const { queuedDocuments, queuedLocales, skippedPending } = await post('bulk', { tab, locale, mode: 'untranslated' })
      toast.success(
        queuedDocuments
          ? `Queued ${queuedDocuments} documents (${queuedLocales} locales)${skippedPending ? `, ${skippedPending} already queued` : ''}`
          : skippedPending ? 'Everything incomplete is already queued' : 'Nothing to translate'
      )
      window.location.reload()
    } catch (error) {
      toast.error(`Could not queue: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setPending(null)
    }
  }

  const runNow = async () => {
    setPending('run')
    try {
      await post('run-jobs', {})
      toast.success('Ran a batch of queued translations')
      window.location.reload()
    } catch (error) {
      toast.error(`Could not run jobs: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="tr__bulk">
      <div className="tr__bulk-main">
        <select aria-label="Locale" className="tr__select" onChange={(event) => setLocale(event.target.value)} value={locale}>
          <option value="">All locales</option>
          {locales.map((each) => <option key={each} value={each}>{each.toUpperCase()}</option>)}
        </select>
        <Button buttonStyle="primary" disabled={Boolean(pending)} onClick={queue} size="small">
          {pending === 'bulk' ? 'Queuing…' : 'Translate untranslated'}
        </Button>
      </div>
      {progress && (progress.pending > 0 || progress.failed > 0) && (
        <div className="tr__bulk-progress">
          {progress.pending > 0 && <span className="tr__pill" data-tone="warn">{progress.pending} queued{progress.running ? `, ${progress.running} running` : ''}</span>}
          {progress.failed > 0 && <span className="tr__pill" data-tone="bad">{progress.failed} failed today</span>}
          {progress.pending > 0 && (
            <Button buttonStyle="secondary" disabled={Boolean(pending)} onClick={runNow} size="small">
              {pending === 'run' ? 'Running…' : 'Run a batch now'}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
