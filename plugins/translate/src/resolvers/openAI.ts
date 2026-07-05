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

  model?: string
  prompt?: OpenAIPrompt
}

type OpenAIResponse = {
  choices: {
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
  return `You are a machine-translation engine. Translate each string in the input JSON array from ${from} (${localeFrom}) to ${to} (${localeTo}).

Rules:
1. The output must be a valid JSON array of strings.
2. The output array must have the same length and order as the input.
3. Preserve URLs, email addresses, and other non-translatable tokens as-is.
4. Apply locale-specific formatting for the target locale (dates, currency, decimal separators).
5. Return only the JSON array. No markdown fences, no prose, no trailing commentary.

INPUT:
${JSON.stringify(texts)}`
}

const stripJsonFences = (s: string): string => {
  const trimmed = s.trim()
  const m = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/)
  return m ? m[1].trim() : trimmed
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const isRetryableStatus = (status: number) => status === 429 || status >= 500

const deriveMaxTokens = (chunkLength: number) => Math.max(chunkLength * 100, 4000)

type ParseResult =
  | { ok: true; translated: string[]; fenceStripped: boolean }
  | { ok: false; error: string; fenceStripped: boolean }

const parseContent = (raw: string): ParseResult => {
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

  if (!Array.isArray(parsed)) {
    return { error: 'parsed value is not an array', fenceStripped, ok: false }
  }

  if (!parsed.every((v) => typeof v === 'string')) {
    return { error: 'array contains non-string element', fenceStripped, ok: false }
  }

  return { fenceStripped, ok: true, translated: parsed as string[] }
}

export const openAIResolver = ({
                                 apiKey,
                                 baseUrl,
                                 chunkLength = 100,
                                 model = 'gpt-4o-mini',
                                 prompt = defaultPrompt
                               }: OpenAIResolverConfig): TranslateResolver => {
  return {
    key: 'openai',
    resolve: async ({ localeFrom, localeTo, req, texts }) => {
      const apiUrl = `${baseUrl || 'https://api.openai.com'}/v1/chat/completions`
      const maxTokens = deriveMaxTokens(chunkLength)
      const logger = req.payload.logger

      try {
        const response = await Promise.all(
          chunkArray(texts, chunkLength).map(async (chunk) => {
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
                    temperature: 0,
                    max_tokens: maxTokens
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
                  const content = data?.choices?.[0]?.message?.content
                  if (!content) {
                    logger.error({
                      code: 'OPENAI_BAD_JSON',
                      message: 'OpenAI response missing content',
                      openAIResponse: data
                    })
                    shouldRetry = true
                  } else {
                    const result = parseContent(content)
                    if (result.ok) {
                      if (result.fenceStripped) {
                        logger.info({
                          code: 'OPENAI_FENCE_STRIPPED',
                          message: 'OpenAI returned fenced JSON despite json_object mode'
                        })
                      }
                      return { success: true as const, translated: result.translated }
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

              logger.error({
                code: 'OPENAI_GIVE_UP',
                message: 'OpenAI chunk failed after retries',
                status: httpStatus
              })
              return { success: false as const }
            }

            return { success: false as const }
          })
        )

        const translated: string[] = []
        for (const result of response) {
          if (!result.success) return { success: false as const }
          translated.push(...result.translated)
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