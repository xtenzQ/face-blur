import { describe, expect, it } from 'vitest';
import { nonMaximumSuppression } from './nms.ts';
import type { Detection, Rotation } from './types.ts';

function detection(x: number, y: number, w: number, h: number, score: number, rotation: Rotation = 0): Detection {
  return { x, y, w, h, score, rotation, landmarks: [] };
}

const THRESHOLDS = { iou: 0.4, containment: 0.5 };

describe('nonMaximumSuppression', () => {
  it('keeps the highest-scoring of two overlapping boxes', () => {
    // given
    const detections = [detection(0, 0, 100, 100, 0.7), detection(5, 5, 100, 100, 0.9)];

    // when
    const kept = nonMaximumSuppression(detections, THRESHOLDS);

    // then
    expect(kept).toHaveLength(1);
    expect(kept[0]?.score).toBe(0.9);
  });

  it('suppresses a large low-score box around a confirmed face', () => {
    // given
    const face = detection(40, 40, 50, 60, 0.9);
    const bodyBox = detection(0, 0, 300, 400, 0.5);

    // when
    const kept = nonMaximumSuppression([bodyBox, face], THRESHOLDS);

    // then
    expect(kept).toEqual([face]);
  });

  it('keeps two neighbouring faces that barely touch', () => {
    // given
    const detections = [detection(0, 0, 50, 50, 0.9), detection(45, 0, 50, 50, 0.8)];

    // when
    const kept = nonMaximumSuppression(detections, THRESHOLDS);

    // then
    expect(kept).toHaveLength(2);
  });

  it('prefers an upright detection over a rotated one with the same raw score', () => {
    // given
    const upright = detection(0, 0, 100, 100, 0.8, 0);
    const rotated = detection(2, 2, 100, 100, 0.8, 90);

    // when
    const kept = nonMaximumSuppression([rotated, upright], THRESHOLDS);

    // then
    expect(kept).toEqual([upright]);
  });
});
