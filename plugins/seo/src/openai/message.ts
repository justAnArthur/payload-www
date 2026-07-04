import OpenAI from 'openai'
import type { PayloadRequest } from 'payload'

import type { SEOMeta } from '../types'

let openai: OpenAI


export const openaiMessage = async ({
                                      apiKey,
                                      content,
                                      req
                                    }: {
  apiKey: string
  content: string
  req: PayloadRequest
}): Promise<Partial<SEOMeta>> => {
  try {
    if (!openai) {
      openai = new OpenAI({ apiKey })
    }

    const systemPrompt = [
      'You are an SEO assistant. Given the following Payload CMS entity (collection document or global),',
      'produce a JSON object with SEO meta fields. Return ONLY valid JSON, no commentary.',
      'Include the keys you can confidently fill: title (50-60 chars), description (100-150 chars),',
      'keywords (comma-separated), and any of ogTitle/ogDescription/twitterTitle/twitterDescription',
      'that are warranted. Use the same language as the source content.'
    ].join(' ')

    const response = await openai.chat.completions.create({
      messages: [
        { content: systemPrompt, role: 'system' },
        { content, role: 'user' }
      ],
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0.4
    })

    const text = response.choices[0]?.message?.content ?? '{}'
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>
      return parsed as Partial<SEOMeta>
    } catch {
      return {}
    }
  } catch (error) {
    if (error instanceof Error) req.payload.logger.error(error.message)
    return {}
  }
}
