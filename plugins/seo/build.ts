#!/usr/bin/env bun
/**
 * Build script for @justanarthur/payload-plugin-seo
 *
 * Steps:
 *   1. Clean dist/
 *   2. Per-file transpile src/**\/*.{ts,tsx} -> dist/ with Bun.Transpiler
 *      (library mode — keep imports as-is, do not bundle)
 *   3. Copy non-JS assets (scss, json, css, ...) preserving directory structure
 *   4. Generate .d.ts type declarations with tsc --emitDeclarationOnly
 *
 * Why Transpiler and not Bun.build?
 *   Bun.build is a bundler; it lifts `export { X } from 'Y'` into a single
 *   `export { X }` block without the from-clause, which breaks named re-exports.
 *   Bun.Transpiler is a 1:1 transpiler — it preserves every import/export
 *   exactly as written, which is what a library author needs.
 *
 * Usage:
 *   bun run build.ts          # full build
 *   bun run build.ts --clean  # only delete dist/
 */

import { rm, mkdir, copyFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { readFile } from 'node:fs/promises'

const SRC = 'src'
const OUT = 'dist'

const ASSET_EXTENSIONS = [
  'html',
  'css',
  'scss',
  'sass',
  'ttf',
  'woff',
  'woff2',
  'eot',
  'svg',
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'json',
  'md',
] as const

const log = (msg: string) => console.log(`\x1b[36m[build]\x1b[0m ${msg}`)
const ok = (msg: string) => console.log(`\x1b[32m[build]\x1b[0m ${msg}`)
const err = (msg: string) => console.error(`\x1b[31m[build]\x1b[0m ${msg}`)

const cleanOnly = process.argv.includes('--clean')

// One Transpiler per loader — Bun caches these.
const tsTranspiler = new Bun.Transpiler({
  loader: 'ts',
  target: 'node',
  tsconfig: { compilerOptions: { jsx: 'react-jsx' } },
})
const tsxTranspiler = new Bun.Transpiler({
  loader: 'tsx',
  target: 'node',
  tsconfig: { compilerOptions: { jsx: 'react-jsx' } },
})

function transpilerFor(file: string) {
  return file.endsWith('.tsx') ? tsxTranspiler : tsTranspiler
}

// ---------- 1. Clean ----------
log(`cleaning ${OUT}/`)
await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })

if (cleanOnly) {
  ok('cleaned')
  process.exit(0)
}

// ---------- 2. Per-file transpile ----------
log('collecting TS/TSX entrypoints')
const tsGlob = new Bun.Glob('**/*.{ts,tsx}')
const entrypoints: string[] = []
for await (const file of tsGlob.scan({ cwd: SRC, followSymlinks: false })) {
  entrypoints.push(join(SRC, file))
}

if (entrypoints.length === 0) {
  err(`no .ts/.tsx files found in ${SRC}/`)
  process.exit(1)
}

log(`transpiling ${entrypoints.length} files with Bun.Transpiler`)
let transpiled = 0
for (const srcPath of entrypoints) {
  const relPath = relative(SRC, srcPath) // e.g. "exports/client.ts"
  const destPath = join(OUT, relPath.replace(/\.tsx?$/, '.js'))
  const code = await readFile(srcPath, 'utf8')
  const result = transpilerFor(srcPath).transformSync(code)
  await mkdir(dirname(destPath), { recursive: true })
  await Bun.write(destPath, result)
  transpiled++
}
ok(`transpiled ${transpiled} files`)

// ---------- 3. Copy static assets ----------
log('copying static assets')
const assetGlob = new Bun.Glob(`**/*.{${ASSET_EXTENSIONS.join(',')}}`)
let copied = 0
for await (const file of assetGlob.scan({ cwd: SRC, followSymlinks: false })) {
  const srcPath = join(SRC, file)
  const destPath = join(OUT, file)
  await mkdir(dirname(destPath), { recursive: true })
  await copyFile(srcPath, destPath)
  copied++
}
ok(`copied ${copied} asset files`)

// ---------- 4. Generate .d.ts type declarations ----------
log('generating .d.ts type declarations')
const tsc = Bun.spawn(['tsc', '--emitDeclarationOnly', '--outDir', OUT], {
  stdio: ['inherit', 'inherit', 'inherit'],
  cwd: process.cwd(),
})

const exitCode = await tsc.exited
if (exitCode !== 0) {
  err(`tsc exited with code ${exitCode}`)
  process.exit(exitCode)
}

ok(`built ${OUT}/`)
