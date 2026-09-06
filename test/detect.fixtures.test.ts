import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { intersectionOverUnion } from '../src/detect/geometry.ts';
import { detectFaces } from '../src/detect/pipeline.ts';
import { confidence } from '../src/detect/scoring.ts';
import type { Box, ModelRunner } from '../src/detect/types.ts';
import { CONFIRMED_THRESHOLD } from '../src/domain/regions.ts';
import { createNodeRunner } from './support/node-runner.ts';
import { createSharpRaster } from './support/sharp-raster.ts';

interface Expectation {
  file: string;
  faces: number;
  notes: string;
  knownHard?: boolean;
  faceBox?: Box;
}

const FIXTURES_DIR = new URL('./fixtures/', import.meta.url);
const MODEL_PATH = new URL('../public/models/face_detection_yunet_2026may.onnx', import.meta.url).pathname;
const MINIMUM_ONLY = new Set(['crowd-many-faces.jpg']);
const ALLOWED_FALSE_POSITIVES = 2;
const MIN_OVERLAP_WITH_FACE = 0.3;

const expectations: Expectation[] = JSON.parse(readFileSync(new URL('expected.json', FIXTURES_DIR), 'utf8'));

describe('YuNet pipeline on CC0 fixtures', () => {
  let runner: ModelRunner;

  beforeAll(async () => {
    runner = await createNodeRunner(MODEL_PATH);
  });

  it.each(expectations)('finds the expected faces in $file', async ({ file, faces, knownHard, faceBox }) => {
    // given
    const raster = await createSharpRaster(new URL(file, FIXTURES_DIR).pathname);

    // when
    const detections = await detectFaces(raster, runner);
    const confirmed = detections.filter((detection) => confidence(detection) >= CONFIRMED_THRESHOLD);

    // then
    if (knownHard && faceBox) {
      const overlapping = detections.filter((detection) => intersectionOverUnion(detection, faceBox) >= MIN_OVERLAP_WITH_FACE);
      expect(overlapping.length).toBeGreaterThanOrEqual(1);
      return;
    }
    expect(confirmed.length).toBeGreaterThanOrEqual(faces);
    if (!MINIMUM_ONLY.has(file)) {
      expect(confirmed.length).toBeLessThanOrEqual(faces + ALLOWED_FALSE_POSITIVES);
    }
  });
});
