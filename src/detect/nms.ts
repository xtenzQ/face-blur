import { intersectionOverUnion, intersectionOverSmaller } from './geometry.ts';
import { confidence } from './scoring.ts';
import type { Detection } from './types.ts';

export interface MergeThresholds {
  iou: number;
  containment: number;
}

export function nonMaximumSuppression(detections: Detection[], thresholds: MergeThresholds): Detection[] {
  const sorted = [...detections].sort((a, b) => confidence(b) - confidence(a));
  const kept: Detection[] = [];
  for (const candidate of sorted) {
    const isRedundant = kept.some(
      (keptDetection) =>
        intersectionOverUnion(keptDetection, candidate) > thresholds.iou ||
        intersectionOverSmaller(keptDetection, candidate) > thresholds.containment,
    );
    if (!isRedundant) {
      kept.push(candidate);
    }
  }
  return kept;
}
