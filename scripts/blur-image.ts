import sharp, { type OverlayOptions, type Sharp } from 'sharp';
import { detectFaces } from '../src/detect/pipeline.ts';
import { regionFromDetection } from '../src/domain/regions.ts';
import type { Region } from '../src/domain/types.ts';
import { blurRadius, pixelBlockSize } from '../src/mask/geometry.ts';
import { createNodeRunner } from '../test/support/node-runner.ts';
import { createSharpRaster } from '../test/support/sharp-raster.ts';

const MODEL_PATH = new URL('../public/models/face_detection_yunet_2026may.onnx', import.meta.url).pathname;

interface Args {
  input: string;
  output: string;
  exclude: Set<number>;
  style: 'pixelate' | 'blur';
  strength: number;
}

function parseArgs(argv: string[]): Args {
  const [input, output, ...rest] = argv;
  if (!input || !output) {
    throw new Error('usage: node scripts/blur-image.ts <input> <output> [--exclude 1,2] [--style pixelate|blur] [--strength 0..1]');
  }
  const args: Args = { input, output, exclude: new Set(), style: 'pixelate', strength: 0.6 };
  for (let i = 0; i < rest.length; i += 2) {
    const value = rest[i + 1] ?? '';
    if (rest[i] === '--exclude') args.exclude = new Set(value.split(',').map(Number));
    if (rest[i] === '--style') args.style = value === 'blur' ? 'blur' : 'pixelate';
    if (rest[i] === '--strength') args.strength = Number(value);
  }
  return args;
}

function ellipseSvg(width: number, height: number): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><ellipse cx="${width / 2}" cy="${height / 2}" rx="${width / 2}" ry="${height / 2}" fill="#fff"/></svg>`,
  );
}

async function maskedTile(base: Buffer, region: Region, style: Args['style'], strength: number): Promise<OverlayOptions> {
  const left = Math.round(region.box.x);
  const top = Math.round(region.box.y);
  const width = Math.max(1, Math.round(region.box.w));
  const height = Math.max(1, Math.round(region.box.h));
  const source = sharp(base).extract({ left, top, width, height });
  let tile: Sharp;
  if (style === 'pixelate') {
    const block = pixelBlockSize(region.box, strength);
    const small = await source.resize(Math.max(1, Math.round(width / block)), Math.max(1, Math.round(height / block))).toBuffer();
    tile = sharp(small).resize(width, height, { kernel: 'nearest' });
  } else {
    tile = source.blur(blurRadius(region.box, strength));
  }
  const withAlpha = await tile.ensureAlpha().toBuffer();
  const composed =
    region.shape === 'ellipse'
      ? await sharp(withAlpha).composite([{ input: ellipseSvg(width, height), blend: 'dest-in' }]).png().toBuffer()
      : withAlpha;
  return { input: composed, left, top };
}

const args = parseArgs(process.argv.slice(2));
const raster = await createSharpRaster(args.input);
const runner = await createNodeRunner(MODEL_PATH);
const detections = await detectFaces(raster, runner);
const regions = detections.map((d) => regionFromDetection(d, raster.width, raster.height));
const active = regions.filter((region, index) => region.enabled && !args.exclude.has(index + 1));

const base = await sharp(args.input).rotate().toBuffer();
const overlays = await Promise.all(active.map((region) => maskedTile(base, region, args.style, args.strength)));
await sharp(base).composite(overlays).jpeg({ quality: 92 }).toFile(args.output);

console.log(
  JSON.stringify({
    total: regions.length,
    confirmed: regions.filter((r) => r.enabled).length,
    masked: active.length,
    excluded: [...args.exclude],
    regions: regions.map((r, i) => ({ n: i + 1, enabled: r.enabled, confidence: +(r.confidence ?? 0).toFixed(2) })),
  }),
);
