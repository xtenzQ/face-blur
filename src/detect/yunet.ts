import { YUNET_STRIDES, type Detection, type Point, type Rotation, type YuNetOutputs } from './types.ts';

const BBOX_FIELDS = 4;
const LANDMARK_COUNT = 5;
const KPS_FIELDS = LANDMARK_COUNT * 2;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export interface DecodeOptions {
  width: number;
  height: number;
  scoreThreshold: number;
  rotation: Rotation;
}

export function decodeYuNet(outputs: YuNetOutputs, options: DecodeOptions): Detection[] {
  const { width, height, scoreThreshold, rotation } = options;
  const detections: Detection[] = [];
  YUNET_STRIDES.forEach((stride, level) => {
    const cls = outputs.cls[level];
    const obj = outputs.obj[level];
    const bbox = outputs.bbox[level];
    const kps = outputs.kps[level];
    if (!cls || !obj || !bbox || !kps) {
      throw new Error(`Missing YuNet output for stride ${stride}`);
    }
    const cols = Math.floor(width / stride);
    const rows = Math.floor(height / stride);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const index = row * cols + col;
        const score = Math.sqrt(clamp01(cls[index] ?? 0) * clamp01(obj[index] ?? 0));
        if (score < scoreThreshold) {
          continue;
        }
        const base = index * BBOX_FIELDS;
        const centerX = (col + (bbox[base] ?? 0)) * stride;
        const centerY = (row + (bbox[base + 1] ?? 0)) * stride;
        const w = Math.exp(bbox[base + 2] ?? 0) * stride;
        const h = Math.exp(bbox[base + 3] ?? 0) * stride;
        const landmarks: Point[] = [];
        for (let n = 0; n < LANDMARK_COUNT; n++) {
          const kpsBase = index * KPS_FIELDS + 2 * n;
          landmarks.push({
            x: ((kps[kpsBase] ?? 0) + col) * stride,
            y: ((kps[kpsBase + 1] ?? 0) + row) * stride,
          });
        }
        detections.push({ x: centerX - w / 2, y: centerY - h / 2, w, h, score, rotation, landmarks });
      }
    }
  });
  return detections;
}
