import type { Access } from 'payload'

export const anyone: Access = () => {
  console.log('[WWW] core/access:anyone -> true')
  return true
}

export const authenticated: Access = ({ req: { user } }) => {
  const result = Boolean(user)
  console.log('[WWW] core/access:authenticated ->', result)
  return result
}

export const authenticatedOrPublished: Access = ({ req: { user } }) => {
  if (user) {
    console.log('[WWW] core/access:authenticatedOrPublished -> true (authenticated)')
    return true
  }
  console.log('[WWW] core/access:authenticatedOrPublished -> { _status: { equals: "published" } }')
  return { _status: { equals: 'published' } }
}
