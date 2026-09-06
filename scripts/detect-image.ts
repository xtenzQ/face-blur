import sharp from 'sharp';
import { detectFaces } from '../src/detect/pipeline.ts';
import { confidence } from '../src/detect/scoring.ts';
import { createNodeRunner } from '../test/support/node-runner.ts';
import { createSharpRaster } from '../test/support/sharp-raster.ts';

const MODEL_PATH = new URL('../public/models/face_detection_yunet_2026may.onnx', import.meta.url).pathname;
const CONFIRMED_THRESHOLD = 0.6;
const PREVIEW_SIDE = 2000;

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  throw new Error('usage: node scripts/detect-image.ts <input> <annotated-output>');
}

const raster = await createSharpRaster(inputPath);
const runner = await createNodeRunner(MODEL_PATH);
const started = performance.now();
const detections = await detectFaces(raster, runner);
const elapsed = Math.round(performance.now() - started);

const scale = Math.min(1, PREVIEW_SIDE / Math.max(raster.width, raster.height));
const boxes = detections
  .map((d, i) => {
    const confirmed = confidence(d) >= CONFIRMED_THRESHOLD;
    const color = confirmed ? '#22c55e' : '#f59e0b';
    const x = d.x * scale;
    const y = d.y * scale;
    const w = d.w * scale;
    const h = d.h * scale;
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${color}" stroke-width="4" ${confirmed ? '' : 'stroke-dasharray="12 8"'}/>
<rect x="${x}" y="${y - 44}" width="${Math.max(60, 32 * String(i + 1).length + 20)}" height="44" fill="${color}"/>
<text x="${x + 10}" y="${y - 10}" font-family="Helvetica, Arial" font-size="36" font-weight="bold" fill="#000">${i + 1}</text>`;
  })
  .join('\n');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(raster.width * scale)}" height="${Math.round(raster.height * scale)}">${boxes}</svg>`;

await sharp(inputPath)
  .rotate()
  .resize(Math.round(raster.width * scale), Math.round(raster.height * scale))
  .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
  .jpeg({ quality: 90 })
  .toFile(outputPath);

console.log(JSON.stringify({ width: raster.width, height: raster.height, elapsedMs: elapsed, faces: detections.map((d, i) => ({ n: i + 1, score: +confidence(d).toFixed(2), x: Math.round(d.x), y: Math.round(d.y), w: Math.round(d.w), h: Math.round(d.h) })) }, null, 1));
