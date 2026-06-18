'use client'

import { useRouter } from 'next/navigation'
import { useState, type FC } from 'react'

export type AdminBarLabels = {
  /** Trigger button label (when popover is closed). */
  trigger?: string
  /** Exit-preview link label. */
  exitPreview?: string
  /** Tooltip / a11y description for the trigger button. */
  triggerHint?: string
}

export type AdminBarProps = {
  /**
   * Whether draft mode is currently active. When `false`, the
   * component renders `null` — zero DOM cost in production.
   */
  preview: boolean
  /**
   * Path to navigate to when the host clicks "Exit preview". Defaults
   * to `/next/exit-preview` (matches Payload's standard handler).
   */
  exitPreviewPath?: string
  /**
   * Per-label overrides for i18n hosts. Defaults are English.
   */
  labels?: AdminBarLabels
}

const defaultLabels: Required<AdminBarLabels> = {
  trigger: 'Preview',
  exitPreview: 'Exit preview',
  triggerHint: 'Open draft-mode admin bar'
}

/**
 * Next.js App Router–style draft-mode admin bar. Renders only when
 * `preview` is true; shows a small floating button in the bottom-right
 * that opens a native `<dialog>` popover with an "Exit preview" link.
 *
 * Mirrors `LivePreviewListener` as a self-contained `'use client'`
 * component the host drops into the layout's providers tree. No
 * dependency on `@payloadcms/admin-bar` — pure React + a few
 * Tailwind-free inline styles so hosts can theme freely.
 */
export const AdminBar: FC<AdminBarProps> = ({ preview, exitPreviewPath = '/next/exit-preview', labels }) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const merged = { ...defaultLabels, ...labels }

  if (!preview) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={merged.triggerHint}
        style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 2147483647,
          padding: '8px 14px',
          borderRadius: 9999,
          border: '1px solid rgba(0,0,0,0.12)',
          background: '#111',
          color: '#fff',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)'
        }}
      >
        {merged.trigger}
      </button>
      <dialog
        open={open}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          // Close when the user clicks the backdrop (outside the panel)
          if (e.target === e.currentTarget) setOpen(false)
        }}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          maxWidth: '100vw',
          maxHeight: '100vh',
          margin: 0,
          padding: 0,
          border: 'none',
          background: 'rgba(0,0,0,0.32)',
          zIndex: 2147483647
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            right: 24,
            minWidth: 220,
            padding: 16,
            borderRadius: 8,
            background: '#fff',
            color: '#111',
            boxShadow: '0 12px 36px rgba(0,0,0,0.24)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{merged.trigger}</div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
            Draft mode is on. Edits in Payload will refresh this view automatically.
          </div>
          <a
            href={exitPreviewPath}
            onClick={() => router.refresh()}
            style={{
              display: 'inline-block',
              padding: '6px 10px',
              borderRadius: 6,
              background: '#111',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            {merged.exitPreview}
          </a>
        </div>
      </dialog>
    </>
  )
}
