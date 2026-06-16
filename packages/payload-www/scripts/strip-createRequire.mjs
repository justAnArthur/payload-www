// strip-createRequire.mjs
// Bunup always emits a `createRequire('node:module')` shim at the top of every
// entry, even when the source has no `require` / `process` references. There's
// no opt-out. The shim is dead weight in a pure-ESM browser-safe lib, and it
// breaks the host's client bundle (Next.js can't resolve `node:module` in the
// browser).
//
// Run as a postbuild step. Walks dist/*.js, removes:
//   - the import line: `import { createRequire } from "node:module";`
//   - the assignment line: `var __require = /* @__PURE__ */ createRequire(import.meta.url);`
//
// If __require is referenced anywhere in the file but the assignment is gone,
// the file would crash at runtime — that's a signal that some node-builtin
// wasn't externalized in bunup.config.ts (NOT what this script should paper
// over). We log a warning and leave the assignment in place in that case.

import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const DIST_DIR = 'dist'

const IMPORT_RE = /^\s*import\s*\{\s*createRequire\s*\}\s*from\s*["']node:module["']\s*;?\s*$/m
const ASSIGN_RE = /^var __require = \/\* @__PURE__ \*\/ createRequire\(import\.meta\.url\);\s*$/m

let stripped = 0
let warned = 0

const files = await readdir(DIST_DIR)
const jsFiles = files.filter((f) => f.endsWith('.js'))

for (const file of jsFiles) {
  const path = join(DIST_DIR, file)
  const src = await readFile(path, 'utf8')

  if (!IMPORT_RE.test(src) && !ASSIGN_RE.test(src)) continue

  const hadImport = IMPORT_RE.test(src)
  const hadAssign = ASSIGN_RE.test(src)

  let next = src.replace(IMPORT_RE, '').replace(ASSIGN_RE, '')

  if (hadAssign) {
    next = next.replace(/\n{3,}/g, '\n\n')
  }

  if (/\b__require\b/.test(next)) {
    console.warn(`[strip-createRequire] ${file}: __require still referenced after strip — leaving shim in place. Check external list in bunup.config.ts.`)
    warned++
    continue
  }

  await writeFile(path, next)
  stripped++
  const removed = [hadImport && 'import', hadAssign && 'assign'].filter(Boolean).join('+')
  console.log(`[strip-createRequire] ${file}: removed ${removed}`)
}

console.log(`[strip-createRequire] done — stripped ${stripped} file(s), warned ${warned}`)
