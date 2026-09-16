import { chunkArray } from '../utils/chunkArray'
import type { TranslateResolver } from './types'

export type OpenAIPrompt = (args: {
  localeFrom: string
  localeTo: string
  texts: string[]
}) => string

export type OpenAIResolverConfig = {
  apiKey: string
  baseUrl?: string

  chunkLength?: number

  /** chunks sent at the same time */
  concurrency?: number

  model?: string
  prompt?: OpenAIPrompt
}

type OpenAIResponse = {
  choices: {
    finish_reason?: string
    message: {
      content: string
    }
  }[]
}

const LOCALE_DISPLAY_NAME: Record<string, string> = {
  en: 'English',
  sk: 'Slovak',
  cs: 'Czech',
  de: 'German',
  uk: 'Ukrainian',
  ua: 'Ukrainian',
  pl: 'Polish',
  hu: 'Hungarian',
  fr: 'French',
  es: 'Spanish',
  it: 'Italian',
  pt: 'Portuguese',
  nl: 'Dutch',
  ro: 'Romanian'
}

const RETRY_DELAYS_MS = [500, 1000, 2000] as const

const defaultPrompt: OpenAIPrompt = ({ localeFrom, localeTo, texts }) => {
  const from = LOCALE_DISPLAY_NAME[localeFrom] ?? localeFrom
  const to = LOCALE_DISPLAY_NAME[localeTo] ?? localeTo
  const input = Object.fromEntries(texts.map((text, index) => [String(index), text]))

  return `You are a machine-translation engine for website copy. Translate every value in the input JSON object from ${from} (${localeFrom}) to ${to} (${localeTo}).

Rules:
1. Output a JSON object with exactly the same keys as the input. One key, one translated value. Never merge, split, drop or add keys.
2. Keep placeholders in curly braces (for example {address} or {count, plural, ...}) exactly as they are; translate only the words around them.
3. URLs, email addresses, product and brand names, code, hex strings and other opaque identifiers: keep as-is.
4. Keep leading and trailing whitespace of each value.
5. Apply locale-specific formatting for dates, currency and decimal separators in human-readable text.
6. Return only the JSON object. No markdown fences, no prose.

INPUT:
${JSON.stringify(input)}`
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const isRetryableStatus = (status: number) => status === 429 || status >= 500

const isGpt5Family = (model: string) => /^gpt-5/.test(model)
const isGpt54Plus = (model: string) => /^gpt-5\.[1-9]/.test(model)
const usesMaxCompletionTokens = (model: string) =>
  isGpt5Family(model) || /^o[1-9]/.test(model)

// gpt-5.4+ family does hidden reasoning even with reasoning_effort=none when
// max_completion_tokens is set (verified on gpt-5.4-mini). Give it room for
// reasoning + output, or the visible content gets truncated to null.
const deriveMaxTokens = (chunkLength: number, model?: string) => {
  const base = Math.max(chunkLength * 100, 4000)
  if (model && isGpt54Plus(model)) return Math.max(base * 4, 16000)
  return base
}

type ParseResult =
  | { ok: true; translated: string[]; fenceStripped: boolean }
  | { ok: false; error: string; fenceStripped: boolean }

const parseContent = (raw: string, expected: number): ParseResult => {
  const trimmed = raw.trim()
  const m = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/)
  const candidate = m ? m[1].trim() : trimmed
  const fenceStripped = m !== null

  let parsed: unknown
  try {
    parsed = JSON.parse(candidate)
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : String(e),
      fenceStripped,
      ok: false
    }
  }

  // keyed object from the default prompt, or a plain array from a custom one
  const values = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object'
      ? Array.from({ length: expected }, (_, index) => (parsed as Record<string, unknown>)[String(index)])
      : null

  if (!values) return { error: 'parsed value is neither an object nor an array', fenceStripped, ok: false }

  if (values.length !== expected) {
    return { error: `expected ${expected} value(s), got ${values.length}`, fenceStripped, ok: false }
  }

  if (!values.every((v) => typeof v === 'string')) {
    return { error: 'missing key or non-string value', fenceStripped, ok: false }
  }

  return { fenceStripped, ok: true, translated: values as string[] }
}

/** runs `task` over `items` with at most `limit` in flight, keeping order */
const mapLimit = async <T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> => {
  const results = new Array<R>(items.length)
  let next = 0

  const worker = async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await task(items[index])
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker))
  return results
}

type ChunkResult =
  | { kind: 'ok'; translated: string[] }
  | { kind: 'truncated' }
  | { kind: 'failed' }

