export function generateImportName(type: 'block' | 'page', slug: string) {
  switch (type) {
    case 'block': {
      const name = `Block${slug.replace(/(^\w|-\w)/g, (m) => m.replace('-', '').toUpperCase())}#default`
      console.log('[WWW] core/utils:generateImportName type=block slug=', slug, '->', name)
      return name
    }
    case 'page': {
      const name = `Page${slug.replace(/(^\w|-\w)/g, (m) => m.replace('-', '').toUpperCase())}#default`
      console.log('[WWW] core/utils:generateImportName type=page slug=', slug, '->', name)
      return name
    }
    default:
      console.error('[WWW] core/utils:generateImportName unknown type:', type)
      throw new Error(`Unknown type: ${type}`)
  }
}
