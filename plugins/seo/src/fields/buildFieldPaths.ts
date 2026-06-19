import type { Field, Tab } from 'payload'

/**
 * Walks a tabs structure and returns a flat map of `fieldName → tabQualifiedPath`
 * (relative to the parent group, e.g. `content.title`, `social.social.ogTitle`).
 *
 * Rules:
 *  - Named tabs prefix everything inside with `tabName.`
 *  - Group fields inside a tab further prefix with `groupName.`
 *  - UI fields (no data) are skipped.
 *
 * This is intentionally kept simple — it handles one level of nesting (tab → optional
 * group → fields), which covers the full MetaField structure.
 */
export const buildFieldPaths = (tabs: Tab[]): Record<string, string> => {
  const map: Record<string, string> = {}

  for (const tab of tabs) {
    const tabName = (tab as { name?: string }).name
    if (!tabName) continue

    for (const field of tab.fields ?? []) {
      const f = field as { name?: string; type?: string; fields?: Field[] }
      if (!f.name || f.type === 'ui') continue

      if (f.type === 'group' && Array.isArray(f.fields)) {
        // Nested group: path = tabName.groupName.fieldName
        for (const sub of f.fields) {
          const s = sub as { name?: string; type?: string }
          if (s.name && s.type !== 'ui') {
            map[s.name] = `${tabName}.${f.name}.${s.name}`
          }
        }
      } else {
        // Direct field in tab: path = tabName.fieldName
        map[f.name] = `${tabName}.${f.name}`
      }
    }
  }

  return map
}
