import { clampBox, toOriginalCoordinates, type PassTransform } from './geometry.ts';
import { nonMaximumSuppression, type MergeThresholds } from './nms.ts';
import { rawThresholdFor } from './scoring.ts';
import { rasterToInputTensor } from './tensor.ts';
import type { Box, Detection, ModelRunner, RasterProvider, Rotation } from './types.ts';
import { decodeYuNet } from './yunet.ts';

export interface DetectOptions {
  maxSide: number;
  tileThreshold: number;
  tileOverlap: number;
  rotations: Rotation[];
  candidateThreshold: number;
  minFaceSide: number;
  merge: MergeThresholds;
}

export const DEFAULT_DETECT_OPTIONS: DetectOptions = {
  maxSide: 1920,
  tileThreshold: 3000,
  tileOverlap: 0.15,
  rotations: [0, 90, 180, 270],
  candidateThreshold: 0.3,
  minFaceSide: 12,
  merge: { iou: 0.4, containment: 0.5 },
};

const TILE_GRID = 2;

interface Pass extends PassTransform {
  scoreThreshold: number;
}

function scaleToFit(box: Box, maxSide: number): number {
  return Math.min(1, maxSide / Math.max(box.w, box.h));
}

function tileBoxes(width: number, height: number, overlap: number): Box[] {
  const tiles: Box[] = [];
  const tileWidth = width / TILE_GRID;
  const tileHeight = height / TILE_GRID;
  const padX = tileWidth * overlap;
  const padY = tileHeight * overlap;
  for (let row = 0; row < TILE_GRID; row++) {
    for (let col = 0; col < TILE_GRID; col++) {
      const raw = { x: col * tileWidth - padX, y: row * tileHeight - padY, w: tileWidth + 2 * padX, h: tileHeight + 2 * padY };
      tiles.push(clampBox(raw, width, height));
    }
  }
  return tiles;
}

export function planPasses(width: number, height: number, options: DetectOptions): Pass[] {
  const full: Box = { x: 0, y: 0, w: width, h: height };
  const passes: Pass[] = options.rotations.map((rotation) => ({
    crop: full,
    scale: scaleToFit(full, options.maxSide),
    rotation,
    scoreThreshold: rawThresholdFor(options.candidateThreshold, rotation),
  }));
  if (Math.max(width, height) > options.tileThreshold) {
    for (const crop of tileBoxes(width, height, options.tileOverlap)) {
      passes.push({ crop, scale: scaleToFit(crop, options.maxSide), rotation: 0, scoreThreshold: options.candidateThreshold });
    }
  }
  return passes;
}

async function runPass(raster: RasterProvider, runner: ModelRunner, pass: Pass): Promise<Detection[]> {
  const image = await raster.read(pass.crop, pass.scale, pass.rotation);
  const tensor = rasterToInputTensor(image);
  const outputs = await runner.run(tensor.data, tensor.width, tensor.height);
  return decodeYuNet(outputs, {
    width: tensor.width,
    height: tensor.height,
    scoreThreshold: pass.scoreThreshold,
    rotation: pass.rotation,
  }).map((detection) => toOriginalCoordinates(detection, pass));
}

export async function detectFaces(
  raster: RasterProvider,
  runner: ModelRunner,
  options: DetectOptions = DEFAULT_DETECT_OPTIONS,
): Promise<Detection[]> {
  const passes = planPasses(raster.width, raster.height, options);
  const all: Detection[] = [];
  for (const pass of passes) {
    all.push(...(await runPass(raster, runner, pass)));
  }
  return nonMaximumSuppression(all, options.merge)
    .map((detection) => ({ ...detection, ...clampBox(detection, raster.width, raster.height) }))
    .filter((detection) => Math.min(detection.w, detection.h) >= options.minFaceSide);
}
