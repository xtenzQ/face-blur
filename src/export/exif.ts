import piexif from 'piexifjs';

export type ExifDict = ReturnType<typeof piexif.load>;

const CHUNK_SIZE = 0x8000;
const UPRIGHT_ORIENTATION = 1;
const JPEG_COMPRESSION = 6;
const INCHES = 2;
const DEFAULT_RESOLUTION: [number, number] = [72, 1];
const DEFAULT_FIRST_IFD: Record<number, unknown> = {
  [piexif.ImageIFD.Compression]: JPEG_COMPRESSION,
  [piexif.ImageIFD.XResolution]: DEFAULT_RESOLUTION,
  [piexif.ImageIFD.YResolution]: DEFAULT_RESOLUTION,
  [piexif.ImageIFD.ResolutionUnit]: INCHES,
};

export function bytesToBinaryString(bytes: Uint8Array): string {
  const parts: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
    parts.push(String.fromCharCode(...bytes.subarray(offset, offset + CHUNK_SIZE)));
  }
  return parts.join('');
}

export function binaryStringToBytes(binary: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function hasEntries(section: object | undefined): boolean {
  return section !== undefined && Object.keys(section).length > 0;
}

export function readExifDict(jpeg: Uint8Array): ExifDict | null {
  try {
    const dict = piexif.load(bytesToBinaryString(jpeg));
    return hasEntries(dict['0th']) || hasEntries(dict.Exif) || hasEntries(dict.GPS) ? dict : null;
  } catch {
    return null;
  }
}

export function hasEmbeddedThumbnail(dict: ExifDict): boolean {
  return typeof dict.thumbnail === 'string' && dict.thumbnail.length > 0;
}

export function orientationOf(dict: ExifDict): number | undefined {
  const value = dict['0th']?.[piexif.ImageIFD.Orientation];
  return typeof value === 'number' ? value : undefined;
}

export function rebuildExif(source: ExifDict, thumbnail: Uint8Array | null): string {
  const zeroth = { ...source['0th'], [piexif.ImageIFD.Orientation]: UPRIGHT_ORIENTATION };
  const first = hasEntries(source['1st']) ? { ...source['1st'] } : { ...DEFAULT_FIRST_IFD };
  delete first[piexif.ImageIFD.JPEGInterchangeFormat];
  delete first[piexif.ImageIFD.JPEGInterchangeFormatLength];
  const rebuilt: ExifDict = {
    '0th': zeroth,
    Exif: { ...source.Exif },
    GPS: { ...source.GPS },
    Interop: { ...source.Interop },
    '1st': thumbnail ? first : {},
    ...(thumbnail ? { thumbnail: bytesToBinaryString(thumbnail) } : {}),
  };
  return piexif.dump(rebuilt);
}

export function insertExif(exifBytes: string, jpeg: Uint8Array): Uint8Array<ArrayBuffer> {
  return binaryStringToBytes(piexif.insert(exifBytes, bytesToBinaryString(jpeg)));
}
