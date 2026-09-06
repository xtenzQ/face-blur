export type PhotoKind = 'jpeg' | 'png' | 'webp' | 'heic';

export interface LoadedImage {
  image: HTMLImageElement;
  width: number;
  height: number;
  kind: PhotoKind;
}

const MIME_KINDS: Record<string, PhotoKind> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heic',
};

const EXTENSION_KINDS: Record<string, PhotoKind> = {
  jpg: 'jpeg',
  jpeg: 'jpeg',
  png: 'png',
  webp: 'webp',
  heic: 'heic',
  heif: 'heic',
};

const HEIC_JPEG_QUALITY = 0.95;

export function kindOf(file: File): PhotoKind | null {
  const byMime = MIME_KINDS[file.type.toLowerCase()];
  if (byMime) {
    return byMime;
  }
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_KINDS[extension] ?? null;
}

async function decodeWithImageElement(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
  return image;
}

async function convertHeic(file: File): Promise<Blob> {
  const { heicTo } = await import('heic-to/csp');
  return heicTo({ blob: file, type: 'image/jpeg', quality: HEIC_JPEG_QUALITY });
}

async function decodeHeic(file: File): Promise<HTMLImageElement> {
  try {
    return await decodeWithImageElement(file);
  } catch {
    return decodeWithImageElement(await convertHeic(file));
  }
}

export async function loadImage(file: File): Promise<LoadedImage> {
  const kind = kindOf(file);
  if (!kind) {
    throw new Error(`Unsupported file type: ${file.name}`);
  }
  const image = kind === 'heic' ? await decodeHeic(file) : await decodeWithImageElement(file);
  return { image, width: image.naturalWidth, height: image.naturalHeight, kind };
}

export function releaseImage(image: HTMLImageElement): void {
  URL.revokeObjectURL(image.src);
  image.src = '';
}
