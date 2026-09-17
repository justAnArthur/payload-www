'use client'

import { Button, toast, useConfig } from '@payloadcms/ui'
import { useState } from 'react'

type Action = 'mark-reviewed' | 'translate-all' | 'translate-missing'

export const ReviewActions = ({ entity, locale, reviewed }: { entity: string; locale: string; reviewed: boolean }) => {
  const { config: { routes: { api }, serverURL } } = useConfig()
  const [pending, setPending] = useState<Action | null>(null)

  const run = async (action: Action) => {
    if (action === 'translate-all' && !window.confirm(`Re-translate every field in ${locale}? Existing ${locale} copy is replaced.`))
      return

    setPending(action)

    try {
      const path = action === 'mark-reviewed' ? 'mark-reviewed' : 'translate'
      const res = await fetch(`${serverURL ?? ''}${api}/translator/review/${path}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity, locale, mode: action === 'translate-all' ? 'all' : 'missing' })
      })
      const result = await res.json().catch(() => ({}))

      if (!res.ok || !result.success) throw new Error(result?.errors?.[0]?.message ?? 'request failed')

      toast.success(action === 'mark-reviewed' ? `${locale} marked as reviewed` : `${locale} translated`)
      // the view is server rendered; reload to recompute coverage
      window.location.reload()
    } catch (error) {
      toast.error(`Could not ${action.replace('-', ' ')}: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="translator-review__actions">
      <Button buttonStyle="primary" disabled={Boolean(pending)} onClick={() => run('translate-missing')} size="small">
        {pending === 'translate-missing' ? 'Translating…' : 'Translate missing fields'}
      </Button>
      <Button buttonStyle="secondary" disabled={Boolean(pending)} onClick={() => run('translate-all')} size="small">
        {pending === 'translate-all' ? 'Translating…' : 'Re-translate all'}
      </Button>
      <Button buttonStyle="secondary" disabled={Boolean(pending) || reviewed} onClick={() => run('mark-reviewed')} size="small">
        {reviewed ? 'Reviewed' : 'Mark reviewed'}
      </Button>
    </div>
  )
}
