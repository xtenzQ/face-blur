import type { Detection, Rotation } from './types.ts';

export const ROTATED_SCORE_FACTOR = 0.75;

export function confidence(detection: Detection): number {
  return detection.rotation === 0 ? detection.score : detection.score * ROTATED_SCORE_FACTOR;
}

export function rawThresholdFor(confidenceThreshold: number, rotation: Rotation): number {
  return rotation === 0 ? confidenceThreshold : confidenceThreshold / ROTATED_SCORE_FACTOR;
}
