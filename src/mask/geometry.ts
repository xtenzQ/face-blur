import type { Box } from '../detect/types.ts';

const MIN_BLOCKS_ACROSS = 4;
const MAX_BLOCKS_ACROSS = 16;
const MIN_BLOCK_SIZE = 2;
const MIN_BLUR_RATIO = 0.012;
const MAX_BLUR_RATIO = 0.22;
const BLUR_STRENGTH_CURVE = 1.8;
const MAX_FEATHER_RATIO = 0.15;
const MAX_CORNER_RATIO = 0.5;

export const WEAK_STRENGTH = 0.4;

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * Math.min(1, Math.max(0, t));
}

function shorterSide(box: Box): number {
  return Math.min(box.w, box.h);
}

export function pixelBlockSize(box: Box, strength: number): number {
  const blocksAcross = Math.round(lerp(MAX_BLOCKS_ACROSS, MIN_BLOCKS_ACROSS, strength));
  return Math.max(MIN_BLOCK_SIZE, shorterSide(box) / blocksAcross);
}

export function blurRadius(box: Box, strength: number): number {
  const eased = Math.pow(Math.min(1, Math.max(0, strength)), BLUR_STRENGTH_CURVE);
  return Math.max(1, lerp(MIN_BLUR_RATIO, MAX_BLUR_RATIO, eased) * shorterSide(box));
}

export function featherRadius(box: Box, feather: number): number {
  return lerp(0, MAX_FEATHER_RATIO, feather) * shorterSide(box);
}

export function cornerRadius(box: Box, corner: number): number {
  return lerp(0, MAX_CORNER_RATIO, corner) * shorterSide(box);
}

export function expandBox(box: Box, margin: number): Box {
  return { x: box.x - margin, y: box.y - margin, w: box.w + 2 * margin, h: box.h + 2 * margin };
}
