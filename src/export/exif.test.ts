import piexif from 'piexifjs';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { binaryStringToBytes, bytesToBinaryString, hasEmbeddedThumbnail, insertExif, orientationOf, readExifDict, rebuildExif } from './exif.ts';

const ROTATED_ORIENTATION = 6;
const CAMERA_MAKE = 'TestCam';

async function tinyJpeg(width: number, color: { r: number; g: number; b: number }): Promise<Uint8Array> {
  return new Uint8Array(await sharp({ create: { width, height: width, channels: 3, background: color } }).jpeg().toBuffer());
}

async function cameraJpeg(): Promise<{ file: Uint8Array; originalThumbnail: Uint8Array }> {
  const body = await tinyJpeg(64, { r: 200, g: 40, b: 40 });
  const originalThumbnail = await tinyJpeg(16, { r: 0, g: 0, b: 255 });
  const exifBytes = piexif.dump({
    '0th': { [piexif.ImageIFD.Make]: CAMERA_MAKE, [piexif.ImageIFD.Orientation]: ROTATED_ORIENTATION },
    Exif: {},
    GPS: {},
    Interop: {},
    '1st': {},
    thumbnail: bytesToBinaryString(originalThumbnail),
  });
  return { file: insertExif(exifBytes, body), originalThumbnail };
}

describe('EXIF rebuild', () => {
  it('keeps camera tags, resets orientation and replaces the thumbnail with the masked one', async () => {
    // given
    const { file, originalThumbnail } = await cameraJpeg();
    const maskedThumbnail = await tinyJpeg(16, { r: 0, g: 255, b: 0 });
    const source = readExifDict(file);
    expect(source).not.toBeNull();
    expect(orientationOf(source as NonNullable<typeof source>)).toBe(ROTATED_ORIENTATION);
    expect(hasEmbeddedThumbnail(source as NonNullable<typeof source>)).toBe(true);

    // when
    const output = insertExif(rebuildExif(source as NonNullable<typeof source>, maskedThumbnail), await tinyJpeg(64, { r: 1, g: 2, b: 3 }));
    const result = readExifDict(output);

    // then
    expect(result?.['0th']?.[piexif.ImageIFD.Make]).toBe(CAMERA_MAKE);
    expect(orientationOf(result as NonNullable<typeof result>)).toBe(1);
    const thumbnail = binaryStringToBytes(result?.thumbnail ?? '');
    expect(thumbnail).toEqual(maskedThumbnail);
    expect(thumbnail).not.toEqual(originalThumbnail);
  });

  it('drops the thumbnail entirely when none is supplied', async () => {
    // given
    const { file } = await cameraJpeg();
    const source = readExifDict(file);

    // when
    const output = insertExif(rebuildExif(source as NonNullable<typeof source>, null), await tinyJpeg(64, { r: 1, g: 2, b: 3 }));

    // then
    expect(hasEmbeddedThumbnail(readExifDict(output) as NonNullable<typeof source>)).toBe(false);
  });

  it('returns null for a JPEG without EXIF', async () => {
    expect(readExifDict(await tinyJpeg(8, { r: 0, g: 0, b: 0 }))).toBeNull();
  });
});
