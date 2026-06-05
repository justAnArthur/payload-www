import { z } from 'zod';
import sharp from 'sharp';
import { rgbaToThumbHash, thumbHashToDataURL } from 'thumbhash';

export const ThumbhashOptionsSchema = z.object({});

export type ThumbhashOptions = z.infer<typeof ThumbhashOptionsSchema>;

export const imageToThumbhash = async (
  data: Buffer,
  _options: ThumbhashOptions,
) => {
  const image = sharp(data);

  const metadata = await image.metadata();
  if (metadata.width == null || metadata.height == null) {
    throw new Error('Encountered an image without a width/height');
  }

  const scale = 100 / Math.max(metadata.width, metadata.height);
  const newWidth = Math.round(metadata.width * scale);
  const newHeight = Math.round(metadata.height * scale);

  const rawPixels = await image
    .resize(newWidth, newHeight)
    .ensureAlpha(1)
    .raw()
    .toBuffer();

  const binaryThumbhash = rgbaToThumbHash(newWidth, newHeight, rawPixels);

  const thumbHashToBase64 = Buffer.from(binaryThumbhash).toString('base64');

  const placeholderURL = thumbHashToDataURL(binaryThumbhash);

  return ({
    hash: thumbHashToBase64,
    dataUrl: placeholderURL
  })
};