export const openAIResolver = ({
                                 apiKey,
                                 baseUrl,
                                 chunkLength = 100,
                                 concurrency = 3,
                                 model = 'gpt-4o-mini',
                                 prompt = defaultPrompt
                               }: OpenAIResolverConfig): TranslateResolver => {
  return {
    key: 'openai',
    resolve: async ({ localeFrom, localeTo, req, texts }) => {
      const apiUrl = `${baseUrl || 'https://api.openai.com'}/v1/chat/completions`
      const maxTokens = deriveMaxTokens(chunkLength, model)
      const maxTokensKey = usesMaxCompletionTokens(model) ? 'max_completion_tokens' : 'max_tokens'
      const supportsCustomTemperature = !isGpt5Family(model)
      // explicit low reasoning — keeps gpt-5.4+ from burning the max_completion_tokens
      // budget on hidden reasoning before producing visible content
      const reasoningEffort = isGpt54Plus(model) ? 'low' : undefined
      const logger = req.payload.logger

      const requestChunk = async (chunk: string[]): Promise<ChunkResult> => {
        for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
          let shouldRetry = false
          let httpStatus = 0

          try {
            const res = await fetch(apiUrl, {
              body: JSON.stringify({
                messages: [
                  {
                    content: prompt({ localeFrom, localeTo, texts: chunk }),
                    role: 'user'
                  }
                ],
                model,
                response_format: { type: 'json_object' },
                ...(supportsCustomTemperature ? { temperature: 0 } : {}),
                ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
                [maxTokensKey]: maxTokens
              }),
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              method: 'post'
            })

            httpStatus = res.status
            const data = (await res.json()) as OpenAIResponse

            if (res.ok) {
              const choice = data?.choices?.[0]

              if (choice?.finish_reason === 'length') {
                logger.warn({
                  code: 'OPENAI_TRUNCATED',
                  message: `OpenAI output hit the token limit for ${chunk.length} value(s)`
                })
                return { kind: 'truncated' }
              }

              const content = choice?.message?.content
              if (!content) {
                logger.error({
                  code: 'OPENAI_BAD_JSON',
                  message: 'OpenAI response missing content',
                  openAIResponse: data
                })
                shouldRetry = true
              } else {
                const result = parseContent(content, chunk.length)
                if (result.ok) {
                  if (result.fenceStripped) {
                    logger.info({
                      code: 'OPENAI_FENCE_STRIPPED',
                      message: 'OpenAI returned fenced JSON despite json_object mode'
                    })
                  }
                  return { kind: 'ok', translated: result.translated }
                }
                logger.error({
                  code: 'OPENAI_BAD_JSON',
                  error: result.error,
                  fenceStripped: result.fenceStripped,
                  message: 'Failed to parse OpenAI response'
                })
                shouldRetry = true
              }
            } else {
              logger.error({
                code: 'OPENAI_HTTP_ERROR',
                message: 'OpenAI returned non-2xx status',
                openAIResponse: data,
                status: httpStatus
              })
              if (isRetryableStatus(httpStatus)) shouldRetry = true
            }
          } catch (e) {
            logger.error({
              code: 'OPENAI_NETWORK_ERROR',
              message: 'OpenAI request threw',
              originalErr: e instanceof Error ? e.message : String(e)
            })
            shouldRetry = true
          }

          if (attempt < RETRY_DELAYS_MS.length && shouldRetry) {
            logger.info({
              attempt: attempt + 1,
              code: 'OPENAI_RETRY',
              message: 'Retrying OpenAI request after backoff',
              nextBackoffMs: RETRY_DELAYS_MS[attempt],
              status: httpStatus
            })
            await sleep(RETRY_DELAYS_MS[attempt])
            continue
          }

          break
        }

        logger.error({
          code: 'OPENAI_GIVE_UP',
          message: 'OpenAI chunk failed after retries'
        })
        return { kind: 'failed' }
      }

      // a truncated answer is retried as two smaller requests instead of the same one again
      const translateChunk = async (chunk: string[]): Promise<string[] | null> => {
        const result = await requestChunk(chunk)

        if (result.kind === 'ok') return result.translated
        if (result.kind === 'failed' || chunk.length === 1) return null

        const half = Math.ceil(chunk.length / 2)
        const left = await translateChunk(chunk.slice(0, half))
        if (!left) return null
        const right = await translateChunk(chunk.slice(half))
        return right ? [...left, ...right] : null
      }

      try {
        const response = await mapLimit(chunkArray(texts, chunkLength), concurrency, translateChunk)

        const translated: string[] = []
        for (const result of response) {
          if (!result) return { success: false as const }
          translated.push(...result)
        }

        return {
          success: true as const,
          translatedTexts: translated
        }
      } catch (e) {
        logger.error({
          code: 'OPENAI_UNEXPECTED',
          message: 'OpenAI resolve threw an unexpected error',
          originalErr: e instanceof Error ? e.message : String(e)
        })
        return { success: false as const }
      }
    }
  }
}
