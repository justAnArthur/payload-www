import lqipModern from 'lqip-modern'
import { z } from 'zod'

export const LqipModernOptionsSchema = z
  .object({
    /**
     * Output format: `'webp'` (default, smallest) or `'jpeg'`/`'jpg'`.
     */
    outputFormat: z.enum(['webp', 'jpeg', 'jpg']).optional(),

    /**
     * Options forwarded to `sharp.webp` or `sharp.jpeg` — quality, effort, etc.
     */
    outputOptions: z.record(z.unknown()).optional(),

    /**
     * `sharp.resize` args. Defaults to a max dimension of 16px.
     */
    resize: z.union([z.number(), z.array(z.number())]).optional(),

    /**
     * Concurrency for array inputs (single input always runs once).
     */
    concurrency: z.number().optional()
  })
  .strict()

export type LqipModernOptions = z.infer<typeof LqipModernOptionsSchema>;

export const imageToLqipModern = async (
  data: Buffer,
  options: LqipModernOptions
) => {
  const result = await lqipModern(data, options)

  // lqip-modern doesn't produce a "hash" in the cryptographic sense — it
  // produces a tiny placeholder image. The metadata describes the
  // placeholder (sizes, format) and is the natural thing to keep alongside
  // the data URL, so we serialize it into the *Hash field for parity with
  // the blurhash/thumbhash fields.
  return ({
    hash: JSON.stringify(result.metadata),
    dataUrl: result.metadata.dataURIBase64
  })
}
