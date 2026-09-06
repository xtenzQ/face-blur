import type { Raster } from './types.ts';

export const INPUT_DIVISOR = 32;
const CHANNELS = 3;
const RGBA_STRIDE = 4;

export interface InputTensor {
  data: Float32Array;
  width: number;
  height: number;
}

export function padToDivisor(size: number, divisor: number = INPUT_DIVISOR): number {
  return Math.ceil(size / divisor) * divisor;
}

export function rasterToInputTensor(raster: Raster): InputTensor {
  const width = padToDivisor(raster.width);
  const height = padToDivisor(raster.height);
  const plane = width * height;
  const data = new Float32Array(CHANNELS * plane);
  const { data: rgba, width: srcWidth, height: srcHeight } = raster;
  for (let y = 0; y < srcHeight; y++) {
    for (let x = 0; x < srcWidth; x++) {
      const src = (y * srcWidth + x) * RGBA_STRIDE;
      const dst = y * width + x;
      data[dst] = rgba[src + 2] ?? 0;
      data[plane + dst] = rgba[src + 1] ?? 0;
      data[2 * plane + dst] = rgba[src] ?? 0;
    }
  }
  return { data, width, height };
}
