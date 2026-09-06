import sharp from 'sharp';
import type { Box, Raster, RasterProvider, Rotation } from '../../src/detect/types.ts';

export async function createSharpRaster(path: string): Promise<RasterProvider> {
  const metadata = await sharp(path).metadata();
  const oriented = metadata.autoOrient;
  const width = oriented?.width ?? metadata.width ?? 0;
  const height = oriented?.height ?? metadata.height ?? 0;
  return {
    width,
    height,
    async read(crop: Box, scale: number, rotation: Rotation): Promise<Raster> {
      const targetWidth = Math.max(1, Math.round(crop.w * scale));
      const targetHeight = Math.max(1, Math.round(crop.h * scale));
      const { data, info } = await sharp(path)
        .rotate()
        .extract({ left: Math.round(crop.x), top: Math.round(crop.y), width: Math.round(crop.w), height: Math.round(crop.h) })
        .resize(targetWidth, targetHeight, { fit: 'fill' })
        .rotate(rotation)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      return { data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength), width: info.width, height: info.height };
    },
  };
}
