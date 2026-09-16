import { isEmpty } from './isEmpty'

/** true when a value carries visible text; an empty lexical root or blank string does not */
export const hasText = (value: unknown): boolean => {
  if (typeof value === 'string') return value.trim().length > 0
  if (isEmpty(value)) return false
  if (Array.isArray(value)) return value.some(hasText)

  if (typeof value === 'object') {
    const node = value as Record<string, unknown>
    if (typeof node.text === 'string' && node.text.trim()) return true
    if ('root' in node) return hasText(node.root)
    if (Array.isArray(node.children)) return node.children.some(hasText)
    if (node.type === 'block' || node.type === 'inlineBlock' || node.type === 'upload') return true

    return !('children' in node) && Object.values(node).some(hasText)
  }

  return value !== null && value !== undefined
}
