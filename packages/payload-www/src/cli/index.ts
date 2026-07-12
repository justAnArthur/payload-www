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
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    configPath: '',
    output: '',
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
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

  if (!args.configPath || !args.output) {
    console.error('[payload-www] --config-path and --output are required.')
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
  }

  await generateAsyncImportmap(config as Config, {
    output: path.isAbsolute(args.output) ? args.output : path.resolve(cwd, args.output),
    ...(args.packageName ? { packageName: args.packageName } : {}),
  })
}

main().catch((err) => {
  console.error('[payload-www] unhandled error:')
  console.error(err)
  process.exit(1)
})