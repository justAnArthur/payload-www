'use client'

import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <section className="container py-28">
      <h1 style={{ marginBottom: 0 }}>500</h1>
      <p className="mb-4">Something went wrong.</p>
      <button type="button" onClick={reset} className="underline">
        Try again
      </button>
    </section>
  )
}