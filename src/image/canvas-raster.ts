import type { Box, Raster, RasterProvider, Rotation } from '../detect/types.ts';
import { rotatedSize } from '../detect/geometry.ts';

export type ImageSource = HTMLImageElement | ImageBitmap | HTMLCanvasElement | OffscreenCanvas;

export function createCanvas(width: number, height: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export type Context2D = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

export function get2dContext(canvas: OffscreenCanvas | HTMLCanvasElement, willReadFrequently = false): Context2D {
  const context = canvas.getContext('2d', { willReadFrequently }) as Context2D | null;
  if (!context) {
    throw new Error('Canvas 2D context is not available');
  }
  return context;
}

export function createCanvasRaster(image: ImageSource, width: number, height: number): RasterProvider {
  return {
    width,
    height,
    async read(crop: Box, scale: number, rotation: Rotation): Promise<Raster> {
      const uprightWidth = Math.max(1, Math.round(crop.w * scale));
      const uprightHeight = Math.max(1, Math.round(crop.h * scale));
      const size = rotatedSize(uprightWidth, uprightHeight, rotation);
      const canvas = createCanvas(size.width, size.height);
      const context = get2dContext(canvas, true);
      context.translate(size.width / 2, size.height / 2);
      context.rotate((rotation * Math.PI) / 180);
      context.drawImage(image, crop.x, crop.y, crop.w, crop.h, -uprightWidth / 2, -uprightHeight / 2, uprightWidth, uprightHeight);
      const pixels = context.getImageData(0, 0, size.width, size.height);
      return { data: pixels.data, width: size.width, height: size.height };
    },
  };
}
