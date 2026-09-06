import { createCanvas, get2dContext, type ImageSource } from './canvas-raster.ts';

const GALLERY_THUMBNAIL_SIDE = 200;
const THUMBNAIL_QUALITY = 0.75;

export async function canvasToBlob(canvas: OffscreenCanvas | HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  if (canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type, quality });
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Canvas encoding failed'))), type, quality);
  });
}

export function scaledCanvas(source: ImageSource, width: number, height: number, maxSide: number): OffscreenCanvas | HTMLCanvasElement {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const canvas = createCanvas(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
  const context = get2dContext(canvas);
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function galleryThumbnail(source: ImageSource, width: number, height: number): Promise<string> {
  const blob = await canvasToBlob(scaledCanvas(source, width, height, GALLERY_THUMBNAIL_SIDE), 'image/jpeg', THUMBNAIL_QUALITY);
  return URL.createObjectURL(blob);
}
