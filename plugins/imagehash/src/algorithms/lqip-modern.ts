import lqipModern from 'lqip-modern'
import { z } from 'zod'

export const LqipModernOptionsSchema = z
  .object({
    
    outputFormat: z.enum(['webp', 'jpeg', 'jpg']).optional(),

    
    outputOptions: z.record(z.unknown()).optional(),

    
    resize: z.union([z.number(), z.array(z.number())]).optional(),

    
    concurrency: z.number().optional()
  })
  .strict()

export type LqipModernOptions = z.infer<typeof LqipModernOptionsSchema>;

export const imageToLqipModern = async (
  data: Buffer,
  options: LqipModernOptions
) => {
  const result = await lqipModern(data, options)

  
  
  
  
  
  return ({
    hash: JSON.stringify(result.metadata),
    dataUrl: result.metadata.dataURIBase64
  })
}
