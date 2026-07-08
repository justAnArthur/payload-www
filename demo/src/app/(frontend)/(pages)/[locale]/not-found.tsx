import Link from 'next/link'

export default function NotFound() {
  return (
    <section className="container py-28">
      <h1 style={{ marginBottom: 0 }}>404</h1>
      <p className="mb-4">This page could not be found.</p>
      <Link className="underline" href="/">
        Go home
      </Link>
    </section>
  )
}