import { describe, expect, it } from 'vitest';
import { padToDivisor, rasterToInputTensor } from './tensor.ts';

describe('rasterToInputTensor', () => {
  it('pads to a multiple of 32 and writes BGR planes', () => {
    // given
    const raster = { width: 2, height: 1, data: new Uint8ClampedArray([10, 20, 30, 255, 40, 50, 60, 255]) };

    // when
    const tensor = rasterToInputTensor(raster);

    // then
    expect(tensor.width).toBe(32);
    expect(tensor.height).toBe(32);
    const plane = 32 * 32;
    expect(tensor.data[0]).toBe(30);
    expect(tensor.data[1]).toBe(60);
    expect(tensor.data[plane]).toBe(20);
    expect(tensor.data[2 * plane]).toBe(10);
    expect(tensor.data[2]).toBe(0);
  });

  it('keeps sizes that are already multiples of 32', () => {
    expect(padToDivisor(64)).toBe(64);
    expect(padToDivisor(65)).toBe(96);
  });
});
