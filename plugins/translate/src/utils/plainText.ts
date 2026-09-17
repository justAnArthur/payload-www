/** visible text of a field value; rich text nodes are joined, json and blocks are ignored */
export const plainText = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return ''
  if (Array.isArray(value)) return value.map(plainText).filter(Boolean).join(' ')

  const node = value as Record<string, unknown>
  if (typeof node.text === 'string') return node.text
  if ('root' in node) return plainText(node.root)
  if (Array.isArray(node.children)) return node.children.map(plainText).filter(Boolean).join(node.type === 'root' ? '\n' : '')

  return ''
}
