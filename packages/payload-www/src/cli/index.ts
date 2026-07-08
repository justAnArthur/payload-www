#!/usr/bin/env node
import { register } from 'tsx/esm/api'
import path from 'node:path'
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import type { Config } from 'payload'
import { generateAsyncImportmap } from './generateAsyncImportmap.js'

register()

type Args = {
  configPath: string
  output: string
  packageName?: string
  help: boolean
}

function printHelp(): void {
  console.log(`payload-www generate:async-importmap

Generate an async-importMap.ts containing only the render-path dependencies
(blocks + collection/global renderers) used by the public render path.

Usage:
  payload-www generate:async-importmap --config-path <path> --output <path>

Options:
  --config-path <path>   Path to the Payload config file (TS or JS).
                         Resolved relative to the current working directory.
  --output <path>        Output file path. Created if missing.
  --package-name <name>  Custom-package key for the render-dependency lookup.
                         Defaults to "@justanarthur/payload-www".
  --help, -h             Show this help.

Example:
  payload-www generate:async-importmap \\
    --config-path apps/www/payload.config.ts \\
    --output apps/www/app/\\(payload\\)/admin/asyncImportMap.ts
`)
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    configPath: '',
    output: '',
    help: false,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--help' || a === '-h') {
      args.help = true
      continue
    }
    if (a === '--config-path') {
      args.configPath = argv[++i] ?? ''
      continue
    }
    if (a === '--output') {
      args.output = argv[++i] ?? ''
      continue
    }
    if (a === '--package-name') {
      args.packageName = argv[++i] ?? ''
      continue
    }
    if (a?.startsWith('--config-path=')) {
      args.configPath = a.slice('--config-path='.length)
      continue
    }
    if (a?.startsWith('--output=')) {
      args.output = a.slice('--output='.length)
      continue
    }
    if (a?.startsWith('--package-name=')) {
      args.packageName = a.slice('--package-name='.length)
      continue
    }
  }
  return args
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  if (args.help) {
    printHelp()
    process.exit(0)
  }

  if (!args.configPath || !args.output) {
    console.error('[payload-www] --config-path and --output are required.\n')
    printHelp()
    process.exit(1)
  }

  const cwd = process.cwd()
  const absoluteConfigPath = path.isAbsolute(args.configPath)
    ? args.configPath
    : path.resolve(cwd, args.configPath)

  if (!existsSync(absoluteConfigPath)) {
    console.error(`[payload-www] config file not found: ${absoluteConfigPath}`)
    process.exit(1)
  }

  let configModule: { default?: unknown } & Record<string, unknown>
  try {
    configModule = (await import(pathToFileURL(absoluteConfigPath).href)) as typeof configModule
  } catch (err) {
    console.error(`[payload-www] failed to load config at ${absoluteConfigPath}:`)
    console.error(err)
    process.exit(1)
  }

  // `buildConfig` is async — the default export is a Promise. Await it.
  let config = configModule.default ?? configModule
  config = await config

  if (!config || typeof config !== 'object') {
    console.error('[payload-www] loaded config is empty or not an object.')
    process.exit(1)
  }

  if (process.env.PAYLOAD_WWW_DEBUG === '1') {
    const { writeFileSync } = await import('node:fs')
    writeFileSync('/tmp/payload-config-dump.json', JSON.stringify(config, (k, v) => typeof v === 'function' ? '[function]' : v, 2).slice(0, 200000))
    const cfg = config as unknown as { blocks?: unknown[]; collections?: unknown[]; globals?: unknown[] }
    console.error('[payload-www DEBUG] blocks:', cfg.blocks?.length ?? 0)
    console.error('[payload-www DEBUG] collections:', cfg.collections?.length ?? 0)
    console.error('[payload-www DEBUG] globals:', cfg.globals?.length ?? 0)
    console.error('[payload-www DEBUG] keys:', Object.keys(config).slice(0, 30).join(','))
    const firstBlock = (cfg.blocks?.[0] ?? null) as { slug?: string; custom?: unknown } | null
    if (firstBlock) {
      console.error('[payload-www DEBUG] first block slug:', firstBlock.slug)
      console.error('[payload-www DEBUG] first block custom:', JSON.stringify(firstBlock.custom))
    }
  }

  const result = await generateAsyncImportmap(config as Config, {
    output: path.isAbsolute(args.output) ? args.output : path.resolve(cwd, args.output),
    ...(args.packageName ? { packageName: args.packageName } : {}),
  })

  console.log(`[payload-www] wrote ${result.entries} entries to ${result.output}`)
}

main().catch((err) => {
  console.error('[payload-www] unhandled error:')
  console.error(err)
  process.exit(1)
})