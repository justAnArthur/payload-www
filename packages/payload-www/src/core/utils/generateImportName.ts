export function generateImportName(type: 'block' | 'page', slug: string) {
  switch (type) {
    case 'block':
      return `Block${slug.replace(/(^\w|-\w)/g, (m) => m.replace('-', '').toUpperCase())}#default`
    case 'page':
      return `Page${slug.replace(/(^\w|-\w)/g, (m) => m.replace('-', '').toUpperCase())}#default`
    default:
      throw new Error(`Unknown type: ${type}`)
  }
}
