import type { Field, Tab } from 'payload'


export const buildFieldPaths = (tabs: Tab[]): Record<string, string> => {
  const map: Record<string, string> = {}

  for (const tab of tabs) {
    const tabName = (tab as { name?: string }).name
    if (!tabName) continue

    for (const field of tab.fields ?? []) {
      const f = field as { name?: string; type?: string; fields?: Field[] }
      if (!f.name || f.type === 'ui') continue

      if (f.type === 'group' && Array.isArray(f.fields)) {
        
        for (const sub of f.fields) {
          const s = sub as { name?: string; type?: string }
          if (s.name && s.type !== 'ui') {
            map[s.name] = `${tabName}.${f.name}.${s.name}`
          }
        }
      } else {
        
        map[f.name] = `${tabName}.${f.name}`
      }
    }
  }

  return map
}
