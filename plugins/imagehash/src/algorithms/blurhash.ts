import sharp from 'sharp';
import { decode, encode } from 'blurhash';
import { z } from 'zod';

export const BlurhashOptionsSchema = z.object({
  width: z.number().optional(),
  height: z.number().optional(),
  componentX: z.number().optional(),
  componentY: z.number().optional(),
});

export type BlurhashOptions = z.infer<typeof BlurhashOptionsSchema>;

export const imageToBlurhash = async (
  data: Buffer,
  options: BlurhashOptions,
) => {
  const { width = 32, height = 32, componentX = 3, componentY = 3 } = options;

  const rawPixels = await sharp(data)
    .resize(width, height)
    .ensureAlpha(1)
    .raw()
    .toBuffer();

  const hash = encode(
    new Uint8ClampedArray(rawPixels),
    width,
    height,
    componentX,
    componentY,
  );

  // Decode the blurhash back to RGBA pixels and encode as a tiny PNG so
  // consumers can use it directly as a `blurDataURL` placeholder.
  const decodedPixels = decode(hash, width, height);
  const placeholderPng = await sharp(Buffer.from(decodedPixels.buffer), {
    raw: { channels: 4, width, height },
  })
    .png()
    .toBuffer();

  const dataUrl = `data:image/png;base64,${placeholderPng.toString('base64')}`;

  return {
    hash,
    dataUrl,
  };
};
