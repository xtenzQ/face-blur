import { createCanvas, get2dContext } from '../image/canvas-raster.ts';
import { canvasToBlob, scaledCanvas } from '../image/thumbnail.ts';
import { drawMaskedImage, IDENTITY_TRANSFORM } from '../mask/render.ts';
import { insertExif, readExifDict, rebuildExif } from './exif.ts';
import type { PhotoEntry, Settings } from '../ui/store.ts';
import { zipFiles } from './zip.ts';

const JPEG_QUALITY = 0.92;
const PNG_QUALITY = 1;
const EXIF_THUMBNAIL_SIDE = 160;
const EXIF_THUMBNAIL_QUALITY = 0.7;
const OUTPUT_SUFFIX = '-blurred';

export type MetadataOutcome = 'kept' | 'stripped' | 'unavailable';

export interface ExportResult {
  blob: Blob;
  filename: string;
  metadata: MetadataOutcome;
}

function outputFormat(photo: PhotoEntry): { mime: string; extension: string; quality: number } {
  return photo.kind === 'png'
    ? { mime: 'image/png', extension: 'png', quality: PNG_QUALITY }
    : { mime: 'image/jpeg', extension: 'jpg', quality: JPEG_QUALITY };
}

function outputName(photo: PhotoEntry, extension: string): string {
  const base = photo.name.replace(/\.[^.]+$/, '');
  return `${base}${OUTPUT_SUFFIX}.${extension}`;
}

async function withMetadata(photo: PhotoEntry, masked: OffscreenCanvas | HTMLCanvasElement, jpeg: Blob): Promise<{ blob: Blob; metadata: MetadataOutcome }> {
  const dict = readExifDict(new Uint8Array(await photo.file.arrayBuffer()));
  if (!dict) {
    return { blob: jpeg, metadata: 'unavailable' };
  }
  const thumbnailBlob = await canvasToBlob(scaledCanvas(masked, masked.width, masked.height, EXIF_THUMBNAIL_SIDE), 'image/jpeg', EXIF_THUMBNAIL_QUALITY);
  const thumbnail = new Uint8Array(await thumbnailBlob.arrayBuffer());
  const exifBytes = rebuildExif(dict, thumbnail);
  const output = insertExif(exifBytes, new Uint8Array(await jpeg.arrayBuffer()));
  return { blob: new Blob([output], { type: 'image/jpeg' }), metadata: 'kept' };
}

export async function exportPhoto(photo: PhotoEntry, settings: Settings): Promise<ExportResult> {
  const canvas = createCanvas(photo.width, photo.height);
  drawMaskedImage(get2dContext(canvas), {
    source: photo.image,
    width: photo.width,
    height: photo.height,
    regions: photo.regions,
    settings: settings.mask,
    view: IDENTITY_TRANSFORM,
  });
  const format = outputFormat(photo);
  const encoded = await canvasToBlob(canvas, format.mime, format.quality);
  const filename = outputName(photo, format.extension);
  if (settings.stripMetadata) {
    return { blob: encoded, filename, metadata: 'stripped' };
  }
  if (photo.kind !== 'jpeg' || format.mime !== 'image/jpeg') {
    return { blob: encoded, filename, metadata: 'unavailable' };
  }
  const { blob, metadata } = await withMetadata(photo, canvas, encoded);
  return { blob, filename, metadata };
}

export async function exportBatch(photos: PhotoEntry[], settings: Settings): Promise<Blob> {
  const files = new Map<string, Uint8Array>();
  for (const photo of photos) {
    const result = await exportPhoto(photo, settings);
    files.set(uniqueName(files, result.filename), new Uint8Array(await result.blob.arrayBuffer()));
  }
  return new Blob([zipFiles(files)], { type: 'application/zip' });
}

function uniqueName(existing: Map<string, Uint8Array>, name: string): string {
  if (!existing.has(name)) {
    return name;
  }
  const dot = name.lastIndexOf('.');
  const base = name.slice(0, dot);
  const extension = name.slice(dot);
  for (let counter = 2; ; counter++) {
    const candidate = `${base}-${counter}${extension}`;
    if (!existing.has(candidate)) {
      return candidate;
    }
  }
}
