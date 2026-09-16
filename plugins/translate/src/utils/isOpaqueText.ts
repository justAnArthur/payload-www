/** values a translator must not touch: urls, paths, anchors, emails, and strings without letters */
export const isOpaqueText = (value: string): boolean => {
  const text = value.trim()

  return (
    /^([a-z][a-z0-9+.-]*:|\/\/|\/|#|www\.)/i.test(text) ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ||
    !/\p{L}/u.test(text)
  )
}
