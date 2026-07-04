import { chunkArray } from '../utils/chunkArray'
import type { TranslateResolver } from './types'

export type OpenAIMessageExchange = Record<string | number, string>

export type OpenAIPrompt = (args: {
  localeFrom: string
  localeTo: string
  texts: OpenAIMessageExchange
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

const defaultPrompt: OpenAIPrompt = ({ localeFrom, localeTo, texts }) => {
  return `You are a machine translation service. Your task is to translate values in a strict JSON of key value pairs from ${localeFrom} to ${localeTo}.

**INSTRUCTIONS:**
1.  **Translate each value**.
2.  The output **must valid JSON**.
3.  The output array **must have the exact same number of elements** as the input.
4.  Preserve the structure of the JSON array.
5.  Preserve JSON keys without translation.
6.  The **order of the elements must not change**.
7.  **Do not include any text, explanations, or remarks outside of the JSON array.**
8.  **Preserve any special characters, HTML tags, or formatting** present in the original strings.
9.  **Preserve urls, hrefs, and email addresses** without translation.
10. RETURN ONLY THE RAW JSON, DO NOT RESPOND WITH ANYTHING ELSE, AND NO FORMATTING.

**INPUT JSON TO TRANSLATE:**
${JSON.stringify(texts)}`
}

export const openAIResolver = ({
                                 apiKey,
                                 baseUrl,
                                 chunkLength = 100,
                                 model = 'gpt-3.5-turbo',
                                 prompt = defaultPrompt
                               }: OpenAIResolverConfig): TranslateResolver => {
  return {
    key: 'openai',
    resolve: async ({ localeFrom, localeTo, req, texts }) => {
      const apiUrl = `${baseUrl || 'https://api.openai.com'}/v1/chat/completions`

      try {
        const response: {
          data: OpenAIResponse
          success: boolean
        }[] = await Promise.all(
          chunkArray(texts, chunkLength).map((texts) => {
            const structuredTexts = texts.reduce((acc, curr, index) => {
              acc[index + 1] = curr
              return acc
            }, {} as Record<number, string>)

            return fetch(apiUrl, {
              body: JSON.stringify({
                messages: [
                  {
                    content: prompt({ localeFrom, localeTo, texts: structuredTexts }),
                    role: 'user'
                  }
                ],
                model
              }),
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              method: 'post'
            }).then(async (res) => {
              const data = await res.json()

              if (!res.ok)
                req.payload.logger.info({
                  message: 'An error occurred when trying to translate the data using OpenAI API',
                  openAIresponse: data
                })

              return {
                data,
                success: res.ok
              }
            })
          })
        )

        const translated: string[] = []

        for (const { data, success } of response) {
          if (!success)
            return {
              success: false as const
            }

          const content = data?.choices?.[0]?.message?.content

          if (!content) {
            req.payload.logger.error(
              'An error occurred when trying to translate the data using OpenAI API - missing content in the response'
            )

            return {
              success: false as const
            }
          }

          const translatedStructuredTexts: OpenAIMessageExchange = JSON.parse(content)

          const translatedChunk: string[] = Object.values(translatedStructuredTexts)

          if (!Array.isArray(translatedChunk)) {
            req.payload.logger.error({
              data: translatedChunk,
              fullContent: content,
              message:
                'An error occurred when trying to translate the data using OpenAI API - parsed content is not an array'
            })

            return {
              success: false as const
            }
          }

          for (const text of translatedChunk) {
            if (text && typeof text !== 'string') {
              req.payload.logger.error({
                chunkData: translatedChunk,
                data: text,
                fullContent: content,
                message:
                  'An error occurred when trying to translate the data using OpenAI API - parsed content is not a string'
              })

              return {
                success: false as const
              }
            }

            translated.push(text)
          }
        }

        return {
          success: true as const,
          translatedTexts: translated
        }
      } catch (e) {
        if (e instanceof Error) {
          req.payload.logger.info({
            message: 'An error occurred when trying to translate the data using OpenAI API',
            originalErr: e.message
          })
        }

        return { success: false as const }
      }
    }
  }
}
