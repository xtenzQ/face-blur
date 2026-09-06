import { clampBox } from '../detect/geometry.ts';
import { confidence } from '../detect/scoring.ts';
import type { Box, Detection } from '../detect/types.ts';
import type { Region, RegionShape } from './types.ts';

export const DETECTION_PADDING = 0.25;
export const CONFIRMED_THRESHOLD = 0.6;

export function expandBox(box: Box, padding: number): Box {
  const padX = box.w * padding;
  const padY = box.h * padding;
  return { x: box.x - padX, y: box.y - padY, w: box.w + 2 * padX, h: box.h + 2 * padY };
}

export const DEFAULT_MANUAL_REGION_RATIO = 0.2;

export function regionFromDetection(detection: Detection, imageWidth: number, imageHeight: number): Region {
  const isConfirmed = confidence(detection) >= CONFIRMED_THRESHOLD;
  return {
    id: crypto.randomUUID(),
    source: 'detected',
    shape: 'ellipse',
    box: clampBox(expandBox(detection, DETECTION_PADDING), imageWidth, imageHeight),
    enabled: isConfirmed,
    isSuggestion: !isConfirmed,
    confidence: confidence(detection),
  };
}

export function manualRegion(box: Box, shape: RegionShape = 'rect'): Region {
  return { id: crypto.randomUUID(), source: 'manual', shape, box, enabled: true, isSuggestion: false, confidence: null };
}

export function centeredManualBox(imageWidth: number, imageHeight: number): Box {
  const side = Math.min(imageWidth, imageHeight) * DEFAULT_MANUAL_REGION_RATIO;
  return { x: (imageWidth - side) / 2, y: (imageHeight - side) / 2, w: side, h: side };
}

export function isVisibleRegion(region: Region, showSuggestions: boolean): boolean {
  return showSuggestions || !region.isSuggestion;
}

export function toggledRegion(region: Region): Region {
  return { ...region, enabled: !region.enabled, isSuggestion: false };
}
